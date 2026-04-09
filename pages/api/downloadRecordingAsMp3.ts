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

/**
 * POST multipart form field `file` (WebM/other) → response body is MP3 bytes (download).
 * Requires ffmpeg with libmp3lame (same as convertWebmToWav).
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const inputPath = path.join(tempDir, `rec-in-${id}.webm`);
  const outputPath = path.join(tempDir, `rec-out-${id}.mp3`);

  await new Promise<void>((resolve) => {
    const form = new IncomingForm({
      uploadDir: tempDir,
      keepExtensions: true,
    });

    form.parse(req, (err, _fields, files) => {
      if (err || !files.file) {
        res.status(400).json({ error: 'File upload failed' });
        return resolve();
      }

      const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
      try {
        fs.renameSync(uploadedFile.filepath, inputPath);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Could not stage upload' });
        return resolve();
      }

      const command = `ffmpeg -y -i "${inputPath}" -acodec libmp3lame -q:a 4 "${outputPath}"`;

      exec(command, (error) => {
        try {
          fs.unlinkSync(inputPath);
        } catch {
          /* ignore */
        }
        if (error) {
          console.error('FFmpeg MP3 error:', error);
          res.status(500).json({ error: 'MP3 conversion failed (ffmpeg / libmp3lame)' });
          return resolve();
        }
        try {
          const buf = fs.readFileSync(outputPath);
          fs.unlinkSync(outputPath);
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Disposition', 'attachment; filename="pitch-recording.mp3"');
          res.status(200).send(buf);
        } catch (readErr) {
          console.error(readErr);
          res.status(500).json({ error: 'Could not read converted file' });
        }
        resolve();
      });
    });
  });
};

export default handler;
