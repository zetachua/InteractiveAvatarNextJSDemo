import dotenv from 'dotenv';
import fs from 'fs';
import {
  AudioConfig,
  AudioInputStream,
  AudioStreamFormat,
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

const BYTES_PER_SECOND = 32000; // 16kHz * 1ch * 16-bit
const SAMPLE_SECONDS = 30;

function findWavDataOffset(buf: Buffer): number {
  for (let i = 12; i < Math.min(buf.length - 8, 1024); i++) {
    if (buf[i] === 0x64 && buf[i+1] === 0x61 && buf[i+2] === 0x74 && buf[i+3] === 0x61) {
      return i + 8;
    }
  }
  return 44;
}

/** Extract SAMPLE_SECONDS of raw PCM starting at startSec, from a WAV buffer. */
function extractPcmWindow(buf: Buffer, startSec: number): Buffer {
  const dataOffset = findWavDataOffset(buf);
  const startByte = Math.min(Math.floor(startSec * BYTES_PER_SECOND), buf.length - dataOffset);
  const maxBytes = SAMPLE_SECONDS * BYTES_PER_SECOND;
  const from = dataOffset + startByte;
  const to = Math.min(from + maxBytes, buf.length);
  return buf.subarray(from, to);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file, script, segments } = req.body;
  const audioPath = path.join(process.cwd(), 'temp', file);

  try {
    const rawBuffer = await fs.promises.readFile(audioPath);

    // Find where user speech starts from Whisper segments so we don't trim silence
    const speechStartSec = Array.isArray(segments) && segments.length > 0
      ? Math.max(0, (segments[0].start ?? 0) - 0.5)
      : 0;

    // Extract 30-second window of raw PCM from speech start
    const pcmSlice = extractPcmWindow(rawBuffer, speechStartSec);

    // Script: only the words spoken within the 30-second window
    const windowEndSec = speechStartSec + SAMPLE_SECONDS;
    const windowScript = Array.isArray(segments) && segments.length > 0
      ? segments
          .filter((s: any) => {
            const t = s.start ?? 0;
            return t >= speechStartSec - 1 && t < windowEndSec;
          })
          .map((s: any) => (s.text ?? '').trim())
          .join(' ')
          .trim()
      : script;
    const effectiveScript = windowScript || script;

    console.log(`pronunciationAnalysis: speechStart=${speechStartSec.toFixed(1)}s pcmBytes=${pcmSlice.length} duration≈${(pcmSlice.length / BYTES_PER_SECOND).toFixed(1)}s scriptWords=${effectiveScript.split(' ').length}`);

    const format = AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = AudioInputStream.createPushStream(format);
    pushStream.write(pcmSlice.buffer.slice(
      pcmSlice.byteOffset,
      pcmSlice.byteOffset + pcmSlice.byteLength
    ) as ArrayBuffer);
    pushStream.close();

    const audioConfig = AudioConfig.fromStreamInput(pushStream);

    const speechConfig = SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY!,
      process.env.AZURE_REGION!
    );
    speechConfig.speechRecognitionLanguage = 'en-US';

    const assessmentConfig = new PronunciationAssessmentConfig(
      effectiveScript,
      PronunciationAssessmentGradingSystem.HundredMark,
      PronunciationAssessmentGranularity.Phoneme,
      true
    );
    assessmentConfig.enableProsodyAssessment = true;
    assessmentConfig.phonemeAlphabet = 'IPA';

    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    assessmentConfig.applyTo(recognizer);

    let totalScore = 0;
    let totalWords = 0;
    const words: PronunciationWord[] = [];

    const TIMEOUT_MS = 45000;
    await new Promise<void>((resolve) => {
      let responded = false;

      const failWithTimeout = () => {
        if (responded) return;
        responded = true;
        try { recognizer.close(); } catch { /* ignore */ }
        resolve(res.status(504).json({ error: 'Azure pronunciation analysis timed out — check your AZURE_SPEECH_KEY and AZURE_REGION.' }));
      };
      const timeoutId = setTimeout(failWithTimeout, TIMEOUT_MS);

      const done = (fn: () => void) => {
        if (responded) return;
        responded = true;
        clearTimeout(timeoutId);
        fn();
      };

      recognizer.recognized = (s, e) => {
        if (e.result.reason === ResultReason.RecognizedSpeech && e.result.text) {
          const parsed = JSON.parse(
            e.result.properties.getProperty(
              PropertyId.SpeechServiceResponse_JsonResult
            )
          );

          const nbest = parsed.NBest[0];
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
          done(() => {
            recognizer.close();
            resolve(res.status(200).json({
              score: totalWords ? Math.round(totalScore / totalWords) : 0,
              words: words
            }));
          });
        });
      };

      recognizer.canceled = async (s, e) => {
        // EndOfStream is the SDK's normal signal that the push stream ended —
        // return whatever words were collected rather than treating it as an error.
        if (e.reason === CancellationReason.EndOfStream) {
          recognizer.stopContinuousRecognitionAsync(() => {
            done(() => {
              recognizer.close();
              resolve(res.status(200).json({
                score: totalWords ? Math.round(totalScore / totalWords) : 0,
                words,
              }));
            });
          });
          return;
        }
        const errorMsg = `${CancellationReason[e.reason]}: ${e.errorDetails}`;
        console.error('pronunciationAnalysis canceled:', errorMsg);
        recognizer.stopContinuousRecognitionAsync(() => {
          done(() => {
            recognizer.close();
            resolve(res.status(500).json({ error: errorMsg }));
          });
        });
      };

      recognizer.startContinuousRecognitionAsync();
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
