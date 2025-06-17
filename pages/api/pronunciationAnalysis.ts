import dotenv from 'dotenv';
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
import { PronunciationWord } from '../../components/KnowledgeClasses';

dotenv.config();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file, script } = req.body;
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
      process.env.AZURE_SPEECH_KEY!,
      process.env.AZURE_REGION!
    );
    speechConfig.speechRecognitionLanguage = 'en-US';

    const assessmentConfig = new PronunciationAssessmentConfig(
      script,
      PronunciationAssessmentGradingSystem.HundredMark,
      PronunciationAssessmentGranularity.Phoneme,
      true
    );
    assessmentConfig.enableProsodyAssessment = true;
    assessmentConfig.phonemeAlphabet = 'IPA'

    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    assessmentConfig.applyTo(recognizer);

    let totalScore = 0;
    let totalWords = 0;
    const words: PronunciationWord[] = [];

    await new Promise<void>((resolve) => {
      let responded = false;

      recognizer.recognized = (s, e) => {
        if (e.result.reason === ResultReason.RecognizedSpeech && e.result.text) {
          const res = JSON.parse(
            e.result.properties.getProperty(
              PropertyId.SpeechServiceResponse_JsonResult
            )
          );

          const nbest = res.NBest[0]
          totalScore += nbest.PronunciationAssessment.PronScore * nbest.Words.length;
          totalWords += nbest.Words.length;
          nbest.Words.forEach((w: any) => {
            const phonemes = w.Phonemes.map((p: any) => ({
              phoneme: p.Phoneme,
              score: p.PronunciationAssessment.AccuracyScore
            }));
            words.push({
              text: w.Word,
              score: w.PronunciationAssessment.AccuracyScore,
              phonemes: phonemes
            });
          });
        }
      };

      recognizer.sessionStopped = async () => {
        recognizer.stopContinuousRecognitionAsync(() => {
          if (responded) return;
          responded = true;
          recognizer.close();

          resolve(
            res.status(200).json({
              score: totalWords ? Math.round(totalScore / totalWords) : 0,
              words: words
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
    return res.status(500).json({ error: err.message });
  }
};