import StreamingAvatar, { AvatarQuality, StreamingEvents } from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
  Checkbox,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import './TextArea.css';

interface Pause {
  start: number;
  end: number;
}

import { ChatHistory,FeedbackData, FeedbackMetricData, FeedbackSpecificMetrics, Rubric2InvestorData, Rubric2InvestorSpecificData, RubricInvestorData, RubricInvestorSpecificData } from "./KnowledgeClasses";
import { Square,Microphone, SkipForward} from "@phosphor-icons/react";
import {concretePitchRubrics, grantedPitchRubrics, lookupPitchRubrics, mediVRPitchRubrics, models} from '../pages/api/configConstants'
import RubricInvestorPiechart2 from "./RubricInvestorPieChart2";
import CountdownTimer from "./Countdown";
import SentimentInvestorPiechart from "./SentimentInvestorPieChart";
import ChatHistoryDisplay from "./ChatHistoryDisplay";
import RubricInvestorPiechartExample from "./RubricInvestorPieChartExample";
import Introduction from "./Introduction";

export default function InteractiveInvestors() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [loadingRubric, setLoadingRubric] = useState(false);
  const [loadingRubric1, setLoadingRubric1] = useState(false);
  const [loadingRubric2, setLoadingRubric2] = useState(false);
  // const [loadingRubric3, setLoadingRubric3] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState(false);
  const [debug, setDebug] = useState<string>();
  const [displayText, setDisplayText]= useState('');
  const [displayLookupPitch,setDisplayLookupPitch]=useState(false);
  const [displayGrantPitch,setDisplayGrantPitch]=useState(false);
  const [displayMediVRPitch,setDisplayMediVRPitch]=useState(false);
  const [displayConcretePitch,setDisplayConcretePitch]=useState(false);
  const [userInput, setUserInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [feedbackText,setFeedbackText]=useState('');
  const [audioTranscribing,setAudioTranscribing]=useState(false);
  const [rubricSummary,setRubricSummary]=useState('');
  const [rubricSpecificFeedback,setRubricSpecificFeedback]=useState<RubricInvestorSpecificData>(
  {
    marketValidation: '',
    pitchDeck: '',
    oralPresentation: ''
  });
  const [rubricSummary2,setRubricSummary2]=useState('');
  const [rubricCitations2,setRubricCitations2]=useState('');
  
  const [rubricSpecificFeedback2,setRubricSpecificFeedback2]=useState<Rubric2InvestorSpecificData>(
    {
      elevatorPitch:'',
      team:'',
      marketOpportunity:'',
      marketSize:'',
      solutionValueProposition:'',
      competitivePosition:'',
      tractionAwards: '',
      revenueModel: '',
    });
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [sentimentJson, setSentimentJson] = useState<FeedbackData | null>(null);
  const [sentimentMetrics, setSentimentMetrics] = useState<FeedbackMetricData>(
    {
      clarity: 0,
      relevance:0,
      depth: 0,
      neutrality: 0,
      engagement:0,
    }
  );
  const [sentimentSpecificFeedback, setSentimentSpecificFeedback] = useState<FeedbackSpecificMetrics>(
    {
    clarity: "",
    relevance: "",
    depth: "",
    neutrality: "",
    engagement: "",
  });
  const [sentimentScore, setSentimentScore] = useState<number>(0); 
  const [rubricJson, setRubricJson] = useState<RubricInvestorData | null>(null);
  const [rubricAllRatings, setRubricAllRatings] = useState<number>(0); 
  const [rubricJson2, setRubricJson2] = useState<Rubric2InvestorData | null>(null);
  const [rubricAllRatings2, setRubricAllRatings2] = useState<number>(0); 
  const transcriptRef = useRef<string>(''); 
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes in seconds
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [isBeginClock, setIsBeginClock] = useState<boolean>(false);
  const [isPitch, setIsPitch] = useState<boolean>(true);
  const [pauses, setPauses] = useState<any[]>([]);
  const [isAvatarMode, setIsAvatarMode] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [emojiSatisfaction, setEmojiSatisfaction] = useState<"satisfied" | "neutral" | "dissatisfied" | "">("");
  const [feedbackReason, setFeedbackReason] = useState("");
  const [pitchUnderstandingScore, setPitchUnderstandingScore] = useState<number>(0);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitMessage, setFeedbackSubmitMessage] = useState("");
  const [showChatHistoryModal, setShowChatHistoryModal] = useState(false);
  const audioUploadRef = useRef<HTMLInputElement | null>(null);
  const [avatarApiKey, setAvatarApiKey] = useState("");
  const [avatarStream, setAvatarStream] = useState<MediaStream>();
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);

  // Recording and pitch analysis states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [assessment, setAssessment] = useState({
    pronunciation: null,
    intonation: null,
    fluency: null
  });
  const isAnyComparisonOpen =
    displayLookupPitch || displayGrantPitch || displayConcretePitch || displayMediVRPitch;

  useEffect(() => {
    if (isBeginClock) {
      if (timeLeft <= 0) {
        setIsTimeUp(true);
        stopRecording();
        return;
      }

      const timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, isBeginClock]);

  useEffect(() => {
    if (avatarStream && avatarVideoRef.current) {
      avatarVideoRef.current.srcObject = avatarStream;
      avatarVideoRef.current.onloadedmetadata = () => {
        avatarVideoRef.current?.play().catch(() => {
          setDebug("Unable to autoplay avatar stream.");
        });
      };
    }
  }, [avatarStream]);

  async function fetchAvatarAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": avatarApiKey,
        },
      });
      const raw = await response.text();
      if (!response.ok) {
        throw new Error(raw || `Access token request failed (${response.status})`);
      }
      return raw;
    } catch (error) {
      setDebug(`Avatar token error: ${error instanceof Error ? error.message : "Unknown error"}`);
      return "";
    }
  }

  async function startAvatarSession() {
    setIsLoadingSession(true);
    const token = await fetchAvatarAccessToken();
    if (!token) {
      setIsLoadingSession(false);
      return;
    }

    try {
      avatarRef.current = new StreamingAvatar({
        token,
        basePath: "https://api.heygen.com",
      });
      avatarRef.current.on(StreamingEvents.STREAM_READY, (event) => {
        setAvatarStream(event.detail);
      });
      avatarRef.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setAvatarStream(undefined);
      });

      await avatarRef.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: "Anna_public_3_20240108",
        disableIdleTimeout: true,
      });
      setDebug("Avatar session started.");
    } catch (error) {
      const errObj = error as any;
      const extra =
        errObj?.response?.data ||
        errObj?.data ||
        errObj?.body ||
        errObj?.message ||
        "Unknown error";
      const extraText =
        typeof extra === "string" ? extra : JSON.stringify(extra);
      setDebug(`Error starting avatar session: ${extraText}`);
    } finally {
      setIsLoadingSession(false);
    }
  }

  async function endAvatarSession() {
    try {
      await avatarRef.current?.stopAvatar();
    } catch (error) {
      setDebug(`Error ending avatar session: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setAvatarStream(undefined);
      avatarRef.current = null;
      setIsAvatarMode(false);
    }
  }

  async function startSession() {
    setLoadingRubric(false);
    setLoadingRubric1(false);
    setLoadingRubric2(false);
    // setLoadingRubric3(false);
    
    setIsLoadingSession(true);
    try {
      setStream(true);
      resetAllStates();

    } catch (error) {
      console.error("Error starting session:", error);
      setStream(false);
    } finally {
      setIsLoadingSession(false);
    }
  }
  
  async function handleSpeak(userInputValue?:string) {
    setIsLoadingRepeat(true);
    setIsTimeUp(true);
    if(userInputValue){
      setUserInput(userInputValue);
    } 

    try {
      // Fetch LLM response
      const response = await fetch(`/api/qnaResponse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput:userInputValue,chatHistory,selectedModel}),
      });
      const data = await response.json();
      if (data.chatHistory !== undefined) setChatHistory(data.chatHistory);
      if (data.questionResponse !== undefined) setDisplayText(data.questionResponse);

    } catch (error) {
      console.error("Error fetching LLM response:", error);
      setDebug("Failed to fetch response from LLM");
    } finally {
      setIsLoadingRepeat(false);
    }
  }

  const resetAllStates=()=>{
    setIsRecording(false);
    setTimeLeft(300);
    setIsTimeUp(false);
    setIsBeginClock(false);
    setIsPitch(true);
    setFeedbackText('');
    setDisplayText('');
    setChatHistory([]);
    setRubricSummary('');
    setRubricJson(null);
    setRubricJson2(null);
    setSentimentScore(0);
    setRubricAllRatings(0);
    setSentimentJson(null);
    setSentimentMetrics({
      clarity: 0,
      relevance:0,
      depth: 0,
      neutrality: 0,
      engagement:0,
    });
    setSentimentSpecificFeedback(
      {
        clarity: "",
        relevance: "",
        depth: "",
        neutrality: "",
        engagement: "",
      }
    ),
    setRubricSpecificFeedback( {
      marketValidation: '',
      pitchDeck: '',
      oralPresentation: ''
    });
    setDebug("");
  }

  const toggleSpeechToText = () => {
    if (isRecording) {
      setIsTimeUp(true);
      setAudioTranscribing(true);
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
        // Convert webm to wav
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        const convertRes = await fetch('/api/convertWebmToWav', {
          method: 'POST',
          body: formData,
        });

        const convertData = await convertRes.json();
        if (!convertRes.ok) {
          throw new Error(convertData.error);
        }
        await processConvertedAudio(convertData.outputFile);
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
    } catch (err: any) {
      console.error(err);
    }
  };

  const runPitchAudioAssessment = async (outputFile: string, transcribedData: any) => {
    if (!isPitch) return;
    setIsPitch(false);

    const [
      pronunciationRes,
      intonationRes,
      fluencyRes
    ] = await Promise.all([
      fetch('/api/pronunciationAnalysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: outputFile,
          script: transcribedData.text
        })
      }),
      fetch('http://localhost:8000/intonationAnalysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: outputFile,
          script: transcribedData.text,
          segments: transcribedData.segments
        })
      }),
      fetch('http://localhost:8000/fluencyAnalysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: transcribedData.segments
        })
      })
    ]);

    const [
      pronunciationData,
      intonationData,
      fluencyData
    ] = await Promise.all([
      pronunciationRes.json(),
      intonationRes.json(),
      fluencyRes.json()
    ]);

    if (!pronunciationRes.ok) throw new Error(pronunciationData.error);
    if (!intonationRes.ok) throw new Error(intonationData.error);
    if (!fluencyRes.ok) throw new Error(fluencyData.error);

    setAssessment({
      pronunciation: pronunciationData,
      intonation: intonationData,
      fluency: fluencyData
    });
  };

  const processConvertedAudio = async (outputFile: string, runAssessmentInBackground = false) => {
    const transcribedRes = await fetch(`http://localhost:8000/transcribe?file=${encodeURIComponent(outputFile)}`, {
      method: 'POST',
    });
    const transcribedData = await transcribedRes.json();
    if (!transcribedRes.ok) {
      throw new Error(transcribedData.error || "Transcription failed");
    }

    setAudioTranscribing(false);
    handleSpeak(transcribedData.text);

    if (runAssessmentInBackground) {
      void runPitchAudioAssessment(outputFile, transcribedData).catch((error) => {
        console.error("Background audio assessment failed:", error);
      });
    } else {
      await runPitchAudioAssessment(outputFile, transcribedData);
    }
  };

  const handleAudioFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setAudioTranscribing(true);
      setDebug("Uploading and processing audio file...");

      const formData = new FormData();
      formData.append('file', file, file.name);
      const convertRes = await fetch('/api/convertWebmToWav', {
        method: 'POST',
        body: formData,
      });
      const convertData = await convertRes.json();
      if (!convertRes.ok) {
        throw new Error(convertData.error || "Audio conversion failed");
      }

      await processConvertedAudio(convertData.outputFile, true);
      setDebug("Audio file processed successfully.");
    } catch (error) {
      setAudioTranscribing(false);
      setDebug(error instanceof Error ? error.message : "Failed to process audio file");
    } finally {
      if (audioUploadRef.current) audioUploadRef.current.value = "";
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  function mergeJsons<T extends Record<string, number | string>>(obj1: T, obj2: T): T {
    const mergedObj: T = { ...obj1 };
  
    Object.keys(obj2).forEach((key) => {
      const value1 = mergedObj[key as keyof T];
      const value2 = obj2[key as keyof T];
  
      // Only handle the merging of number fields
      if (typeof value1 === "number" && typeof value2 === "number") {
        mergedObj[key as keyof T] = (value1 + value2) as T[keyof T];
      } else if (typeof value2 === "number") {
        // If only obj2 has a number for that key, add it
        mergedObj[key as keyof T] = value2;
      }
    });    
    return mergedObj;
  }

async function endSession() {
  setStream(false);
  setIsBeginClock(false);
  setShowFeedbackModal(true);

  try{
    fetchSentiment();

    fetchAllMetrics();

  } catch (error) {
    console.error('Error fetching pitch sentiment and rubric response:', error);
  } finally {

  }

}

const submitSessionFeedback = async () => {
  if (!emojiSatisfaction || pitchUnderstandingScore < 1 || pitchUnderstandingScore > 5) {
    setFeedbackSubmitMessage("Please select emoji satisfaction and a score from 1 to 5.");
    return;
  }

  try {
    setIsSubmittingFeedback(true);
    setFeedbackSubmitMessage("");

    const response = await fetch("/api/investorFeedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emojiSatisfaction,
        reason: feedbackReason,
        pitchUnderstandingScore,
        selectedModel,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || data?.details?.message || "Failed to submit feedback");
    }

    setFeedbackSubmitMessage("Thanks! Feedback submitted.");
    setTimeout(() => {
      setShowFeedbackModal(false);
      setEmojiSatisfaction("");
      setFeedbackReason("");
      setPitchUnderstandingScore(0);
      setFeedbackSubmitMessage("");
    }, 800);
  } catch (error) {
    console.error("Feedback submission error:", error);
    setFeedbackSubmitMessage(error instanceof Error ? error.message : "Could not submit feedback. Please try again.");
  } finally {
    setIsSubmittingFeedback(false);
  }
};



  const fetchSentiment = async () =>{
    const responseSentiment = await fetch(`/api/pitchSentimentResponse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput, chatHistory,selectedModel}),
    });
    const dataSentiment = await responseSentiment.json();
    if (dataSentiment?.sentimentSummary !== undefined) setFeedbackText(dataSentiment.sentimentSummary);
    if (dataSentiment?.sentimentSpecifics !== undefined) setSentimentSpecificFeedback(dataSentiment.sentimentSpecifics);
    if (dataSentiment?.sentimentMetrics!==undefined){
        const updateSentimentJson=mergeJsons(sentimentJson,dataSentiment.sentimentMetrics)
        setSentimentJson(updateSentimentJson);
        setSentimentMetrics(dataSentiment.sentimentMetrics);
    }
    if (dataSentiment.sentimentScore!==undefined) setSentimentScore(dataSentiment.sentimentScore);
  }

  const fetchAllMetrics = async () => {

    setLoadingRubric(true); // Start loading
    setLoadingRubric1(true);
    setLoadingRubric2(true);
    // setLoadingRubric3(true);

    try{
      const [ragSonar] = await Promise.all([
        fetch(`/api/pitchEvaluationResponseRAG`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatHistory }),
        }),
      ]);
      const ragSonarJson = await ragSonar.json();
      console.log(ragSonarJson, "what is the ragSonarJson and stats:",ragSonarJson.currentMarketStats);

      const currentMarketStats=ragSonarJson.currentMarketStats;
      const [responseMetric1, responseMetric2] = await Promise.all([
        fetch(`/api/pitchEvaluationResponseMetric1`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({currentMarketStats, chatHistory }),
        }),
        fetch(`/api/pitchEvaluationResponseMetric2`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({currentMarketStats, chatHistory }),
        }),
        // fetch(`/api/pitchEvaluationResponseMetric3`, {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({ chatHistory }),
        // }),
      ]);

  
    // Parse all responses
    const dataMetric1 = await responseMetric1.json();
    const dataMetric2 = await responseMetric2.json();
    // const dataMetric3 = await responseMetric3.json();
  
    if (dataMetric1) setLoadingRubric1(false);
    if (dataMetric2) setLoadingRubric2(false);
    // if (dataMetric3) setLoadingRubric3(false);

    // Aggregate the data
    const aggregatedSummary = [
      dataMetric1.rubricSummary2,
      dataMetric2.rubricSummary2,
      // dataMetric3.rubricSummary2,
    ].filter(Boolean).join(' '); 
  
    const aggregatedMetrics = {
      ...dataMetric1.rubricMetrics2,
      ...dataMetric2.rubricMetrics2,
      // ...dataMetric3.rubricMetrics2,
    }
    
    const aggregatedCitations =[
      dataMetric1.citations,
      dataMetric2.citations,
      // dataMetric3.citations,
    ].filter(Boolean).join(' ');

    const scores = [
      dataMetric1.rubricScore2,
      dataMetric2.rubricScore2,
      // dataMetric3.rubricScore2,
    ].filter(score => score !== 0); 
    
    const aggregatedScores = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 0; 
        
    const aggregatedFeedback = {
      ...(dataMetric1.rubricSpecificFeedback2 || {}),
      ...(dataMetric2.rubricSpecificFeedback2 || {}),
      // ...(dataMetric3.rubricSpecificFeedback2 || {}),
    };
  
    // Update states once with aggregated data
    if (aggregatedSummary) setRubricSummary2(aggregatedSummary);
    if (aggregatedMetrics) setRubricJson2(aggregatedMetrics);
    if (aggregatedScores) setRubricAllRatings2(aggregatedScores);
    if (aggregatedFeedback) setRubricSpecificFeedback2(aggregatedFeedback);
    if (aggregatedCitations) setRubricCitations2(aggregatedCitations);
    }finally {
      setLoadingRubric(false); // Once the data is fetched, stop loading
    }
  };

  if (isAvatarMode) {
    return (
      <div style={{ position: "relative" }}>
        <Card className="w-screen h-screen overflow-hidden border-none rounded-none" style={{background: 'linear-gradient(to top, #987B8C, #F0C7C2)'}}>
          {!!debug && (
            <div style={{position:'absolute', top:'14px', left:'50%', transform:'translateX(-50%)', zIndex: 2000, background:'rgba(0,0,0,0.65)', color:'white', padding:'0.5rem 0.8rem', borderRadius:'10px', fontSize:'0.8rem'}}>
              {debug}
            </div>
          )}
          <CardBody className="flex flex-col justify-center items-center">
            {avatarStream ? (
              <>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="sm"
                  variant="shadow"
                  onClick={endAvatarSession}
                  style={{ position: "absolute", top: "16px", right: "16px", zIndex: 50 }}
                >
                  Exit Avatar Mode
                </Button>
                <video
                  ref={avatarVideoRef}
                  autoPlay
                  playsInline
                  style={{ width: "90%", height: "80%", objectFit: "contain", borderRadius: "8px" }}
                >
                  <track kind="captions" />
                </video>
              </>
            ) : (
              <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center" style={{backgroundColor:'rgba(255,255,255,0.2)',borderRadius:'50px',padding:'2rem',maxHeight:'40%'}}>
                <Input
                  placeholder="Paste HeyGen API Key"
                  value={avatarApiKey}
                  onChange={(e) => setAvatarApiKey(e.target.value)}
                />
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                  size="md"
                  variant="shadow"
                  onClick={startAvatarSession}
                  isDisabled={!avatarApiKey || isLoadingSession}
                >
                  {isLoadingSession ? <Spinner size="sm" color="white" /> : "Start Avatar Session"}
                </Button>
                <Button
                  variant="flat"
                  onClick={() => setIsAvatarMode(false)}
                >
                  Back to Standard Mode
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col "style={{display:'flex',justifyContent:'center',alignItems:'center'}} >
      <Card className="w-screen h-screen overflow-hidden border-none rounded-none" style={{background: 'linear-gradient(to top, #987B8C, #F0C7C2)'}}>
        {!!debug && (
          <div style={{position:'absolute', top:'14px', left:'50%', transform:'translateX(-50%)', zIndex: 2000, background:'rgba(0,0,0,0.65)', color:'white', padding:'0.5rem 0.8rem', borderRadius:'10px', fontSize:'0.8rem'}}>
            {debug}
          </div>
        )}
        <CardBody className="flex flex-col justify-center items-center">
          {stream ? (
            <>
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300  text-white rounded-lg"
                size="md"
                variant="shadow"
                onClick={endSession}
                style={{position: 'absolute', top: '45px'}}
              >
                End session
              </Button>

              <CountdownTimer isTimeUp={isTimeUp} timeLeft={timeLeft} />

              <div className="w-full justify-center items-center flex overflow-hidden" style={{flexDirection:'column', marginTop: '50px'}}>
                <ChatHistoryDisplay chatHistory={chatHistory}></ChatHistoryDisplay>
                <div className="flex flex-col items-center" style={{flexDirection:'row'}}>
                  {/* Input field to capture user input */}
                
                {/* <div>
                    <h3>Pauses:</h3>
                    {pauses.length > 0 ? (
                      <ul>
                        {pauses.map((pause, index) => (
                          <li key={index}>
                            Pause from {pause.pauseStart}s to {pause.pauseEnd}s, duration: {pause.pauseDuration}s
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No pauses detected</p>
                    )}
                  </div> */}
                  
              
                  {isBeginClock ? (
                    <>
                      <textarea
                        placeholder="Type your message..."
                        value={audioTranscribing? "Transcribing Your Audio...": userInput}
                        onChange={(e) =>{
                          setUserInput(e.target.value)
                        }}
                        className="custom-textarea"
                        style={{
                          backgroundColor:'rgba(255,255,255,0.2)',
                          textAlign: "left",
                          padding: "0.5rem 0.5rem 0.5rem 1rem",
                          width: "470px",
                          fontSize:'14px',
                          color:audioTranscribing?'#cdcdcd':'#fff',
                          justifyContent:'center',
                          alignContent:'center',
                          maxHeight: "70px!important",
                          minHeight: "20px!important",
                          overflowY: "scroll",
                          scrollbarWidth: "none", // Firefox
                          borderRadius: "20px",
                          border: "none", // Remove default borders that might interfere
                          outline: "none", // Remove default focus outline if unwanted
                        }}
                      >
                      </textarea>
                      <Button
                        onPress={()=>{
                          setIsTimeUp(true);
                          setIsPitch(false);
                          handleSpeak(userInput);
                          setUserInput('');
                        }}
                        isDisabled={!userInput.trim() || isLoadingRepeat}
                        style={{margin: '0rem 0rem 0rem 1rem',background:'rgba(255,255,255,0.1)'}}
                          >
                        {isLoadingRepeat ? <Spinner /> :  "Send"}
                      </Button>
                      <Button
                        onClick={toggleSpeechToText}
                        style={{ background:'rgba(255,255,255,0.1)',margin: '0.5rem' ,borderRadius:'100px'}}
                      >
                        {isRecording ? <div className={`wave`} />: <>Talk <Microphone size={14} /></>}
                      </Button>
                      <Button
                        onClick={() => audioUploadRef.current?.click()}
                        style={{ background:'rgba(255,255,255,0.1)',margin: '0.5rem', borderRadius:'100px'}}
                      >
                        Upload Audio
                      </Button>
                      <input
                        ref={audioUploadRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioFileUpload}
                        style={{ display: "none" }}
                      />
                    </>
                  ) : (
                    <Introduction setIsBeginClock={setIsBeginClock} />
                  )}
                </div>
              </div>
            </>
          ) : !isLoadingSession ? (
            <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center"style={{backgroundColor:'rgba(255,255,255,0.2)',borderRadius:'50px',padding:'2rem',maxHeight:'30%'}}>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white w-full"
                  size="md"
                  variant="shadow"
                  onClick={() => setIsAvatarMode(true)}
                >
                  Start Session with Avatar
                </Button>
              <div className="flex flex-col gap-2 w-full" style={{position:'relative'}} >
                <div style={{fontSize:'0.9rem', textAlign:'center', fontWeight:'500', color:'white',}}>Or</div>

                 <Select
                    placeholder="Select an AI Model"
                    size="md"
                    value={selectedModel}
                    onChange={(e) => {
                      const selectedValue = Number(e.target.value);
                      setSelectedModel(models[selectedValue]);
                    }}
                  >
                  {models.map((model, index) => (
                    <SelectItem key={index} value={model}>
                    {model}
                    </SelectItem>
                  ))}
                </Select>
                <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                size="md"
                variant="shadow"
                onClick={startSession}
              >
                Start session
              </Button>
              </div>
             
            </div>
          ) : (
            <Spinner color="default" size="lg" />
          )}
        </CardBody>

        {/* {sentimentJson && <FeedbackPieChart data={sentimentJson} overallScore={sentimentScore} />} */}
        {(sentimentJson && rubricJson2 && !showFeedbackModal) ? 
          <div id='evaluation' style={{fontSize: '0.8rem', position:'absolute',top:'50%',left:'50%', backgroundColor:'rgba(50,51,52)',borderRadius:'50px',transform:'translate(-50%,-50%)',padding:'2rem',width:'80%',maxHeight:'900px', minWidth: '600px', overflowY:'scroll',scrollbarWidth: 'none'}}>
            <button
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                border: 'none',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.4)',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: '500',
                display: 'inline-block',
                whiteSpace: 'nowrap',
                padding: '0.45rem 0.8rem',
                zIndex: 1200,
              }}
              onClick={() => setShowChatHistoryModal(true)}
            >
              View ChatHistory
            </button>
            <div style={{ marginBottom: '0.8rem', color: 'white' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Benchmark Comparison</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Toggle startup examples below to compare your analysis against reference pitches.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <Button
                onClick={() => setDisplayLookupPitch(!displayLookupPitch)}
                className={`text-white ${
                  !displayLookupPitch
                    ? 'bg-transparent border border-indigo-500'
                    : 'bg-gradient-to-tr from-indigo-500 to-indigo-300'
                }`}
                size="sm"
                variant="shadow"
              >
                LookUp
              </Button>
              <Button
                onClick={() => setDisplayGrantPitch(!displayGrantPitch)}
                className={`text-white ${
                  !displayGrantPitch
                    ? 'bg-transparent border border-indigo-500'
                    : 'bg-gradient-to-tr from-indigo-500 to-indigo-300'
                }`}
                size="sm"
                variant="shadow"
              >
                Grant
              </Button>
              <Button
                onClick={() => setDisplayConcretePitch(!displayConcretePitch)}
                className={`text-white ${
                  !displayConcretePitch
                    ? 'bg-transparent border border-indigo-500'
                    : 'bg-gradient-to-tr from-indigo-500 to-indigo-300'
                }`}
                size="sm"
                variant="shadow"
              >
                Concrete AI
              </Button>
              <Button
                onClick={() => setDisplayMediVRPitch(!displayMediVRPitch)}
                className={`text-white ${
                  !displayMediVRPitch
                    ? 'bg-transparent border border-indigo-500'
                    : 'bg-gradient-to-tr from-indigo-500 to-indigo-300'
                }`}
                size="sm"
                variant="shadow"
              >
                MediVR
              </Button>
            </div>

            <div style={{ display: 'flex', alignItems: 'start' }}>
              <RubricInvestorPiechart2  citations={rubricCitations2} data={rubricJson2} overallScore={rubricAllRatings2} summary={rubricSummary2} specificFeedback={rubricSpecificFeedback2} resetAllStates={resetAllStates} totalRounds={0}></RubricInvestorPiechart2>

              {(!rubricCitations2 || loadingRubric1 || loadingRubric2 || loadingRubric)&& 
              <div style={{position:'absolute',width:'400px',zIndex:'2000',color:'black',display:'flex',gap:'1rem',flexDirection:'column',backgroundColor:'rgba(255,255,255)',borderRadius:'20px',padding:'1rem',whiteSpace:'pre-line',top:'50%',left:'50%',transform:'translate(-50%,-50%)',boxShadow:'2px 2px 0px 0px black'}}>
                <div style={{display:'flex',gap:'1rem'}}>{(!rubricCitations2||loadingRubric||loadingRubric1)?<Spinner />:"! "}<span>{loadingRubric1? '[Loading Analysis]':'[Successfully Loaded]'} Elevation Pitch, Team, Market Opportunity</span></div>
                <div style={{display:'flex',gap:'1rem'}}>{(!rubricCitations2||loadingRubric||loadingRubric2)?<Spinner />:"! "}<span>{loadingRubric2? '[Loading Analysis]':'[Successfully Loaded]'} Market Size, Solution Value Proposition, Competitive Position</span></div> {/* <div style={{display:'flex',gap:'1rem'}}>{(!rubricCitations2||loadingRubric||loadingRubric3)?<Spinner />:"! "}<span>{loadingRubric3? '[Loading Analysis]':'[Successfully Loaded]'} Traction Awards, Revenue Model</span></div> */}
              </div>}

              { displayLookupPitch && <RubricInvestorPiechartExample title={'LookUp'} specificFeedback={lookupPitchRubrics()} />}
              { displayGrantPitch && <RubricInvestorPiechartExample title={'Grant'} specificFeedback={grantedPitchRubrics()} />}
              { displayMediVRPitch && <RubricInvestorPiechartExample title={'MediVR'} specificFeedback={mediVRPitchRubrics()} />}
              { displayConcretePitch && <RubricInvestorPiechartExample title={'Concrete'} specificFeedback={lookupPitchRubrics()} />}
              {!isAnyComparisonOpen && (
                (assessment.pronunciation && assessment.intonation && assessment.fluency) ? (
                  <SentimentInvestorPiechart
                    pronunciationAssessment={assessment.pronunciation}
                    intonationAssessment={assessment.intonation}
                    fluencyAssessment={assessment.fluency}
                    data={sentimentMetrics}
                    overallScore={sentimentScore}
                    feedbackSummary={feedbackText}
                    specificFeedback={sentimentSpecificFeedback}
                  />
                ) : (
                  <div style={{color: 'white', padding: '1rem', maxWidth: '420px'}}>
                    <b>Sentiment Analysis Loaded</b>
                    <p style={{marginTop: '0.5rem'}}>
                      Voice-specific assessment is unavailable for this run.
                      The pitch sentiment and rubric analysis are still shown.
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
         :
         loadingRubric&&
         <Spinner 
          style={{
            color:'white',
            background: 'rgba(50,51,52)',
            padding: '2rem',
            borderRadius: '50px',
            position: 'absolute',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%) scale(0.6)',
            width: '30%',
          }}
          size="lg" />
        }
          
       {/* <CardFooter className="flex flex-col gap-3 relative">
           <Tabs
            aria-label="Options"
            selectedKey={chatMode}
            onSelectionChange={(v) => {
              handleChangeChatMode(v);
            }}
          >
            <Tab key="text_mode" title="Text mode" />
            <Tab key="voice_mode" title="Voice mode" />
          </Tabs> */}
          {/* {chatMode === "text_mode" ? (
            <div className="w-full flex relative">
              <InteractiveAvatarTextInput
                disabled={!stream}
                input={text}
                label="Chat"
                loading={isLoadingRepeat}
                placeholder="Type something for the avatar to respond"
                setInput={setText}
                onSubmit={handleSpeak}
              />
              {text && (
                <Chip className="absolute right-16 top-3">Listening</Chip>
              )}
            </div>
          ) : ( 
            <div className="w-full text-center">
              <Button
                isDisabled={!isUserTalking}
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
                size="md"
                variant="shadow"
              >
                {isUserTalking ? "Listening" : "Voice chat"}
              </Button>
            </div>
           )} 
        </CardFooter>>*/}
      </Card>
      {showFeedbackModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
        >
          <div
            style={{
              width: "90%",
              maxWidth: "520px",
              background: "#1f1f1f",
              borderRadius: "16px",
              padding: "1.2rem",
              color: "white",
            }}
          >
            <h3 style={{ fontWeight: 700, marginBottom: "0.7rem" }}>Session Feedback</h3>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.7rem" }}>
              1) Emoji satisfaction
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <Button
                size="sm"
                onClick={() => setEmojiSatisfaction("satisfied")}
                className={emojiSatisfaction === "satisfied" ? "bg-green-500 text-white" : ""}
              >
                Satisfied
              </Button>
              <Button
                size="sm"
                onClick={() => setEmojiSatisfaction("neutral")}
                className={emojiSatisfaction === "neutral" ? "bg-yellow-500 text-black" : ""}
              >
                Neutral
              </Button>
              <Button
                size="sm"
                onClick={() => setEmojiSatisfaction("dissatisfied")}
                className={emojiSatisfaction === "dissatisfied" ? "bg-red-500 text-white" : ""}
              >
                Dissatisfied
              </Button>
            </div>

            <p style={{ fontSize: "0.9rem", marginBottom: "0.4rem" }}>
              2) Short reason
            </p>
            <textarea
              value={feedbackReason}
              onChange={(e) => setFeedbackReason(e.target.value)}
              placeholder="Tell us briefly why you selected that emoji..."
              style={{
                width: "100%",
                minHeight: "80px",
                borderRadius: "10px",
                background: "#2f2f2f",
                color: "white",
                border: "1px solid #555",
                padding: "0.6rem",
                marginBottom: "0.9rem",
              }}
            />

            <p style={{ fontSize: "0.9rem", marginBottom: "0.4rem" }}>
              3) Improvement in business pitch understanding (1-5)
            </p>
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5].map((score) => (
                <Button
                  key={score}
                  size="sm"
                  onClick={() => setPitchUnderstandingScore(score)}
                  className={pitchUnderstandingScore === score ? "bg-indigo-500 text-white" : ""}
                >
                  {score}
                </Button>
              ))}
            </div>

            {!!feedbackSubmitMessage && (
              <p style={{ fontSize: "0.85rem", marginBottom: "0.6rem" }}>{feedbackSubmitMessage}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <Button
                variant="flat"
                onClick={() => setShowFeedbackModal(false)}
                isDisabled={isSubmittingFeedback}
              >
                Skip
              </Button>
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
                onClick={submitSessionFeedback}
                isDisabled={isSubmittingFeedback}
              >
                {isSubmittingFeedback ? <Spinner size="sm" color="white" /> : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showChatHistoryModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
        >
          <div
            style={{
              width: "90%",
              maxWidth: "760px",
              maxHeight: "80vh",
              overflowY: "auto",
              background: "#1f1f1f",
              borderRadius: "16px",
              padding: "1rem",
              color: "white",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
              <h3 style={{ fontWeight: 700 }}>Chat History</h3>
              <Button size="sm" variant="flat" onClick={() => setShowChatHistoryModal(false)}>
                Close
              </Button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {chatHistory.length === 0 ? (
                <p style={{ opacity: 0.8 }}>No chat history available yet.</p>
              ) : (
                chatHistory.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: "10px",
                      padding: "0.7rem",
                      fontSize: "0.9rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <b style={{ textTransform: "capitalize" }}>{message.role}:</b> {message.content}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
       {/* <p className="font-mono text-right">
        <span className="font-bold">Console:</span>
        <br />
        {debug}
      </p>  */}
    </div>
  );
}
