import { IncomingForm } from 'formidable';
import fs from 'fs';
import {
  AudioConfig,
  AudioInputStream,
  CancellationReason,
  PronunciationAssessmentConfig,
  PronunciationAssessmentGradingSystem,
  PronunciationAssessmentGranularity,
  PropertyId,
  ResultReason,
  SpeechConfig,
  SpeechRecognizer
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

  const file = req.query.file;
  if (typeof file !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid file parameter' });
  }

  const audioPath = path.join(process.cwd(), 'temp', file);

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
      'u7jQam2thfkuiTpX65Dn8dyIVLRnN9LPKVLEXvaOuuKFovLUitEAJQQJ99BEACqBBLyXJ3w3AAAYACOGwpbk',
      'southeastasia'
    );
    speechConfig.speechRecognitionLanguage = 'en-US';

    const assessmentConfig = new PronunciationAssessmentConfig(
      '',
      PronunciationAssessmentGradingSystem.HundredMark,
      PronunciationAssessmentGranularity.Phoneme,
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

    await new Promise<void>((resolve) => {
      let responded = false;

      recognizer.recognized = (s, e) => {
        if (e.result.reason === ResultReason.RecognizedSpeech && e.result.text) {
          const jsonResult = JSON.parse(
            e.result.properties.getProperty(
              PropertyId.SpeechServiceResponse_JsonResult
            )
          );
          console.log(jsonResult.NBest[0].Words[0]);
        }
      };

      recognizer.sessionStopped = async () => {
        recognizer.stopContinuousRecognitionAsync(() => {
          if (responded) return;
          responded = true;
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

      recognizer.canceled = async (s, e) => {
        recognizer.stopContinuousRecognitionAsync(() => {
          if (responded) return;
          if (e.reason === CancellationReason.Error) {
            responded = true;
            recognizer.close();
            resolve(res.status(500).json({
              error: CancellationReason[e.reason] + ': ' + e.errorDetails
            }));
          }
        });
      };

      recognizer.startContinuousRecognitionAsync();
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Processing failed', details: err.message });
  } finally {
    fs.unlink(audioPath, () => {});
  }
};