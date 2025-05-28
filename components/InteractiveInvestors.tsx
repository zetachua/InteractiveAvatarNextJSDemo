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

import { Word, PronunciationAssessment, ChatHistory,FeedbackData, FeedbackMetricData, FeedbackSpecificMetrics, Rubric2InvestorData, Rubric2InvestorSpecificData, RubricInvestorData, RubricInvestorSpecificData } from "./KnowledgeClasses";
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
  const mediaStream = useRef<HTMLVideoElement>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [feedbackText,setFeedbackText]=useState('');
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
  const [callCount, setCallCount] = useState<number>(0);
  const [pauses, setPauses] = useState<any[]>([]);

  // Recording and pitch analysis states
  const [isPronunciationAnalyzed, setIsPronunciationAnalyzed] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [pronunciationAssessment, setPronunciationAssessment] = useState<PronunciationAssessment>({
    score: 0,
    words: []
  });

  useEffect(() => {
    if (isBeginClock) {
      if (callCount == 1 || timeLeft <= 0) {
        setIsTimeUp(true);
        stopRecording();
        return;
      }

      const timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [callCount, timeLeft, isBeginClock]);

  async function startSession() {
    setLoadingRubric(false);
    setLoadingRubric1(false);
    setLoadingRubric2(false);
    // setLoadingRubric3(false);
    
    setIsLoadingSession(true);
    setStream(true);
    try {
      resetAllStates();

    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }
  
  async function handleSpeak(userInputValue?:string) {
    setIsLoadingRepeat(true);
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
    setCallCount(0);
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
  }

  const toggleSpeechToText = () => {
    if (isRecording) {
      setCallCount(prev => prev + 1);
      stopRecording();
    } else {
      startRecording();
    }
  };
  const startRecording = async () => {
    setIsPronunciationAnalyzed(false);

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

        const transcribed = analysisData.words.reduce((a: string, b: Word) => a + b.text + ' ', '');
        handleSpeak(transcribed);

        setPronunciationAssessment(analysisData);
        setIsPronunciationAnalyzed(true);
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

  const downloadTextFile = () => {
    const chatText = chatHistory
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");
  
    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
  
    const a = document.createElement("a");
    a.href = url;
    a.download = "chatHistory.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
async function endSession() {
  // Set loading state to true before starting the fetch
  setLoadingRubric(true);
  setLoadingRubric1(true);
  setLoadingRubric2(true);
  // setLoadingRubric3(true);
  
  setStream(false);
  setIsBeginClock(false);

  try{
    fetchSentiment();

    fetchAllMetrics();

  } catch (error) {
    console.error('Error fetching pitch sentiment and rubric response:', error);
  } finally {

  }

}

  console.log(rubricSummary,"rubricSummary",rubricJson,"rubricJson",rubricAllRatings,"rubricScore",rubricSpecificFeedback,"rubricSpecificFeedback")

  const fetchSentiment = async () =>{
    const responseSentiment = await fetch(`/api/pitchSentimentResponse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput, chatHistory,selectedModel}),
    });
    const dataSentiment = await responseSentiment.json();
    console.log(dataSentiment,"was i in sentiment evaluation");
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

    console.log(dataMetric1.rubricScore2 , aggregatedMetrics ,"the scores")
    }finally {
      setLoadingRubric(false); // Once the data is fetched, stop loading
    }
  };

  return (
    <div className="flex flex-col "style={{display:'flex',justifyContent:'center',alignItems:'center'}} >
      <Card className="w-screen h-screen overflow-hidden border-none rounded-none" style={{background: 'linear-gradient(to top, #987B8C, #F0C7C2)'}}>
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
                {/* <video
                  ref={mediaStream}
                  autoPlay
                  playsInline
                  style={{
                    width: "90%",
                    height: "80%",
                    marginBottom:'4rem',
                    objectFit: "contain",
                    borderRadius:'5px',
                  }}
                >
                  <track kind="captions" />
                </video> */}
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
                        value={userInput}
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
                        onClick={()=>{
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
                    </>
                  ) : (
                    <Introduction setIsBeginClock={setIsBeginClock} />
                  )}
                </div>
              </div>
            </>
          ) : !isLoadingSession ? (
            <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center"style={{backgroundColor:'rgba(255,255,255,0.2)',borderRadius:'50px',padding:'2rem',maxHeight:'30%'}}>
              <div className="flex flex-col gap-2 w-full" style={{position:'relative'}} >
                 <Select
                    placeholder="Select an AI Model"
                    size="md"
                    value={selectedModel}
                    onChange={(e) => {
                      const selectedValue = Number(e.target.value);
                      console.log("Selected model:", models[selectedValue]);
                      setSelectedModel(models[selectedValue]);

                    }}
                  >
                  {models.map((model, index) => (
                    <SelectItem key={index} value={model}>
                    {model}
                    </SelectItem>
                  ))}
                </Select>
                
              </div>
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                size="md"
                variant="shadow"
                onClick={startSession}
              >
                Start session
              </Button>
            </div>
          ) : (
            <Spinner color="default" size="lg" />
          )}
        </CardBody>

        {/* {sentimentJson && <FeedbackPieChart data={sentimentJson} overallScore={sentimentScore} />} */}
        {(sentimentJson && rubricJson2 && isPronunciationAnalyzed) ? 
          <div style={{fontSize: '1.3rem', position:'absolute',top:'50%',left:'50%', backgroundColor:'rgba(50,51,52)',borderRadius:'50px',transform:'translate(-50%,-50%) scale(0.65)',padding:'2rem',width:'100%',maxHeight:'1100px',overflowY:'scroll'}}>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-start' }}>
              <Button
                onClick={() => setDisplayLookupPitch(!displayLookupPitch)}
                className={`text-white ${
                  !displayLookupPitch
                    ? 'bg-transparent border border-indigo-500'
                    : 'bg-gradient-to-tr from-indigo-500 to-indigo-300'
                }`}
                size="md"
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
                size="md"
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
                size="md"
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
                size="md"
                variant="shadow"
              >
                MediVR
              </Button>
              <button
                style={{
                  border: 'none',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.4)',
                  color: '#fff',
                  fontSize: '16px',
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  padding: '0 17px'
                }}
                onClick={() => downloadTextFile()}
              >
                Download ChatHistory
              </button>
            </div>

            <div style={{ display: 'inline-flex' }}>
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
              <SentimentInvestorPiechart pronunciationAssessment={pronunciationAssessment} data={sentimentMetrics} overallScore={sentimentScore} feedbackSummary={feedbackText} specificFeedback={sentimentSpecificFeedback} resetAllStates={resetAllStates} totalRounds={0}></SentimentInvestorPiechart>
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
       {/* <p className="font-mono text-right">
        <span className="font-bold">Console:</span>
        <br />
        {debug}
      </p>  */}
    </div>
  );
}
