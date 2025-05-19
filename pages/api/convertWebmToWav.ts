import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';


// Disable default body parser for FormData
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
  const inputFilename = 'audio.webm';
  const outputFilename = 'output.wav';
  const inputPath = path.join(tempDir, inputFilename);
  const outputPath = path.join(tempDir, outputFilename);

  await new Promise<void>((resolve) => {
    const form = new IncomingForm({
      uploadDir: tempDir,
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err || !files.file) {
        res.status(400).json({ error: 'File upload failed' });
        return resolve();
      }

      const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
      const originalPath = uploadedFile.filepath;

      fs.renameSync(originalPath, inputPath);

      const command = `ffmpeg -y -i "${inputPath}" -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}"`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('FFmpeg error:', error);
          res.status(500).json({ error: 'FFmpeg conversion failed' });
          return resolve();
        }

        const outputFile = path.basename(outputPath);
        res.status(200).json({ message: 'Conversion complete', outputFile });
        resolve();
      });
    });
  });
};

export default handler;
