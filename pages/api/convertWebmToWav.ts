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
  const form = new IncomingForm({
    uploadDir: path.join(process.cwd(), 'temp'),
    keepExtensions: true,
  });
  
  form.parse(req, (err, fields, files) => {
    if (err || !files.file) {
      return res.status(400).json({ error: 'File upload failed' });
    }

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    const originalPath = uploadedFile.filepath;

    // 👇 Choose your own input/output names
    const inputFilename = 'audio.webm';
    const outputFilename = 'output.wav';

    const tempDir = path.join(process.cwd(), 'temp');
    const inputPath = path.join(tempDir, inputFilename);
    const outputPath = path.join(tempDir, outputFilename);

    // 👇 Rename the uploaded file to our desired input name
    fs.renameSync(originalPath, inputPath);

    const command = `ffmpeg -i "${inputPath}" -acodec pcm_s16le -ar 44100 -ac 2 "${outputPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('FFmpeg error:', error);
        return res.status(500).json({ error: 'FFmpeg conversion failed' });
      }

      const outputFile = path.basename(outputPath);

      // Optional: move the file to public for access, or send back directly
      // fs.renameSync(outputPath, path.join(process.cwd(), 'public', outputFile));

      return res.status(200).json({ message: 'Conversion complete', outputFile });
    });
  });
};

export default handler;
