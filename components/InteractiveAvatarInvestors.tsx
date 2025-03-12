import type { StartAvatarResponse } from "@heygen/streaming-avatar";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents, TaskMode, TaskType, VoiceEmotion,
} from "@heygen/streaming-avatar";
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
  Tab,
  Tabs,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";
import './WaveAnimation.css';


// import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

// import {AVATARS, STT_LANGUAGE_LIST} from "@/app/lib/constants";
import TypewriterText from "./Typewriter";
import FeedbackPieChart from "./FeedbackPieChart";
import { ChatHistory, FeedbackData, Rubric2InvestorData, Rubric2InvestorSpecificData, RubricInvestorData, RubricInvestorSpecificData } from "./KnowledgeClasses";
import { Square,Microphone} from "@phosphor-icons/react";
import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";
import {models, tempUserInput} from '../pages/api/configConstants'
import RubricInvestorPiechart from "./RubricInvestorPieChart";
import RubricInvestorPiechart2 from "./RubricInvestorPieChart2";

export default function InteractiveAvatarInvestors() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [loadingRubric, setLoadingRubric] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("June_HR_public");
  const [language, setLanguage] = useState<string>('en');
  const [displayText, setDisplayText]= useState('');

  const [data, setData] = useState<StartAvatarResponse>();
  const [userInput, setUserInput] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [startupIdea,setStartupIdea]=useState('');
  const [hypothesis,setHypothesis]=useState('');
  const [targetAudience,setTargetAudience]=useState('');
  const [feedbackText,setFeedbackText]=useState('');
  const [rubricSummary,setRubricSummary]=useState('');
  const [rubricSpecificFeedback,setRubricSpecificFeedback]=useState<RubricInvestorSpecificData>(
  {
    marketValidation: '',
    pitchDeck: '',
    oralPresentation: ''
  });
  const [rubricSummary2,setRubricSummary2]=useState('');
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
  const [displayRubricAnalytics,setDisplayRubricAnalytics]=useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [sentimentJson, setSentimentJson] = useState<FeedbackData | null>(null);
  const [sentimentRatings, setSentimentScore] = useState<number>(0); 
  const [rubricJson, setRubricJson] = useState<RubricInvestorData | null>(null);
  const [rubricAllRatings, setRubricAllRatings] = useState<number>(0); 
  const [rubricJson2, setRubricJson2] = useState<Rubric2InvestorData | null>(null);
  const [rubricAllRatings2, setRubricAllRatings2] = useState<number>(0); 
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<string>(''); 
  const [selectedModel, setSelectedModel] = useState<string>('');

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Specify the content type if you're sending JSON data
          "x-api-key": apiKey, // Include the API key in the request header
        },
      });
      const token = await response.text();

      console.log("Access Token:", token); // Log the token to verify

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }

    return "";
  }

  async function startSession() {
    setIsLoadingSession(true);
    setDisplayRubricAnalytics(false);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
      basePath: "https://api.heygen.com",
      userAudioWebsocketPath: "ws://localhost:3001/user-audio-input",
    });
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail);
      setStream(event.detail);
    });
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log(">>>>> User started talking:", event);
      setIsUserTalking(true);
    });
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log(">>>>> User stopped talking:", event);
      setIsUserTalking(false);
    });
    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: avatarId,
        disableIdleTimeout: true,
      });

      setData(res);
      // default to voice mode
      await avatar.current?.startVoiceChat({
        useSilencePrompt: false
      });
      setChatMode("voice_mode");
      console.log("i did run")
    } catch (error) {
      console.error("Error starting avatar session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  }
  
  async function handleSpeak(userInputValue?:string) {
    setIsLoadingRepeat(true);
    setDisplayRubricAnalytics(false);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
    return;
    }
  
    try {
      // Fetch LLM response
      // const response = await fetch(`/api/qnaResponse`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ chatHistory,startupIdea,hypothesis,targetAudience,selectedModel}),
      // });
      // const data = await response.json();
      // if (data.chatHistory !== undefined) setChatHistory(data.chatHistory);
      // if (data.filteredResponseContent !== undefined) setDisplayText(data.filteredResponseContent);

      // // Make the avatar speak the response
      // await avatar.current.speak({
      //   text: data.filteredResponseContent,
      //   taskType: TaskType.REPEAT,
      //   taskMode: TaskMode.SYNC,
      // });

      if(userInputValue) setUserInput(userInputValue)

    } catch (error) {
      console.error("Error fetching LLM response:", error);
      setDebug("Failed to fetch response from LLM");
    } finally {
      setIsLoadingRepeat(false);
    }
  }
  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    await avatar.current
      .interrupt()
      .catch((e) => {
        setDebug(e.message);
      });
  }

  const toggleSpeechToText = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setDebug('Speech Recognition API not supported in this browser');
      return;
    }

    if (!isRecording) {
      // Start recording
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = true;

      transcriptRef.current = ''; // Reset transcript

      recognition.onstart = () => {
        console.log('Speech recognition started');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const newTranscript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(' ');
        transcriptRef.current = newTranscript;
        console.log('Transcript updated:', transcriptRef.current);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setDebug(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        console.log('Speech recognition ended, current transcript:', transcriptRef.current);
        if (isRecording) {
          // Restart if ended unexpectedly
          console.log('Restarting recognition...');
          recognition.start();
        } else {
          // Stopped manually, update userInput and trigger speak
          setUserInput(transcriptRef.current || '');
          if (transcriptRef.current) {
            setUserInput(transcriptRef.current);
            // handleSpeak(transcriptRef.current);
            endSession();
          } else {
            setDebug('No speech detected');
          }
          recognitionRef.current = null;
        }
      };

      recognition.start();
      setIsRecording(true);
      setDebug('');
    } else {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
      }
    }
  };

  const resetAllStates=()=>{
    setFeedbackText('');
    setDisplayText('');
    setChatHistory([]);
    setRubricSummary('');
    setRubricJson(null);
    setRubricJson2(null);
    setSentimentScore(0);
    setRubricAllRatings(0);
    setSentimentJson(null);
    setRubricSpecificFeedback( {
      marketValidation: '',
      pitchDeck: '',
      oralPresentation: ''
    });
  }

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
  // Set loading state to true before starting the fetch
  setLoadingRubric(true);
  
  await avatar.current?.stopAvatar();
  setStream(undefined);

  try{
    const response = await fetch(`/api/pitchResponse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput:tempUserInput, chatHistory,selectedModel}),
    });
    const data = await response.json();
    if (data.chatHistory !== undefined) setChatHistory(data.chatHistory);
    if (data.sentimentSummary !== undefined) setFeedbackText(data.sentimentSummary);

    if(data.sentimentMetrics!==undefined && data.sentimentScore!==undefined){
        const updateSentimentJson=mergeJsons(sentimentJson,data.sentimentMetrics)
        setSentimentJson(updateSentimentJson);
        setSentimentScore((prevState) => {
            const newRating = data.sentimentScore || 0;
            console.log(data.sentimentScore,prevState,"sentimentRatings")
            return prevState + newRating; // Add the new rating to the previous state
        });
    }
    if (data.rubricSummary !== undefined) setRubricSummary(data.rubricSummary);
    if (data.rubricMetrics !== undefined) setRubricJson(data.rubricMetrics);
    if (data.rubricScore !== undefined) setRubricAllRatings(data.rubricScore);
    if (data.rubricSpecificFeedback !== undefined) setRubricSpecificFeedback(data.rubricSpecificFeedback);

    if (data.rubricSummary2 !== undefined) setRubricSummary2(data.rubricSummary2);
    if (data.rubricMetrics2 !== undefined) setRubricJson2(data.rubricMetrics2);
    if (data.rubricScore2 !== undefined) setRubricAllRatings2(data.rubricScore2);
    if (data.rubricSpecificFeedback2 !== undefined) setRubricSpecificFeedback2(data.rubricSpecificFeedback2);
    displayRubrics();

  } catch (error) {
    console.error('Error fetching pitch sentiment and rubric response:', error);
  } finally {
    // Set loading to false once the fetch is completed (either success or failure)
    setLoadingRubric(false);
  }

}

  console.log(rubricSummary,"rubricSummary",rubricJson,"rubricJson",rubricAllRatings,"rubricScore",rubricSpecificFeedback,"rubricSpecificFeedback")

  const displayRubrics= ()=> {
    setDisplayRubricAnalytics(true);
    console.log(displayRubricAnalytics,"im ended")
  }


  const handleChangeChatMode = useMemoizedFn(async (v) => {
    if (v === chatMode) {
      return;
    }
    if (v === "text_mode") {
      avatar.current?.closeVoiceChat();
    } else {
      await avatar.current?.startVoiceChat();
    }
    setChatMode(v);
  });

  const previousText = usePrevious(text);
  useEffect(() => {
    if (!previousText && text) {
      avatar.current?.startListening();
    } else if (previousText && !text) {
      avatar?.current?.stopListening();
    }
  }, [text, previousText]);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

  return (
    <div className="flex flex-col "style={{display:'flex',justifyContent:'center',alignItems:'center'}} >
      <Card className="w-screen h-screen overflow-hidden border-none rounded-none" style={{background: 'linear-gradient(to top, #987B8C, #F0C7C2)'}}>
        <CardBody className="flex flex-col justify-center items-center">
          {stream ? (
            <div className="w-full justify-center items-center flex overflow-hidden" style={{flexDirection:'column'}}>
              <video
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
              </video>
              <div className="flex flex-row gap-2 absolute top-3">
              <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300  text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={endSession}
                >
                  End session
                </Button>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center"style={{backgroundColor:'rgba(255,255,255,0.2)',borderRadius:'50px',padding:'2rem',maxHeight:'40%'}}>
              <div className="flex flex-col gap-2 w-full" style={{position:'relative'}} >
                {/* <Select
                  placeholder="Select Avatar"
                  size="md"
                  onChange={(e) => {
                    setAvatarId(e.target.value);
                  }}
                >
                  {AVATARS.map((avatar) => (
                    <SelectItem
                      key={avatar.avatar_id}
                      textValue={avatar.avatar_id}
                    >
                      {avatar.name}
                    </SelectItem>
                  ))}
                </Select> */}
                {/* <Select
                  label="Select language"
                  placeholder="Select language"
                  className="max-w-xs"
                  selectedKeys={[language]}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                  }}
                >
                  {STT_LANGUAGE_LIST.map((lang) => (
                    <SelectItem key={lang.key}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </Select> */}
                 <Input
                  placeholder="Paste HeyGen API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  />
                 <Select
                    placeholder="Select AI Model"
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

        { stream && <>
        <TypewriterText text={displayText} feedbackText={feedbackText} questionCount={questionCount}/>

        <div style={{width:'500px',margin:'auto',display:'flex',justifyContent:'center',alignItems:'center'}}>
          <div style={{display:!displayRubricAnalytics && !isLoadingSession?'flex':'none',width:'100%',justifyContent:'center',alignItems:'center'}}>
            <div style={{backgroundColor:'rgba(255,255,255,0.1)',textAlign:'center',padding:'1rem',maxWidth:'60%',minWidth:'30%',borderRadius:'10px',minHeight:'40px',position:'absolute',transform:'translate(-50%,-50%)',bottom:'9%',left:'50%'}}> 
              {isLoadingRepeat ? <Spinner style={{transform:'scale(0.7)',maxHeight:'6px' }}/> :  ""}{userInput} 
            </div>
         {/* { !hideSuggestions && suggestionOptions?.map((option, index) => (
            <Button
              key={index}
              onClick={() => 
                {
                  setUserInput(option); // Set the clicked suggestion as user input
                  handleSpeak(option);
                  setHideSuggestions(true);              
                }
              }
              isDisabled={isLoadingRepeat}
              style={{ margin: '0.5rem',background:'rgba(255,255,255,0.1)'}}
            >
              {option}
            </Button>
          ))} */}
          {/* {
          suggestionOptions.map((option, index) => (
            <Button
              key={index}
              onClick={() => {
                // Append to the userInput when an option is selected
                  setUserInput(prev => prev ? `${prev}, ${option}` : option);  // Concatenate the selected option

                  // Handle selected options in the selectedOptions state
                  setSelectedOptions(prev =>
                    prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
                  );
                }}
              isDisabled={isLoadingRepeat}
              style={{
                margin: '0.5rem',
                backgroundColor: selectedOptions.includes(option) ? 'blue' : 'white', // Highlight selected
                color: selectedOptions.includes(option) ? 'white' : 'black',
              }}
            >
              {option}
            </Button>
          ))
        } */}
        </div>
        </div>
        <div className="flex flex-col items-center" style={{flexDirection:'row',justifyContent:'center',marginBottom:'2rem',display:!displayRubricAnalytics &&!isLoadingSession?'flex':'none',}}>
          {/* Input field to capture user input */}
          <Button
            onClick={toggleSpeechToText}
            style={{ background:'rgba(255,255,255,0.1)',margin: '0.5rem' ,borderRadius:'100px'}}
          >
          {isRecording ? <div className={`wave`} />: <>Talk <Microphone size={14} /></>}
        </Button>
          {/* <Input
            placeholder="Type your message..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="w-50 text-sm p-2"
            style={{ backgroundColor:'rgba(255,255,255,0.1)'}}

            />
           <Button
           onClick={()=>handleSpeak()}
           isDisabled={!userInput.trim() || isLoadingRepeat}
           style={{ margin: '0.5rem',background:'rgba(255,255,255,0.1)'}}
            >
           {isLoadingRepeat ? <Spinner /> :  "Send"}
          </Button> */}
          <Button
            onClick={handleInterrupt}
            style={{ margin: '0.5rem',opacity:displayRubricAnalytics?'50%':'100%',background:'rgba(255,255,255,0.1)'}}
          >
            <Square weight="fill"/>
          </Button> 
        </div>
        </>
        }

        {sentimentJson && <FeedbackPieChart data={sentimentJson} overallScore={sentimentRatings} />}
        {rubricJson && rubricJson2 && <div style={{display:'flex',gap:'1rem',position:'absolute',top:'50%',left:'50%', backgroundColor:'rgba(50,51,52)',borderRadius:'50px',transform:'translate(-50%,-50%) scale(0.65)',padding:'2rem',width:'100%',maxHeight:'1100px',overflowY:'scroll'}}>
        {/* <RubricInvestorPiechart data={rubricJson} overallScore={rubricAllRatings} summary={rubricSummary} specificFeedback={rubricSpecificFeedback} resetAllStates={resetAllStates} totalRounds={0} chatHistory={chatHistory}></RubricInvestorPiechart> */}
         <RubricInvestorPiechart2 data={rubricJson2} overallScore={rubricAllRatings2} summary={rubricSummary2} specificFeedback={rubricSpecificFeedback2} resetAllStates={resetAllStates} totalRounds={0} chatHistory={chatHistory}></RubricInvestorPiechart2>
        </div>}
        {loadingRubric&&<Spinner 
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
          size="lg" />}
          
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
