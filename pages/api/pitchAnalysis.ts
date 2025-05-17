import { IncomingForm } from 'formidable';
import fs from 'fs';
import {
  AudioConfig,
  AudioInputStream,
  PronunciationAssessmentConfig,
  PronunciationAssessmentGradingSystem,
  PronunciationAssessmentGranularity,
  ResultReason,
  SpeechConfig,
  SpeechRecognizer,
  PronunciationAssessmentResult
} from 'microsoft-cognitiveservices-speech-sdk';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({
    uploadDir: path.join(process.cwd(), 'temp'),
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'File upload error' });

    const audioPath = files.audio?.[0]?.filepath;
    if (!audioPath) return res.status(400).json({ error: 'No audio file uploaded' });

    try {
      const audioBuffer = await fs.promises.readFile(audioPath);
      const pushStream = AudioInputStream.createPushStream();
      pushStream.write(audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.byteLength
      ) as ArrayBuffer);
      pushStream.close();

      const audioConfig = AudioConfig.fromStreamInput(pushStream);

      const speechConfig = SpeechConfig.fromSubscription(

      );
      speechConfig.speechRecognitionLanguage = 'en-US';

      const assessmentConfig = new PronunciationAssessmentConfig(
        '',
        PronunciationAssessmentGradingSystem.HundredMark,
        PronunciationAssessmentGranularity.FullText,
        true
      );
      assessmentConfig.enableProsodyAssessment = true;

      const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
      assessmentConfig.applyTo(recognizer);

      const scores: { pronunciation: number[]; fluency: number[]; completeness: number[] } = {
        pronunciation: [],
        fluency: [],
        completeness: [],
      };

      return new Promise((resolve) => {
        recognizer.recognized = (s, e) => {
          if (e.result.reason === ResultReason.RecognizedSpeech && e.result.text) {
            const score = PronunciationAssessmentResult.fromResult(e.result);
            if (score) {
              scores.pronunciation.push(score.pronunciationScore);
              scores.fluency.push(score.fluencyScore);
              scores.completeness.push(score.completenessScore);
            }
          }
        };

        recognizer.sessionStopped = async () => {
          recognizer.stopContinuousRecognitionAsync(() => {
            recognizer.close();
            const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
            resolve(
              res.status(200).json({
                pronunciationScore: +avg(scores.pronunciation).toFixed(1),
                fluencyScore: +avg(scores.fluency).toFixed(1),
                completenessScore: +avg(scores.completeness).toFixed(1),
              })
            );
          });
        };

        recognizer.canceled = async (_sender, event) => {
          recognizer.stopContinuousRecognitionAsync(() => {
            recognizer.close();
            resolve(res.status(500).json({ error: 'Recognition was canceled', reason: event.errorDetails }));
          });
        };

        recognizer.startContinuousRecognitionAsync();
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Processing failed', details: err.message });
    } finally {
      fs.unlink(audioPath, () => {});
    }
  });
};