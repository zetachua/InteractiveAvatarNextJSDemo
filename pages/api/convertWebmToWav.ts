import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tempDir = path.join(process.cwd(), 'temp');
  try {
    fs.mkdirSync(tempDir, { recursive: true });
  } catch (e) {
    console.error('convertWebmToWav: could not create temp dir', e);
    return res.status(500).json({ error: 'Server temp directory unavailable' });
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const inputPath = path.join(tempDir, `pitch-${id}.webm`);
  const outputPath = path.join(tempDir, `pitch-${id}.wav`);
  const outputBasename = path.basename(outputPath);

  const form = new IncomingForm({
    uploadDir: tempDir,
    keepExtensions: true,
    maxFileSize: 100 * 1024 * 1024,
    allowEmptyFiles: true,
    createDirsFromUploads: true,
  });

  try {
    const [, files] = await form.parse(req);
    const fileField = files.file;
    if (!fileField) {
      const keys = Object.keys(files || {});
      console.error('convertWebmToWav: missing multipart file field "file"', { keys });
      return res.status(400).json({
        error: 'File upload failed',
        detail: keys.length ? `Unexpected file field names: ${keys.join(', ')}` : 'No file part in request',
      });
    }

    const uploadedFile = Array.isArray(fileField) ? fileField[0] : fileField;
    const originalPath = uploadedFile.filepath;

    try {
      fs.renameSync(originalPath, inputPath);
    } catch (renameErr) {
      console.error('convertWebmToWav: rename failed', renameErr);
      return res.status(500).json({ error: 'Could not stage uploaded audio' });
    }

    const command = `ffmpeg -y -i "${inputPath}" -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}"`;

    try {
      await new Promise<void>((resolve, reject) => {
        exec(command, (error, _stdout, stderr) => {
          if (error) {
            console.error('FFmpeg error:', error, stderr);
            reject(error);
            return;
          }
          resolve();
        });
      });
    } catch {
      try {
        fs.unlinkSync(inputPath);
      } catch {
        /* ignore */
      }
      if (!res.headersSent) {
        return res.status(500).json({ error: 'FFmpeg conversion failed' });
      }
      return;
    }

    try {
      fs.unlinkSync(inputPath);
    } catch {
      /* ignore */
    }

    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ error: 'FFmpeg did not produce output' });
    }

    return res.status(200).json({ message: 'Conversion complete', outputFile: outputBasename });
  } catch (err) {
    console.error('convertWebmToWav:', err);
    const message = err instanceof Error ? err.message : 'Conversion failed';
    if (!res.headersSent) {
      if (message.includes('maxFileSize') || message.includes('maxFields')) {
        return res.status(413).json({ error: 'Upload too large' });
      }
      return res.status(500).json({ error: 'File upload failed', detail: message });
    }
  }
};

export default handler;
