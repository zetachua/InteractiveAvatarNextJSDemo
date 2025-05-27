import { useEffect, useRef, useState } from "react";
import { Button } from "@nextui-org/react";
import {
  PronunciationAssessment,
  AssessmentType
} from "./KnowledgeClasses";
import '../styles/SentimentInvestorPieChart.css';
import Assessment from './Assessment';

export default function Test() {
  const [isAnalyzed, setIsAnalyzed] = useState<boolean>(false);

  // Recording and pitch analysis states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [pronunciationAssessment, setPronunciationAssessment] = useState<PronunciationAssessment>({
    score: 0,
    words: []
  });

  // Assessment results
  const assessments: AssessmentType[] = ['Pronunciation', 'Intonation', 'Fluency'];
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentType>('Pronunciation');

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');

        const convertRes = await fetch('/api/convertWebmToWav', {
          method: 'POST',
          body: formData,
        });

        if (!convertRes.ok) {
          const errorBody = await convertRes.json();
          throw new Error(errorBody.error);
        }

        const convertData = await convertRes.json();
        const filename = convertData.outputFile;

        const analysisRes = await fetch(`/api/pitchAnalysis?file=${encodeURIComponent(filename)}`, {
          method: 'POST',
        });

        if (!analysisRes.ok) {
          const errorBody = await analysisRes.json();
          throw new Error(errorBody.error);
        }

        const analysisData = await analysisRes.json();
        console.log(analysisData);

        setPronunciationAssessment(analysisData);
        setIsAnalyzed(true);
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
    } catch (err: any) {
      console.error(err);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  return (
    <div className='sentiment-analysis'>
      {isAnalyzed ? (
        <>
          <div className='select-assessment'>
            {assessments.map((assessment) => (
              <Button
                key={assessment}
                onPress={() => setSelectedAssessment(assessment)}
                className={`text-xl px-6 py-7 border transition-all ${
                  selectedAssessment === assessment
                    ? 'bg-gray-500 text-white border-gray-500'
                    : 'bg-transparent text-gray-500 border-gray-500'
                }`}
                variant='flat'
              >
                {assessment}
              </Button>
            ))}
          </div>

          <Assessment
            assessment={selectedAssessment}
            pronunciationAssessment={pronunciationAssessment}
          />
        </>
      ) : (
        <Button
          onPress={toggleRecording}
          style={{ background:'rgba(255,255,255,0.1)',margin: '0.5rem' ,borderRadius:'100px'}}
        >
          {isRecording ? 'end' : 'start'}
        </Button>
      )}
    </div>
  );
}