import { CommandEventsEnum, LiveAvatarSession, SessionEvent } from "@heygen/liveavatar-web-sdk";
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Spinner,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import './TextArea.css';

interface Pause {
  start: number;
  end: number;
}

import { ChatHistory, FeedbackData, FeedbackMetricData, FeedbackSpecificMetrics, Rubric2InvestorData, Rubric2InvestorSpecificData, RubricCitationItem, RubricInvestorData, RubricInvestorSpecificData } from "./KnowledgeClasses";
import { Microphone } from "@phosphor-icons/react";
import {
  ANALYTICS_LOADING_ROTATING_MESSAGES,
  CHAT_WAITING_ROTATING_MESSAGES,
  concretePitchRubrics,
  grantedPitchRubrics,
  lookupPitchRubrics,
  mediVRPitchRubrics,
  models,
} from '../pages/api/configConstants';
import RubricInvestorPiechart2 from "./RubricInvestorPieChart2";
import CountdownTimer from "./Countdown";
import SentimentInvestorPiechart from "./SentimentInvestorPieChart";
import ChatHistoryDisplay from "./ChatHistoryDisplay";
import RubricInvestorPiechartExample from "./RubricInvestorPieChartExample";
import Introduction from "./Introduction";
import {
  buildAnalyticsReportHtml,
  downloadHtmlFile,
  mergeRubricSummaries,
  splitSessionAndFrameworkCitations,
} from "../utils/analyticsExport";

type MetricsSessionPayload = {
  rubricSummary2: string;
  rubricJson2: Rubric2InvestorData | null;
  rubricAllRatings2: number;
  rubricSpecificFeedback2: Rubric2InvestorSpecificData;
  competitorCounterplay2: string;
};

/** Same topic the SDK uses for LiveKit agent commands (see @heygen/liveavatar-web-sdk `LIVEKIT_COMMAND_CHANNEL_TOPIC`). */
const LIVEKIT_AGENT_CONTROL_TOPIC = "agent-control";

type LiveAvatarInternalRoom = {
  state: string;
  localParticipant: {
    publishData: (data: Uint8Array, opts: { reliable: boolean; topic: string }) => Promise<void>;
  };
};

/**
 * Makes the LiveAvatar speak `text`. Uses LiveKit `publishData` so it works when the session
 * uses a control WebSocket (the SDK's `repeat()` path does not forward speak_text over WS).
 */
function sendAvatarSpeakText(session: LiveAvatarSession, rawText: unknown) {
  const text = String(rawText ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return;
  const maxLen = 3500;
  const payload = text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;

  try {
    session.interrupt();
  } catch {
    /* ignore — no utterance in progress or session edge case */
  }

  const room = (session as unknown as { room?: LiveAvatarInternalRoom }).room;
  if (room?.state === "connected") {
    const commandEvent = {
      event_id: crypto.randomUUID(),
      event_type: CommandEventsEnum.AVATAR_SPEAK_TEXT,
      text: payload,
    };
    const encoded = new TextEncoder().encode(JSON.stringify(commandEvent));
    void room.localParticipant
      .publishData(encoded, {
        reliable: true,
        topic: LIVEKIT_AGENT_CONTROL_TOPIC,
      })
      .catch((err) => console.warn("LiveAvatar speak_text publishData failed:", err));
    return;
  }

  try {
    session.repeat(payload);
  } catch (e) {
    console.warn("Avatar speak (repeat) failed:", e);
  }
}

export default function InteractiveInvestors() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [loadingRubric, setLoadingRubric] = useState(false);
  const [loadingRubric1, setLoadingRubric1] = useState(false);
  const [loadingRubric2, setLoadingRubric2] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState(false);
  const [debug, setDebug] = useState<string>();
  const [displayText, setDisplayText] = useState('');
  const [displayLookupPitch, setDisplayLookupPitch] = useState(false);
  const [displayGrantPitch, setDisplayGrantPitch] = useState(false);
  const [displayMediVRPitch, setDisplayMediVRPitch] = useState(false);
  const [displayConcretePitch, setDisplayConcretePitch] = useState(false);
  const [userInput, setUserInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [audioTranscribing, setAudioTranscribing] = useState(false);
  const [rubricSummary, setRubricSummary] = useState('');
  const [rubricSpecificFeedback, setRubricSpecificFeedback] = useState<RubricInvestorSpecificData>({
    marketValidation: '',
    pitchDeck: '',
    oralPresentation: ''
  });
  const [rubricSummary2, setRubricSummary2] = useState('');
  const [competitorCounterplay2, setCompetitorCounterplay2] = useState('');
  const [investorVerdict, setInvestorVerdict] = useState('');
  const [investorVerdictLoading, setInvestorVerdictLoading] = useState(false);
  const [rubricCitations2, setRubricCitations2] = useState<RubricCitationItem[] | null>(null);
  const [rubricSpecificFeedback2, setRubricSpecificFeedback2] = useState<Rubric2InvestorSpecificData>({
    elevatorPitch: '',
    team: '',
    marketOpportunity: '',
    marketSize: '',
    solutionValueProposition: '',
    competitivePosition: '',
    tractionAwards: '',
    revenueModel: '',
  });
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [sentimentJson, setSentimentJson] = useState<FeedbackData | null>(null);
  const [sentimentMetrics, setSentimentMetrics] = useState<FeedbackMetricData>({
    clarity: 0,
    relevance: 0,
    depth: 0,
    neutrality: 0,
    engagement: 0,
  });
  const [sentimentSpecificFeedback, setSentimentSpecificFeedback] = useState<FeedbackSpecificMetrics>({
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
  const [selectedModel, setSelectedModel] = useState<string>('Sharktank');
  const [timeLeft, setTimeLeft] = useState<number>(500);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [isBeginClock, setIsBeginClock] = useState<boolean>(false);
  const [isPitch, setIsPitch] = useState<boolean>(true);
  const [pauses, setPauses] = useState<any[]>([]);

  // Avatar states
  const [isAvatarMode, setIsAvatarMode] = useState<boolean>(false);
  const [avatarApiKey, setAvatarApiKey] = useState("");
  const [isAvatarConnected, setIsAvatarConnected] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<LiveAvatarSession | null>(null);
  const isAvatarModeRef = useRef(false);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  /** After End session: wait until analytics are ready, then 30s before session feedback modal. */
  const [awaitingFeedbackAfterAnalytics, setAwaitingFeedbackAfterAnalytics] = useState(false);
  const [chatWaitTipIndex, setChatWaitTipIndex] = useState(0);
  const [analyticsLoadTipIndex, setAnalyticsLoadTipIndex] = useState(0);
  const [emojiSatisfaction, setEmojiSatisfaction] = useState<"satisfied" | "neutral" | "dissatisfied" | "">("");
  const [feedbackReason, setFeedbackReason] = useState("");
  const [pitchUnderstandingScore, setPitchUnderstandingScore] = useState<number>(0);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitMessage, setFeedbackSubmitMessage] = useState("");
  const [showChatHistoryModal, setShowChatHistoryModal] = useState(false);
  const audioUploadRef = useRef<HTMLInputElement | null>(null);

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
    isAvatarModeRef.current = isAvatarMode;
  }, [isAvatarMode]);

  useEffect(() => {
    if (!isLoadingRepeat) return;
    const id = window.setInterval(() => {
      setChatWaitTipIndex((i) => (i + 1) % CHAT_WAITING_ROTATING_MESSAGES.length);
    }, 3200);
    return () => clearInterval(id);
  }, [isLoadingRepeat]);

  const analyticsLoadingAfterEndSession =
    awaitingFeedbackAfterAnalytics &&
    (!sentimentJson || !rubricJson2 || rubricCitations2 === null || loadingRubric);

  useEffect(() => {
    if (!analyticsLoadingAfterEndSession) return;
    const id = window.setInterval(() => {
      setAnalyticsLoadTipIndex((i) => (i + 1) % ANALYTICS_LOADING_ROTATING_MESSAGES.length);
    }, 3200);
    return () => clearInterval(id);
  }, [analyticsLoadingAfterEndSession]);

  useEffect(() => {
    if (!awaitingFeedbackAfterAnalytics) return;
    if (!sentimentJson || !rubricJson2) return;
    if (rubricCitations2 === null || loadingRubric) return;
    const t = window.setTimeout(() => {
      setShowFeedbackModal(true);
      setAwaitingFeedbackAfterAnalytics(false);
    }, 30000);
    return () => clearTimeout(t);
  }, [awaitingFeedbackAfterAnalytics, sentimentJson, rubricJson2, rubricCitations2, loadingRubric]);

  /** Extend session past the ~5min idle window (HTTP + LITE WebSocket keep_alive per LiveAvatar docs). */
  useEffect(() => {
    if (!isAvatarConnected || !avatarRef.current) return;
    const session = avatarRef.current;
    const ping = () => {
      void session.keepAlive().catch((err) => console.warn("LiveAvatar keepAlive:", err));
      const ws = (session as unknown as { _sessionEventSocket?: WebSocket })._sessionEventSocket;
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(
            JSON.stringify({
              type: "session.keep_alive",
              event_id: crypto.randomUUID(),
            }),
          );
        } catch {
          /* ignore */
        }
      }
    };
    ping();
    const id = setInterval(ping, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [isAvatarConnected]);

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

  // Attach stream once LiveKit has tracks AND the session UI has mounted the <video> (stream === true).
  // If we only listened to isAvatarConnected, attach would run on the setup screen where there is no video node.
  useEffect(() => {
    if (!stream || !isAvatarMode || !isAvatarConnected || !avatarRef.current || !avatarVideoRef.current) {
      return;
    }
    avatarRef.current.attach(avatarVideoRef.current);
    void avatarVideoRef.current.play().catch(() => {
      /* autoplay policies; attach still binds tracks */
    });
  }, [stream, isAvatarMode, isAvatarConnected]);

  async function fetchAvatarAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": avatarApiKey,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Access token request failed (${response.status})`);
      }
      return data?.sessionToken || "";
    } catch (error) {
      setDebug(`Avatar token error: ${error instanceof Error ? error.message : "Unknown error"}`);
      return "";
    }
  }

  async function startAvatarSession() {
    setIsAvatarLoading(true);
    const token = await fetchAvatarAccessToken();
    if (!token) {
      setIsAvatarLoading(false);
      return;
    }

    try {
      const session = new LiveAvatarSession(token, { voiceChat: false });
      avatarRef.current = session;

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        setIsAvatarConnected(true);
        // attach is called in the useEffect once isAvatarConnected flips + ref is ready
      });
      session.on(SessionEvent.SESSION_DISCONNECTED, () => {
        setIsAvatarConnected(false);
      });

      await session.start();
      setDebug("LiveAvatar session started.");
    } catch (error) {
      const errObj = error as any;
      const extra = errObj?.response?.data || errObj?.data || errObj?.body || errObj?.message || "Unknown error";
      setDebug(`Error starting avatar session: ${typeof extra === "string" ? extra : JSON.stringify(extra)}`);
    } finally {
      setIsAvatarLoading(false);
    }
  }

  async function endAvatarSession() {
    try {
      await avatarRef.current?.stop();
    } catch (error) {
      setDebug(`Error ending avatar session: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsAvatarConnected(false);
      avatarRef.current = null;
      setIsAvatarMode(false);
    }
  }

  async function startSession() {
    setLoadingRubric(false);
    setLoadingRubric1(false);
    setLoadingRubric2(false);
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

  async function handleSpeak(userInputValue?: string) {
    setIsLoadingRepeat(true);
    setIsTimeUp(true);
    if (userInputValue) {
      setUserInput(userInputValue);
    }
    try {
      const response = await fetch(`/api/qnaResponse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: userInputValue, chatHistory, selectedModel }),
      });
      const data = await response.json();
      if (data.chatHistory !== undefined) setChatHistory(data.chatHistory);
      if (data.questionResponse != null && data.questionResponse !== "") {
        setDisplayText(data.questionResponse);
        // Ref + microtask: fresh mode flag after await, and run after the current task so the room stays stable.
        const session = avatarRef.current;
        const reply = data.questionResponse;
        if (isAvatarModeRef.current && session) {
          queueMicrotask(() => sendAvatarSpeakText(session, reply));
        }
      }
    } catch (error) {
      console.error("Error fetching LLM response:", error);
      setDebug("Failed to fetch response from LLM");
    } finally {
      setIsLoadingRepeat(false);
    }
  }

  const resetAllStates = () => {
    setIsRecording(false);
    setTimeLeft(500);
    setIsTimeUp(false);
    setIsBeginClock(false);
    setIsPitch(true);
    setFeedbackText('');
    setDisplayText('');
    setChatHistory([]);
    setRubricSummary('');
    setRubricJson(null);
    setRubricJson2(null);
    setRubricSummary2('');
    setRubricAllRatings2(0);
    setRubricCitations2(null);
    setCompetitorCounterplay2('');
    setInvestorVerdict('');
    setInvestorVerdictLoading(false);
    setAwaitingFeedbackAfterAnalytics(false);
    setSentimentScore(0);
    setRubricAllRatings(0);
    setSentimentJson(null);
    setSentimentMetrics({ clarity: 0, relevance: 0, depth: 0, neutrality: 0, engagement: 0 });
    setSentimentSpecificFeedback({ clarity: "", relevance: "", depth: "", neutrality: "", engagement: "" });
    setRubricSpecificFeedback2({
      elevatorPitch: '',
      team: '',
      marketOpportunity: '',
      marketSize: '',
      solutionValueProposition: '',
      competitivePosition: '',
      tractionAwards: '',
      revenueModel: '',
    });
    setRubricSpecificFeedback({ marketValidation: '', pitchDeck: '', oralPresentation: '' });
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
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        const convertRes = await fetch('/api/convertWebmToWav', { method: 'POST', body: formData });
        const convertData = await convertRes.json();
        if (!convertRes.ok) throw new Error(convertData.error);
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
    const [pronunciationRes, intonationRes, fluencyRes] = await Promise.all([
      fetch('/api/pronunciationAnalysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: outputFile, script: transcribedData.text }) }),
      fetch('http://localhost:8000/intonationAnalysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: outputFile, script: transcribedData.text, segments: transcribedData.segments }) }),
      fetch('http://localhost:8000/fluencyAnalysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ segments: transcribedData.segments }) })
    ]);
    const [pronunciationData, intonationData, fluencyData] = await Promise.all([pronunciationRes.json(), intonationRes.json(), fluencyRes.json()]);
    if (!pronunciationRes.ok) throw new Error(pronunciationData.error);
    if (!intonationRes.ok) throw new Error(intonationData.error);
    if (!fluencyRes.ok) throw new Error(fluencyData.error);
    setAssessment({ pronunciation: pronunciationData, intonation: intonationData, fluency: fluencyData });
  };

  const processConvertedAudio = async (outputFile: string, runAssessmentInBackground = false) => {
    const transcribedRes = await fetch(`http://localhost:8000/transcribe?file=${encodeURIComponent(outputFile)}`, { method: 'POST' });
    const transcribedData = await transcribedRes.json();
    if (!transcribedRes.ok) throw new Error(transcribedData.error || "Transcription failed");
    setAudioTranscribing(false);
    handleSpeak(transcribedData.text);
    if (runAssessmentInBackground) {
      void runPitchAudioAssessment(outputFile, transcribedData).catch((e) => console.error("Background audio assessment failed:", e));
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
      const convertRes = await fetch('/api/convertWebmToWav', { method: 'POST', body: formData });
      const convertData = await convertRes.json();
      if (!convertRes.ok) throw new Error(convertData.error || "Audio conversion failed");
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
      if (typeof value1 === "number" && typeof value2 === "number") {
        mergedObj[key as keyof T] = (value1 + value2) as T[keyof T];
      } else if (typeof value2 === "number") {
        mergedObj[key as keyof T] = value2;
      }
    });
    return mergedObj;
  }

  async function endSession() {
    setStream(false);
    setIsBeginClock(false);
    setShowFeedbackModal(false);
    setAwaitingFeedbackAfterAnalytics(true);
    // Also end avatar session if active
    if (avatarRef.current) await endAvatarSession();
    try {
      const [sentimentPayload, metricsPayload] = await Promise.all([fetchSentiment(), fetchAllMetrics()]);
      if (metricsPayload) {
        await requestInvestorVerdict(metricsPayload, sentimentPayload);
      }
    } catch (error) {
      console.error('Error fetching pitch sentiment and rubric response:', error);
    }
  }

  const downloadAnalyticsPage = async () => {
    const sessionCitations = rubricCitations2 ?? [];
    const { combined } = splitSessionAndFrameworkCitations(sessionCitations);
    const exportPayload = {
      rubricSummary: rubricSummary2,
      rubricOverallScore: rubricAllRatings2,
      rubricMetrics: rubricJson2,
      rubricSpecificFeedback: rubricSpecificFeedback2,
      citations: sessionCitations,
      competitorCounterplay: competitorCounterplay2,
      investorVerdict,
      sentimentScore,
      sentimentMetrics,
      sentimentSummary: feedbackText,
      sentimentSpecificFeedback,
      chatHistory,
      assessment,
    };
    const html = buildAnalyticsReportHtml(exportPayload, "Pitch analytics report");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    try {
      const saveRes = await fetch("/api/savePitchAnalyticsReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          selectedModel: selectedModel,
          payload: {
            ...exportPayload,
            citationsCombinedCount: combined.length,
            generatedAt: new Date().toISOString(),
          },
        }),
      });
      if (!saveRes.ok) {
        const errBody = await saveRes.json().catch(() => ({}));
        console.warn("savePitchAnalyticsReport:", saveRes.status, errBody);
      }
    } catch (e) {
      console.warn("savePitchAnalyticsReport failed (download still proceeds):", e);
    }
    downloadHtmlFile(html, `pitch-analytics-${stamp}.html`);
  };

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
        body: JSON.stringify({ emojiSatisfaction, reason: feedbackReason, pitchUnderstandingScore, selectedModel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.details?.message || "Failed to submit feedback");
      setFeedbackSubmitMessage("Thanks! Feedback submitted.");
      setTimeout(() => {
        setShowFeedbackModal(false);
        setEmojiSatisfaction("");
        setFeedbackReason("");
        setPitchUnderstandingScore(0);
        setFeedbackSubmitMessage("");
      }, 800);
    } catch (error) {
      setFeedbackSubmitMessage(error instanceof Error ? error.message : "Could not submit feedback. Please try again.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  type SentimentSessionPayload = {
    sentimentScore: number;
    sentimentSummary: string;
    sentimentMetrics: FeedbackMetricData;
    sentimentSpecifics: FeedbackSpecificMetrics;
  };

  const requestInvestorVerdict = async (
    metrics: MetricsSessionPayload,
    sentiment: SentimentSessionPayload | null,
  ) => {
    setInvestorVerdict('');
    setInvestorVerdictLoading(true);
    try {
      const r = await fetch('/api/pitchInvestorVerdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rubricOverallScore: metrics.rubricAllRatings2,
          rubricSummary: metrics.rubricSummary2,
          rubricMetrics: metrics.rubricJson2,
          rubricSpecificFeedback: metrics.rubricSpecificFeedback2,
          sentimentOverallScore: sentiment?.sentimentScore ?? 0,
          sentimentSummary: sentiment?.sentimentSummary ?? '',
          sentimentMetrics: sentiment?.sentimentMetrics ?? {
            clarity: 0,
            relevance: 0,
            depth: 0,
            neutrality: 0,
            engagement: 0,
          },
        }),
      });
      const d = await r.json();
      if (typeof d.investorVerdict === 'string' && d.investorVerdict.trim()) {
        setInvestorVerdict(d.investorVerdict.trim());
      }
    } catch (e) {
      console.warn('Investor verdict request failed:', e);
    } finally {
      setInvestorVerdictLoading(false);
    }
  };

  const fetchSentiment = async (): Promise<SentimentSessionPayload | null> => {
    try {
      const responseSentiment = await fetch(`/api/pitchSentimentResponse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput, chatHistory, selectedModel }),
      });
      const dataSentiment = await responseSentiment.json();
      const sentimentSummary =
        typeof dataSentiment?.sentimentSummary === 'string' ? dataSentiment.sentimentSummary : '';
      const sentimentScore = typeof dataSentiment?.sentimentScore === 'number' ? dataSentiment.sentimentScore : 0;
      const sentimentMetricsNext: FeedbackMetricData = dataSentiment?.sentimentMetrics ?? {
        clarity: 0,
        relevance: 0,
        depth: 0,
        neutrality: 0,
        engagement: 0,
      };
      const sentimentSpecificsNext: FeedbackSpecificMetrics = dataSentiment?.sentimentSpecifics ?? {
        clarity: '',
        relevance: '',
        depth: '',
        neutrality: '',
        engagement: '',
      };

      if (dataSentiment?.sentimentSummary !== undefined) setFeedbackText(sentimentSummary);
      if (dataSentiment?.sentimentSpecifics !== undefined) setSentimentSpecificFeedback(sentimentSpecificsNext);
      if (dataSentiment?.sentimentMetrics !== undefined) {
        const prev = sentimentJson;
        const mergedMetrics = mergeJsons(
          {
            clarity: prev?.clarity ?? 0,
            relevance: prev?.relevance ?? 0,
            depth: prev?.depth ?? 0,
            neutrality: prev?.neutrality ?? 0,
            engagement: prev?.engagement ?? 0,
          },
          sentimentMetricsNext,
        );
        setSentimentJson({
          ...(prev ?? {
            overallScore: 0,
            feedbackSummary: '',
            specificFeedback: { clarity: '', relevance: '', depth: '', neutrality: '', engagement: '' },
          }),
          ...mergedMetrics,
        });
        setSentimentMetrics(sentimentMetricsNext);
      }
      if (dataSentiment.sentimentScore !== undefined) setSentimentScore(sentimentScore);

      return {
        sentimentScore,
        sentimentSummary,
        sentimentMetrics: sentimentMetricsNext,
        sentimentSpecifics: sentimentSpecificsNext,
      };
    } catch (e) {
      console.error('fetchSentiment', e);
      return null;
    }
  };

  const fetchAllMetrics = async (): Promise<MetricsSessionPayload | null> => {
    setLoadingRubric(true);
    setLoadingRubric1(true);
    setLoadingRubric2(true);
    setRubricCitations2(null);
    try {
      const [ragSonar] = await Promise.all([
        fetch(`/api/pitchEvaluationResponseRAG`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatHistory }) }),
      ]);
      const ragSonarJson = await ragSonar.json();
      const currentMarketStats = ragSonarJson.currentMarketStats;
      const [responseMetric1, responseMetric2] = await Promise.all([
        fetch(`/api/pitchEvaluationResponseMetric1`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentMarketStats, chatHistory }) }),
        fetch(`/api/pitchEvaluationResponseMetric2`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentMarketStats, chatHistory }) }),
      ]);
      const dataMetric1 = await responseMetric1.json();
      const dataMetric2 = await responseMetric2.json();
      if (dataMetric1) setLoadingRubric1(false);
      if (dataMetric2) setLoadingRubric2(false);
      const aggregatedSummary = mergeRubricSummaries([dataMetric1.rubricSummary2, dataMetric2.rubricSummary2]);
      const aggregatedMetrics = { ...dataMetric1.rubricMetrics2, ...dataMetric2.rubricMetrics2 };
      const rawCitationItems: RubricCitationItem[] = [
        ...(Array.isArray(dataMetric1.citationItems) ? dataMetric1.citationItems : []),
        ...(Array.isArray(dataMetric2.citationItems) ? dataMetric2.citationItems : []),
      ];
      const dedupedCitations = Array.from(new Map(rawCitationItems.map((c) => [c.url, c])).values());
      const scores = [dataMetric1.rubricScore2, dataMetric2.rubricScore2].filter(score => score !== 0);
      const aggregatedScores = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      const aggregatedFeedback = { ...(dataMetric1.rubricSpecificFeedback2 || {}), ...(dataMetric2.rubricSpecificFeedback2 || {}) };
      const counter =
        typeof dataMetric2.competitorCounterplay2 === 'string' ? dataMetric2.competitorCounterplay2 : '';
      if (aggregatedSummary) setRubricSummary2(aggregatedSummary);
      if (aggregatedMetrics) setRubricJson2(aggregatedMetrics);
      if (aggregatedScores) setRubricAllRatings2(aggregatedScores);
      if (aggregatedFeedback) setRubricSpecificFeedback2(aggregatedFeedback);
      setRubricCitations2(dedupedCitations);
      setCompetitorCounterplay2(counter);

      return {
        rubricSummary2: aggregatedSummary || '',
        rubricJson2: (aggregatedMetrics as Rubric2InvestorData) ?? null,
        rubricAllRatings2: aggregatedScores,
        rubricSpecificFeedback2: aggregatedFeedback as Rubric2InvestorSpecificData,
        competitorCounterplay2: counter,
      };
    } catch (e) {
      console.error('fetchAllMetrics', e);
      setRubricCitations2([]);
      return null;
    } finally {
      setLoadingRubric(false);
    }
  };

  // ─── Avatar setup screen (shown before session starts) ───────────────────
  if (isAvatarMode && !stream) {
    return (
      <div style={{ position: "relative" }}>
        <Card className="w-screen h-screen overflow-hidden border-none rounded-none" style={{ background: 'linear-gradient(to top, #987B8C, #F0C7C2)' }}>
          {!!debug && (
            <div style={{ position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)', zIndex: 2000, background: 'rgba(0,0,0,0.65)', color: 'white', padding: '0.5rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem' }}>
              {debug}
            </div>
          )}
          <CardBody className="flex flex-col justify-center items-center">
            <div className="h-full justify-center items-center flex flex-col gap-6 w-[500px] self-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50px', padding: '2rem', maxHeight: '50%' }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>Setup Avatar Session</div>
              <Input
                placeholder="Paste LiveAvatar API Key (or leave blank to use .env)"
                value={avatarApiKey}
                onChange={(e) => setAvatarApiKey(e.target.value)}
              />
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                size="md"
                variant="shadow"
                onClick={async () => {
                  if (!selectedModel.trim()) {
                    const fallback = models.find((m) => m !== 'Sharktank') ?? models[0] ?? '';
                    if (fallback) setSelectedModel(fallback);
                  }
                  await startAvatarSession();
                  await startSession();
                }}
                isDisabled={isAvatarLoading || isLoadingSession}
              >
                {(isAvatarLoading || isLoadingSession) ? <Spinner size="sm" color="white" /> : "Start Session with Avatar"}
              </Button>
              <Button variant="flat" onClick={() => setIsAvatarMode(false)}>
                Back
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ─── Main session view ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Card className="w-screen h-screen overflow-hidden border-none rounded-none" style={{ background: 'linear-gradient(to top, #987B8C, #F0C7C2)' }}>
        {!!debug && (
          <div style={{ position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)', zIndex: 2000, background: 'rgba(0,0,0,0.65)', color: 'white', padding: '0.5rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem' }}>
            {debug}
          </div>
        )}
        <CardBody className="flex flex-col justify-center items-center" style={{ padding: 0 }}>
          {stream ? (
            // ── Active session ──
            <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>

              {/* ── Left: Avatar portrait panel ── */}
              {isAvatarMode && (
                <div style={{
                  width: '700px',
                  minWidth: '260px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.25)',
                  borderRight: '1px solid rgba(255,255,255,0.15)',
                  position: 'relative',
                  flexShrink: 0,
                }}>
                  {isAvatarConnected ? (
                    <>
                      <video
                        ref={avatarVideoRef}
                        autoPlay
                        playsInline
                        muted={false}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '0',
                        }}
                      >
                        <track kind="captions" />
                      </video>
                      {/* Avatar name badge */}
                      <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                      }}>
                        June HR · AI Investor
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
                      <Spinner size="sm" color="white" />
                      <div style={{ marginTop: '0.5rem' }}>Connecting avatar...</div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Right: Chat panel ── */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={endSession}
                  style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
                >
                  End session
                </Button>

                <CountdownTimer
                  isTimeUp={isTimeUp}
                  timeLeft={timeLeft}
                  statusHint={
                    isLoadingRepeat ? CHAT_WAITING_ROTATING_MESSAGES[chatWaitTipIndex % CHAT_WAITING_ROTATING_MESSAGES.length] : undefined
                  }
                />

                <div className="w-full justify-center items-center flex overflow-hidden" style={{ flexDirection: 'column', marginTop: '50px' }}>
                  <ChatHistoryDisplay chatHistory={chatHistory} />
                  <div className="flex flex-col items-center" style={{ flexDirection: 'row' }}>
                    {isBeginClock ? (
                      <>
                        <textarea
                          placeholder="Type your message..."
                          value={audioTranscribing ? "Transcribing Your Audio..." : userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          className="custom-textarea"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            textAlign: "left",
                            padding: "0.5rem 0.5rem 0.5rem 1rem",
                            width: "400px",
                            fontSize: '14px',
                            color: audioTranscribing ? '#cdcdcd' : '#fff',
                            maxHeight: "70px",
                            minHeight: "20px",
                            overflowY: "scroll",
                            scrollbarWidth: "none",
                            borderRadius: "20px",
                            border: "none",
                            outline: "none",
                          }}
                        />
                        <Button
                          onPress={() => {
                            setIsTimeUp(true);
                            setIsPitch(false);
                            handleSpeak(userInput);
                            setUserInput('');
                          }}
                          isDisabled={!userInput.trim() || isLoadingRepeat}
                          style={{ margin: '0rem 0rem 0rem 0.5rem', background: 'rgba(255,255,255,0.1)' }}
                        >
                          {isLoadingRepeat ? <Spinner /> : "Send"}
                        </Button>
                        <Button
                          onClick={toggleSpeechToText}
                          style={{ background: 'rgba(255,255,255,0.1)', margin: '0.5rem', borderRadius: '100px' }}
                        >
                          {isRecording ? <div className={`wave`} /> : <><Microphone size={14} /> Talk</>}
                        </Button>
                        <Button
                          onClick={() => audioUploadRef.current?.click()}
                          style={{ background: 'rgba(255,255,255,0.1)', margin: '0.5rem', borderRadius: '100px' }}
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
              </div>
            </div>
          ) : !isLoadingSession ? (
            // ── Landing: choose mode ──
            <div className="h-full justify-center items-center flex flex-col gap-4 w-[500px] self-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50px', padding: '2rem', maxHeight: '30%' }}>
               {/* <Select
                  placeholder="Select an AI Model"
                  size="md"
                  value={selectedModel}
                  onChange={(e) => {
                    const selectedValue = Number(e.target.value);
                    setSelectedModel(models[selectedValue]);
                  }}
                >
                  {models.map((model, index) => (
                    <SelectItem key={index} value={model}>{model}</SelectItem>
                  ))}
                </Select> */}
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white w-full"
                size="md"
                style={{minHeight: '40px'}}
                variant="shadow"
                onClick={() => setIsAvatarMode(true)}
              >
                Start Session with Avatar
              </Button>
             
              <div className="flex flex-col gap-2 w-full">
                <div style={{ fontSize: '0.9rem', textAlign: 'center', fontWeight: '500', color: 'white' }}>Or</div>
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

        {/* ── Evaluation overlay ── */}
        {(sentimentJson && rubricJson2 && !showFeedbackModal) ?
          <div id='evaluation' style={{ fontSize: '0.8rem', position: 'absolute', top: '50%', left: '50%', backgroundColor: 'rgba(50,51,52)', borderRadius: '50px', transform: 'translate(-50%,-50%)', padding: '2rem', width: '80%', maxHeight: '900px', minWidth: '600px', overflowY: 'scroll', scrollbarWidth: 'none' }}>
            <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '0.5rem', zIndex: 1200 }}>
              <button
                type="button"
                style={{ border: 'none', borderRadius: '10px', background: 'rgba(255,255,255,0.55)', color: '#1a1a1a', fontSize: '0.8rem', fontWeight: 600, padding: '0.45rem 0.8rem' }}
                onClick={downloadAnalyticsPage}
              >
                Download report
              </button>
              <button
                type="button"
                style={{ border: 'none', borderRadius: '10px', background: 'rgba(255,255,255,0.4)', color: '#fff', fontSize: '0.8rem', fontWeight: '500', padding: '0.45rem 0.8rem' }}
                onClick={() => setShowChatHistoryModal(true)}
              >
                View ChatHistory
              </button>
            </div>
            <div style={{ marginBottom: '0.8rem', color: 'white' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Benchmark Comparison</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Toggle startup examples below to compare your analysis against reference pitches.</div>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              {[
                { label: 'LookUp', state: displayLookupPitch, setter: setDisplayLookupPitch },
                { label: 'Grant', state: displayGrantPitch, setter: setDisplayGrantPitch },
                { label: 'Concrete AI', state: displayConcretePitch, setter: setDisplayConcretePitch },
                { label: 'MediVR', state: displayMediVRPitch, setter: setDisplayMediVRPitch },
              ].map(({ label, state, setter }) => (
                <Button key={label} onClick={() => setter(!state)} className={`text-white ${!state ? 'bg-transparent border border-indigo-500' : 'bg-gradient-to-tr from-indigo-500 to-indigo-300'}`} size="sm" variant="shadow">
                  {label}
                </Button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'start' }}>
              <RubricInvestorPiechart2
                citationItems={rubricCitations2 ?? undefined}
                competitorCounterplay={competitorCounterplay2}
                data={rubricJson2}
                investorVerdict={investorVerdict}
                investorVerdictLoading={investorVerdictLoading}
                overallScore={rubricAllRatings2}
                summary={rubricSummary2}
                specificFeedback={rubricSpecificFeedback2}
                resetAllStates={resetAllStates}
                totalRounds={0}
              />
              {(rubricCitations2 === null || loadingRubric1 || loadingRubric2 || loadingRubric) &&
                <div style={{ position: 'absolute', width: '420px', maxWidth: '92vw', zIndex: '2000', color: 'black', display: 'flex', gap: '1rem', flexDirection: 'column', backgroundColor: 'rgba(255,255,255)', borderRadius: '20px', padding: '1rem', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', boxShadow: '2px 2px 0px 0px black' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.4, color: '#333', fontStyle: 'italic' }}>
                    {ANALYTICS_LOADING_ROTATING_MESSAGES[analyticsLoadTipIndex % ANALYTICS_LOADING_ROTATING_MESSAGES.length]}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem' }}>{(rubricCitations2 === null || loadingRubric || loadingRubric1) ? <Spinner /> : "! "}<span>{loadingRubric1 ? '[Loading Analysis]' : '[Successfully Loaded]'} Elevation Pitch, Team, Market Opportunity</span></div>
                  <div style={{ display: 'flex', gap: '1rem' }}>{(rubricCitations2 === null || loadingRubric || loadingRubric2) ? <Spinner /> : "! "}<span>{loadingRubric2 ? '[Loading Analysis]' : '[Successfully Loaded]'} Market Size, Solution Value Proposition, Competitive Position</span></div>
                </div>
              }
              {displayLookupPitch && <RubricInvestorPiechartExample title={'LookUp'} specificFeedback={lookupPitchRubrics()} />}
              {displayGrantPitch && <RubricInvestorPiechartExample title={'Grant'} specificFeedback={grantedPitchRubrics()} />}
              {displayMediVRPitch && <RubricInvestorPiechartExample title={'MediVR'} specificFeedback={mediVRPitchRubrics()} />}
              {displayConcretePitch && <RubricInvestorPiechartExample title={'Concrete'} specificFeedback={lookupPitchRubrics()} />}
              {!isAnyComparisonOpen && (
                <SentimentInvestorPiechart
                  pronunciationAssessment={assessment.pronunciation ?? undefined}
                  intonationAssessment={assessment.intonation ?? undefined}
                  fluencyAssessment={assessment.fluency ?? undefined}
                  data={sentimentMetrics}
                  overallScore={sentimentScore}
                  feedbackSummary={feedbackText}
                  specificFeedback={sentimentSpecificFeedback}
                />
              )}
            </div>
          </div>
          : loadingRubric &&
          <div
            style={{
              color: 'white',
              background: 'rgba(50,51,52)',
              padding: '2rem',
              borderRadius: '50px',
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%,-50%) scale(0.6)',
              width: 'min(420px, 88vw)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              textAlign: 'center',
            }}
          >
            <Spinner size="lg" />
            {awaitingFeedbackAfterAnalytics ? (
              <p style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1.45, opacity: 0.92, maxWidth: '280px' }}>
                {ANALYTICS_LOADING_ROTATING_MESSAGES[analyticsLoadTipIndex % ANALYTICS_LOADING_ROTATING_MESSAGES.length]}
              </p>
            ) : null}
          </div>
        }
      </Card>

      {/* ── Feedback modal ── */}
      {showFeedbackModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
          <div style={{ width: "90%", maxWidth: "520px", background: "#1f1f1f", borderRadius: "16px", padding: "1.2rem", color: "white" }}>
            <h3 style={{ fontWeight: 700, marginBottom: "0.7rem" }}>Session Feedback</h3>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.7rem" }}>1) Emoji satisfaction</p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.9rem" }}>
              {[{ key: "satisfied", label: "Satisfied", cls: "bg-green-500 text-white" }, { key: "neutral", label: "Neutral", cls: "bg-yellow-500 text-black" }, { key: "dissatisfied", label: "Dissatisfied", cls: "bg-red-500 text-white" }].map(({ key, label, cls }) => (
                <Button key={key} size="sm" onClick={() => setEmojiSatisfaction(key as any)} className={emojiSatisfaction === key ? cls : ""}>{label}</Button>
              ))}
            </div>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.4rem" }}>2) Short reason</p>
            <textarea value={feedbackReason} onChange={(e) => setFeedbackReason(e.target.value)} placeholder="Tell us briefly why..." style={{ width: "100%", minHeight: "80px", borderRadius: "10px", background: "#2f2f2f", color: "white", border: "1px solid #555", padding: "0.6rem", marginBottom: "0.9rem" }} />
            <p style={{ fontSize: "0.9rem", marginBottom: "0.4rem" }}>3) Improvement in business pitch understanding (1-5)</p>
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5].map((score) => (
                <Button key={score} size="sm" onClick={() => setPitchUnderstandingScore(score)} className={pitchUnderstandingScore === score ? "bg-indigo-500 text-white" : ""}>{score}</Button>
              ))}
            </div>
            {!!feedbackSubmitMessage && <p style={{ fontSize: "0.85rem", marginBottom: "0.6rem" }}>{feedbackSubmitMessage}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <Button variant="flat" onClick={() => setShowFeedbackModal(false)} isDisabled={isSubmittingFeedback}>Skip</Button>
              <Button className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white" onClick={submitSessionFeedback} isDisabled={isSubmittingFeedback}>
                {isSubmittingFeedback ? <Spinner size="sm" color="white" /> : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat history modal ── */}
      {showChatHistoryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
          <div style={{ width: "90%", maxWidth: "760px", maxHeight: "80vh", overflowY: "auto", background: "#1f1f1f", borderRadius: "16px", padding: "1rem", color: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
              <h3 style={{ fontWeight: 700 }}>Chat History</h3>
              <Button size="sm" variant="flat" onClick={() => setShowChatHistoryModal(false)}>Close</Button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {chatHistory.length === 0 ? (
                <p style={{ opacity: 0.8 }}>No chat history available yet.</p>
              ) : (
                chatHistory.map((message, index) => (
                  <div key={`${message.role}-${index}`} style={{ background: "rgba(255,255,255,0.08)", borderRadius: "10px", padding: "0.7rem", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
                    <b style={{ textTransform: "capitalize" }}>{message.role}:</b> {message.content}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}