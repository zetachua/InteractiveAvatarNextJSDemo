import type { StartAvatarResponse } from "@heygen/streaming-avatar";
import { AVATARS, STT_LANGUAGE_LIST } from "@/app/lib/constants";
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
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";
import './WaveAnimation.css';
import {models} from '../pages/api/configConstants'

import TypewriterText from "./Typewriter";
import { ChatHistory } from "./KnowledgeClasses";
import { Square,Microphone} from "@phosphor-icons/react";
import KnowledgeExamplePopup from "./PopupExamplesKnowledge";

export default function InteractiveAvatarKnowledge() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
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
  const [name,setName]=useState('');
  const [knowledge,setKnowledge]=useState('');
  const [tone,setTone]=useState('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<string>(''); 
  const [selectedModel, setSelectedModel] = useState<string>("Deepseek-R1-Distill-Llama-70b");

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
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
    return;
    }
  
    try {
      // Fetch LLM response
      setDisplayText('');
      let apiSource=selectedModel=="sao10k/l3.1-euryale-70b"?'knowledgeResponseOpenRouter':'knowledgeResponse';
      console.log('i ran here openrouter',selectedModel,apiSource)
      const response = await fetch(`/api/${apiSource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: userInputValue|| userInput, chatHistory, name, knowledge, tone,selectedModel}),
      });
      const data = await response.json();
      if (data.chatHistory !== undefined) setChatHistory(data.chatHistory);
      if (data.filteredResponseContent !== undefined) setDisplayText(data.filteredResponseContent);
      console.log('i ran here openrouter response',data.filteredResponseContent)

      // // Make the avatar speak the response
      await avatar.current.speak({
        text: data.filteredResponseContent,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC,
      });

      setUserInput('')
    } catch (error) {
      console.error("Error fetching LLM response:", error);
      setDebug("Failed to fetch response from LLM");
    } finally {
      setIsLoadingRepeat(false);
    }
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
            handleSpeak(transcriptRef.current);
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
    await avatar.current?.stopAvatar();
    setStream(undefined);
    setDisplayText('');
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

  useEffect(() => {
    console.log("selectedModel updated:", selectedModel);
  }, [selectedModel]);
  

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
            <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center"style={{backgroundColor:'rgba(255,255,255,0.2)',borderRadius:'50px',padding:'2rem',maxHeight:'60%'}}>
              <div className="flex flex-col gap-2 w-full"style={{position:'relative'}} >
                {/* <p className="text-sm font-medium leading-none">
                  Custom Knowledge ID (optional)
                </p>
                <Input
                  placeholder="Enter a custom knowledge ID"
                  value={knowledgeId}
                  onChange={(e) => setKnowledgeId(e.target.value)}
                /> */}
                {/* <p className="text-sm font-medium leading-none">
                  Custom Avatar ID (optional)
                </p>
                <Input
                  placeholder="Enter a custom avatar ID"
                  value={avatarId}
                  onChange={(e) => setAvatarId(e.target.value)}
                /> */}
                 <Input
                  placeholder="Paste HeyGen API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  />
                <Select
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
                </Select>
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
                
                   <Select
                      placeholder="Select AI Model"
                      size="md"
                      value={selectedModel}
                      onChange={(e) => {
                        const selectedValue = Number(e.target.value);
                        console.log("Selected model:", models[selectedValue]);
                        setSelectedModel(models[selectedValue]);

                      }} // Update selected model on change
                    >
                    {models.map((model, index) => (
                      <SelectItem key={index} value={model}>
                       {model}
                      </SelectItem>
                    ))}
                  </Select>
                  <p className="text-sm font-medium leading-none" style={{color:'#fafafa',marginTop:'1rem'}}>
                  </p>        
                  <KnowledgeExamplePopup></KnowledgeExamplePopup>                      
                <Input
                  placeholder="Name (Default: Baba Pete)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  />
                   <Input
                  placeholder="Knowledge (Default: all things Peranakan)"
                  value={knowledge}
                  onChange={(e) => setKnowledge(e.target.value)}
                  />
                   <Input
                  placeholder="Tone (Default: bubbly)"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  />
                 {/* <Select
                  placeholder="Select Group Name"
                  size="md"
                  value={groupName}
                  onChange={(e) => {
                    setGroupName(e.target.value);
                  }}
                >
                  {GROUPNAMES.map((group) => (
                    <SelectItem
                      key={group.groupName}
                      textValue={group.groupName}
                    >
                      {group.groupName}
                    </SelectItem>
                  ))}

                </Select> */}
                
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
      {stream && <>
       <TypewriterText text={displayText} feedbackText={''} questionCount={0}/>

        <div style={{width:'500px',margin:'auto',display:'flex',justifyContent:'center',alignItems:'center'}}>
          <div style={{display: 'flex',width:'100%',justifyContent:'center',alignItems:'center'}}>
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

        <div className="flex flex-col items-center" style={{flexDirection:'row',justifyContent:'center',marginBottom:'2rem',}}>
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
            style={{ margin: '0.5rem',background:'rgba(255,255,255,0.1)'}}
          >
            <Square weight="fill"/>
          </Button> 
        </div>
       </>
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
