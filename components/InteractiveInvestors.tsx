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
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import './TextArea.css';
import './WaveAnimation.css';
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
  RUBRIC_LABELS,
  splitSessionAndFrameworkCitations,
  type AnalyticsExportPayload,
  type InvestorVerdictSection,
  type PitchLeaderboardEntry,
} from "../utils/analyticsExport";

interface Pause {
  start: number;
  end: number;
}

/** Dark shell / panels — aligned with leaderboard & analytics modals. */
const DARK_PAGE_BG =
  'linear-gradient(165deg, #08080a 0%, #12131a 42%, #0c0b10 72%, #08080a 100%)';
const DARK_PANEL = {
  background: '#1a1b1e',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 18,
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
} as const;

/** Turn investor verdict prose into short bullet lines for readability. */
function splitInvestorVerdictLines(text: string): string[] {
  const t = text.trim();
  if (!t) return [];

  const stripMarker = (s: string) =>
    s
      .replace(/^[-*•]\s*/, '')
      .replace(/^\d+[\).]\s*/, '')
      .trim();

  const rawLines = t
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rawLines.length > 1) {
    return rawLines.map(stripMarker).filter(Boolean);
  }

  const single = rawLines[0] ?? t;
  const numbered = single.split(/\s+(?=\d+[\).]\s)/).map(stripMarker).filter(Boolean);
  if (numbered.length > 1) return numbered;

  const sentences = single
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length > 1) return sentences;

  return [single];
}

type MetricsSessionPayload = {
  rubricSummary2: string;
  rubricJson2: Rubric2InvestorData | null;
  rubricAllRatings2: number;
  rubricSpecificFeedback2: Rubric2InvestorSpecificData;
  competitorCounterplay2: string;
  citations: RubricCitationItem[];
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
  const [investorVerdictSections, setInvestorVerdictSections] = useState<InvestorVerdictSection[] | null>(null);
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
  /** Optional: only sent to `/api/get-access-token` when non-empty; otherwise the server uses `LIVEAVATAR_API_KEY` from `.env`. */
  const [avatarApiKey, setAvatarApiKey] = useState("");
  const [showAvatarApiKeyOverride, setShowAvatarApiKeyOverride] = useState(false);
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
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<PitchLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardExpandedId, setLeaderboardExpandedId] = useState<string | null>(null);
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
  const [audioAnalyticsLoading, setAudioAnalyticsLoading] = useState(false);
  const isAnyComparisonOpen =
    displayLookupPitch || displayGrantPitch || displayConcretePitch || displayMediVRPitch;

  /** At least one user message in chat — required before running analytics LLMs on end session. */
  const hasUserPitchContentForAnalytics = useMemo(
    () =>
      chatHistory.some(
        (m) => m.role === "user" && typeof m.content === "string" && m.content.trim().length > 0,
      ),
    [chatHistory],
  );

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

  useEffect(() => {
    if (debug !== 'Audio file processed successfully.') return;
    const t = window.setTimeout(() => {
      setDebug((prev) => (prev === 'Audio file processed successfully.' ? undefined : prev));
    }, 5000);
    return () => clearTimeout(t);
  }, [debug]);

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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const override = avatarApiKey.trim();
      if (override) {
        headers["x-api-key"] = override;
      }
      const response = await fetch("/api/get-access-token", {
        method: "POST",
        headers,
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
      setInvestorVerdictSections(null);
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

  const exitAnalyticsPage = () => {
    setLoadingRubric(false);
    setLoadingRubric1(false);
    setLoadingRubric2(false);
    resetAllStates();
    setStream(false);
  };

  const openLeaderboard = () => {
    setShowLeaderboardModal(true);
    setLeaderboardExpandedId(null);
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    fetch('/api/pitchAnalyticsLeaderboard')
      .then(async (r) => {
        const d = await r.json();
        setLeaderboardEntries(Array.isArray(d.entries) ? d.entries : []);
        if (d.error && typeof d.error === 'string') setLeaderboardError(d.error);
      })
      .catch(() => {
        setLeaderboardError('Could not load leaderboard.');
        setLeaderboardEntries([]);
      })
      .finally(() => setLeaderboardLoading(false));
  };

  const toggleSpeechToText = () => {
    if (isRecording) {
      setIsTimeUp(true);
      setAudioTranscribing(true);
      stopRecording();
    } else {
      startRecording();
    }
  };

  /** After Talk → stop: save MP3 (or WebM fallback) locally so users can re-upload if transcription fails. */
  const downloadRecordingBackupCopy = (webmBlob: Blob) => {
    if (!webmBlob || webmBlob.size === 0) return;
    void (async () => {
      try {
        const formData = new FormData();
        formData.append('file', webmBlob, 'recording.webm');
        const res = await fetch('/api/downloadRecordingAsMp3', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('mp3');
        const mp3Blob = await res.blob();
        const url = URL.createObjectURL(mp3Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pitch-retry-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.mp3`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        const url = URL.createObjectURL(webmBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pitch-retry-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setDebug(
          'Saved a WebM backup on your device (MP3 conversion unavailable). Use Upload Audio to retry.',
        );
      }
    })();
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
        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          downloadRecordingBackupCopy(blob);
          const formData = new FormData();
          formData.append('file', blob, 'audio.webm');
          const convertRes = await fetch('/api/convertWebmToWav', { method: 'POST', body: formData });
          const convertData = await convertRes.json();
          if (!convertRes.ok) throw new Error(convertData.error);
          await processConvertedAudio(convertData.outputFile);
        } catch (e) {
          console.error(e);
          setDebug(e instanceof Error ? e.message : 'Audio processing failed');
        } finally {
          setAudioTranscribing(false);
        }
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
    setAudioAnalyticsLoading(true);
    try {
      const [pronunciationRes, intonationRes, fluencyRes] = await Promise.all([
        fetch('/api/pronunciationAnalysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: outputFile, script: transcribedData.text }) }),
        fetch('/api/audioIntonationAnalysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: outputFile, script: transcribedData.text, segments: transcribedData.segments }) }),
        fetch('/api/audioFluencyAnalysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ segments: transcribedData.segments }) })
      ]);
      const [pronunciationData, intonationData, fluencyData] = await Promise.all([pronunciationRes.json(), intonationRes.json(), fluencyRes.json()]);
      if (!pronunciationRes.ok) throw new Error(pronunciationData.error);
      if (!intonationRes.ok) throw new Error(intonationData.error);
      if (!fluencyRes.ok) throw new Error(fluencyData.error);
      setAssessment({ pronunciation: pronunciationData, intonation: intonationData, fluency: fluencyData });
    } finally {
      setAudioAnalyticsLoading(false);
    }
  };

  const EMPTY_TRANSCRIPT_ALERT =
    'No speech was detected in that audio, so nothing was sent to the chat (saving an API call). Please try again: speak closer to the mic, reduce background noise, or use a slightly longer clip.';

  /** Transcribe WAV and optionally run voice assessment + send text to chat. Returns false when transcript is empty (no chat/API spend). */
  const processConvertedAudio = async (outputFile: string, runAssessmentInBackground = false): Promise<boolean> => {
    const transcribedRes = await fetch('/api/audioTranscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: outputFile }),
    });
    const transcribedData = await transcribedRes.json();
    if (!transcribedRes.ok) throw new Error(transcribedData.error || "Transcription failed");
    const transcriptText = typeof transcribedData?.text === 'string' ? transcribedData.text.trim() : '';
    if (!transcriptText) {
      setAudioTranscribing(false);
      window.alert(EMPTY_TRANSCRIPT_ALERT);
      return false;
    }
    setAudioTranscribing(false);
    handleSpeak(transcriptText);
    if (runAssessmentInBackground) {
      void runPitchAudioAssessment(outputFile, transcribedData).catch((e) => console.error("Background audio assessment failed:", e));
    } else {
      await runPitchAudioAssessment(outputFile, transcribedData);
    }
    return true;
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
      const hadTranscript = await processConvertedAudio(convertData.outputFile, true);
      if (hadTranscript) setDebug("Audio file processed successfully.");
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
    if (!hasUserPitchContentForAnalytics) {
      window.location.reload();
      return;
    }

    setStream(false);
    setIsBeginClock(false);
    setShowFeedbackModal(false);
    setAwaitingFeedbackAfterAnalytics(true);
    // Also end avatar session if active
    if (avatarRef.current) await endAvatarSession();
    try {
      const [sentimentPayload, metricsPayload] = await Promise.all([fetchSentiment(), fetchAllMetrics()]);
      if (metricsPayload) {
        const { text: verdictText, sections: verdictSections } = await requestInvestorVerdict(
          metricsPayload,
          sentimentPayload,
        );
        await persistPitchAnalyticsReportToSupabase(
          metricsPayload,
          sentimentPayload,
          verdictText,
          verdictSections,
          chatHistory,
          assessment,
          selectedModel,
        );
      }
    } catch (error) {
      console.error('Error fetching pitch sentiment and rubric response:', error);
    }
  }

  /** Inserts one row into `pitch_analytics_reports` (same shape as download HTML). */
  async function persistPitchAnalyticsReportToSupabase(
    metrics: MetricsSessionPayload,
    sentiment: SentimentSessionPayload | null,
    investorVerdictText: string,
    verdictSections: InvestorVerdictSection[] | null,
    chatHist: ChatHistory[],
    assess: { pronunciation: unknown; intonation: unknown; fluency: unknown },
    modelId: string,
  ) {
    const emptyMetrics = { clarity: 0, relevance: 0, depth: 0, neutrality: 0, engagement: 0 };
    const emptySpecific = { clarity: '', relevance: '', depth: '', neutrality: '', engagement: '' };
    const exportPayload: AnalyticsExportPayload = {
      rubricSummary: metrics.rubricSummary2,
      rubricOverallScore: metrics.rubricAllRatings2,
      rubricMetrics: metrics.rubricJson2,
      rubricSpecificFeedback: metrics.rubricSpecificFeedback2,
      citations: metrics.citations,
      competitorCounterplay: metrics.competitorCounterplay2,
      investorVerdict: investorVerdictText,
      investorVerdictSections: verdictSections && verdictSections.length > 0 ? verdictSections : undefined,
      sentimentScore: sentiment?.sentimentScore ?? 0,
      sentimentMetrics: sentiment?.sentimentMetrics ?? emptyMetrics,
      sentimentSummary: sentiment?.sentimentSummary ?? '',
      sentimentSpecificFeedback: sentiment?.sentimentSpecifics ?? emptySpecific,
      chatHistory: chatHist,
      assessment: assess,
    };
    const { combined } = splitSessionAndFrameworkCitations(exportPayload.citations);
    const html = buildAnalyticsReportHtml(exportPayload, "Pitch analytics report");
    try {
      const saveRes = await fetch("/api/savePitchAnalyticsReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          selectedModel: modelId,
          payload: {
            ...exportPayload,
            citationsCombinedCount: combined.length,
            generatedAt: new Date().toISOString(),
            source: "session_end_auto",
          },
        }),
      });
      if (!saveRes.ok) {
        const errBody = await saveRes.json().catch(() => ({}));
        console.warn("savePitchAnalyticsReport (auto):", saveRes.status, errBody);
      }
    } catch (e) {
      console.warn("savePitchAnalyticsReport (auto) failed:", e);
    }
  }

  const downloadAnalyticsPage = async () => {
    const sessionCitations = rubricCitations2 ?? [];
    const exportPayload: AnalyticsExportPayload = {
      rubricSummary: rubricSummary2,
      rubricOverallScore: rubricAllRatings2,
      rubricMetrics: rubricJson2,
      rubricSpecificFeedback: rubricSpecificFeedback2,
      citations: sessionCitations,
      competitorCounterplay: competitorCounterplay2,
      investorVerdict,
      investorVerdictSections: investorVerdictSections && investorVerdictSections.length > 0 ? investorVerdictSections : undefined,
      sentimentScore,
      sentimentMetrics,
      sentimentSummary: feedbackText,
      sentimentSpecificFeedback,
      chatHistory,
      assessment,
    };
    const html = buildAnalyticsReportHtml(exportPayload, "Pitch analytics report");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
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
  ): Promise<{ text: string; sections: InvestorVerdictSection[] | null }> => {
    setInvestorVerdict('');
    setInvestorVerdictSections(null);
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
      const text = typeof d.investorVerdict === 'string' ? d.investorVerdict.trim() : '';
      const rawSecs = d.investorVerdictSections;
      let sections: InvestorVerdictSection[] | null = null;
      if (Array.isArray(rawSecs) && rawSecs.length > 0) {
        const parsed: InvestorVerdictSection[] = [];
        for (const item of rawSecs) {
          if (!item || typeof item !== 'object') continue;
          const o = item as Record<string, unknown>;
          const heading = typeof o.heading === 'string' ? o.heading.trim() : '';
          const body = typeof o.body === 'string' ? o.body.trim() : '';
          if (heading && body) parsed.push({ heading, body });
        }
        if (parsed.length > 0) sections = parsed;
      }
      if (text) setInvestorVerdict(text);
      setInvestorVerdictSections(sections);
      return { text, sections };
    } catch (e) {
      console.warn('Investor verdict request failed:', e);
      return { text: '', sections: null };
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
        citations: dedupedCitations,
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
        <Card className="w-screen h-screen overflow-hidden border-none rounded-none" style={{ background: DARK_PAGE_BG }}>
          {!!debug && (
            <div style={{ position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)', zIndex: 2000, background: 'rgba(26,27,30,0.92)', color: '#e4e4e7', padding: '0.5rem 0.85rem', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
              {debug}
            </div>
          )}
          <CardBody className="flex flex-col justify-center items-center px-4 py-8">
            <div
              className="flex flex-col w-full max-w-md gap-5 self-center"
              style={{
                ...DARK_PANEL,
                padding: '2rem 1.75rem',
              }}
            >
              <div className="text-center space-y-2">
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#a5b4fc',
                    marginBottom: '0.35rem',
                  }}
                >
                  LiveAvatar · API
                </div>
                <h2 style={{ color: '#f4f4f5', fontWeight: 700, fontSize: '1.35rem', margin: 0, letterSpacing: '-0.02em' }}>
                  Setup avatar session
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarApiKeyOverride((v) => !v)}
                className="text-left w-full"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(199, 210, 254, 0.95)',
                  fontSize: '0.84rem',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '0.25rem 0',
                }}
              >
                {showAvatarApiKeyOverride ? 'Hide optional API key override' : 'Use a different API key (optional)'}
              </button>
              {showAvatarApiKeyOverride ? (
                <div className="w-full flex flex-col gap-2 rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(165,180,252,0.2)' }}>
                  <Input
                    placeholder="Paste LiveAvatar API key"
                    value={avatarApiKey}
                    onChange={(e) => setAvatarApiKey(e.target.value)}
                    classNames={{
                      input: 'text-sm text-zinc-100 placeholder:text-zinc-500',
                      inputWrapper: 'bg-zinc-900/80 border-zinc-600/80 data-[hover=true]:border-zinc-500 group-data-[focus=true]:border-indigo-400',
                    }}
                  />
                  <span style={{ fontSize: '0.76rem', color: 'rgba(228,228,231,0.72)', lineHeight: 1.45 }}>
                    Sent only to your server. Leave empty to keep using <code style={{ fontSize: '0.95em', color: '#c7d2fe' }}>LIVEAVATAR_API_KEY</code>.
                  </span>
                </div>
              ) : null}
              <div className="flex flex-col gap-3 w-full">
                <Button
                  className="w-full font-semibold text-white"
                  size="lg"
                  radius="lg"
                  variant="shadow"
                  style={{
                    minHeight: 52,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
                    boxShadow: '0 4px 20px rgba(79, 70, 229, 0.35)',
                  }}
                  onPress={async () => {
                    if (!selectedModel.trim()) {
                      const fallback = models.find((m) => m !== 'Sharktank') ?? models[0] ?? '';
                      if (fallback) setSelectedModel(fallback);
                    }
                    await startAvatarSession();
                    await startSession();
                  }}
                  isDisabled={isAvatarLoading || isLoadingSession}
                >
                  {(isAvatarLoading || isLoadingSession) ? <Spinner size="sm" color="white" /> : 'Start session with avatar'}
                </Button>
                <Button
                  variant="bordered"
                  radius="lg"
                  className="w-full text-zinc-200 border-zinc-600/80 hover:bg-white/5"
                  style={{ minHeight: 48 }}
                  onPress={() => setIsAvatarMode(false)}
                >
                  Back
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ─── Main session view ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Card className="w-screen h-screen overflow-hidden border-none rounded-none" style={{ background: DARK_PAGE_BG }}>
        {!!debug && (
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2000,
              background: 'rgba(26,27,30,0.92)',
              color: '#e4e4e7',
              padding: '0.5rem 0.85rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
          >
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
                  background: 'linear-gradient(180deg, #0c0d10 0%, #12131a 100%)',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
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
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, #12131a 0%, #16171d 55%, #14151a 100%)',
              }}>
                <Button
                  className="text-white rounded-lg font-semibold"
                  size="md"
                  variant="shadow"
                  onPress={() => void endSession()}
                  title={
                    hasUserPitchContentForAnalytics
                      ? undefined
                      : "No pitch in chat yet—click to reload the page and leave without using analytics APIs."
                  }
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
                    boxShadow: '0 4px 18px rgba(79, 70, 229, 0.35)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
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
                            backgroundColor: 'rgba(26,27,30,0.9)',
                            textAlign: "left",
                            padding: "0.5rem 0.5rem 0.5rem 1rem",
                            width: "400px",
                            fontSize: '14px',
                            color: audioTranscribing ? '#a1a1aa' : '#f4f4f5',
                            maxHeight: "70px",
                            minHeight: "20px",
                            overflowY: "scroll",
                            scrollbarWidth: "none",
                            borderRadius: "20px",
                            border: "1px solid rgba(255,255,255,0.12)",
                            outline: "none",
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
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
                          style={{
                            margin: '0rem 0rem 0rem 0.5rem',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#e4e4e7',
                            border: '1px solid rgba(255,255,255,0.12)',
                          }}
                        >
                          {isLoadingRepeat ? <Spinner /> : "Send"}
                        </Button>
                        <Button
                          onPress={toggleSpeechToText}
                          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                          style={{
                            background: isRecording ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.08)',
                            color: '#e4e4e7',
                            border: '1px solid rgba(255,255,255,0.12)',
                            margin: '0.5rem',
                            borderRadius: '100px',
                            minWidth: '5.5rem',
                          }}
                        >
                          {isRecording ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span className="wave" />
                              <span style={{ fontSize: 13 }}>Rec</span>
                            </span>
                          ) : (
                            <>
                              <Microphone size={14} /> Voice
                            </>
                          )}
                        </Button>
                        <Button
                          onPress={() => audioUploadRef.current?.click()}
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            color: '#e4e4e7',
                            border: '1px solid rgba(255,255,255,0.12)',
                            margin: '0.5rem',
                            borderRadius: '100px',
                          }}
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
                      <Introduction setIsBeginClock={setIsBeginClock} isAvatarMode={isAvatarMode} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : !isLoadingSession ? (
            // ── Landing: choose mode ──
            <div
              className="h-full justify-center items-center flex flex-col gap-5 w-full max-w-lg self-center px-4"
              style={{
                ...DARK_PANEL,
                padding: '2rem 1.75rem',
                maxHeight: 'min(520px, 88vh)',
              }}
            >
              <header style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#a5b4fc',
                    marginBottom: '0.65rem',
                  }}
                >
                  NUS · AI investor practice
                </div>
                <h1
                  style={{
                    color: '#f4f4f5',
                    fontWeight: 700,
                    fontSize: 'clamp(1.2rem, 2.8vw, 1.45rem)',
                    margin: '0 0 0.75rem',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                  }}
                >
                  Sharpen your pitch with NUS AI Investor
                </h1>
                <p
                  style={{
                    color: 'rgba(244,244,245,0.76)',
                    fontSize: '0.88rem',
                    lineHeight: 1.55,
                    margin: 0,
                    maxWidth: '420px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                >
                  Start a session below to rehearse with an AI investor—NUS-style rubric feedback plus delivery sentiment (and optional voice analytics when you record or upload audio).
                </p>
              </header>
              <Button
                className="w-full font-semibold text-white"
                size="lg"
                radius="lg"
                variant="shadow"
                style={{
                  minHeight: 50,
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
                  boxShadow: '0 4px 20px rgba(79, 70, 229, 0.35)',
                }}
                onPress={() => setIsAvatarMode(true)}
              >
                Start session with avatar
              </Button>
              <div className="flex flex-col gap-3 w-full">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    margin: '0.15rem 0',
                    opacity: 0.55,
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.14)' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', color: '#a1a1aa', textTransform: 'uppercase' }}>
                    Or
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.14)' }} />
                </div>
                <Button
                  className="w-full font-semibold text-zinc-100"
                  size="lg"
                  radius="lg"
                  variant="bordered"
                  style={{
                    minHeight: 50,
                    borderColor: 'rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.04)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                  onPress={startSession}
                >
                  Start session without avatar
                </Button>
              </div>
              <p
                style={{
                  margin: '0.25rem 0 0',
                  textAlign: 'center',
                  fontSize: '0.76rem',
                  lineHeight: 1.45,
                  color: 'rgba(228,228,231,0.65)',
                }}
              >
                Any issues? Email{' '}
                <a
                  href="mailto:zetachua@u.nus.edu.sg"
                  style={{ color: '#c7d2fe', textDecoration: 'underline', textUnderlineOffset: 2 }}
                >
                  zetachua@u.nus.edu.sg
                </a>
                .
              </p>
            </div>
          ) : (
            <Spinner color="white" size="lg" />
          )}
        </CardBody>

        {/* ── Evaluation overlay ── */}
        {(sentimentJson && rubricJson2 && !showFeedbackModal) ?
          <div
            id="evaluation"
            style={{
              fontSize: '0.8rem',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              padding: '2rem',
              width: '80%',
              maxHeight: '800px',
              minWidth: '600px',
              overflowY: 'scroll',
              scrollbarWidth: 'none',
              ...DARK_PANEL,
              borderRadius: 20,
            }}
          >
            <button
              type="button"
              onClick={exitAnalyticsPage}
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1250,
                border: 'none',
                borderRadius: '10px',
                background: 'rgba(248, 113, 113, 0.35)',
                color: '#fecaca',
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              Exit analytics page
            </button>
            <button
              type="button"
              onClick={openLeaderboard}
              style={{
                position: 'absolute',
                top: '16px',
                left: '20px',
                zIndex: 1250,
                border: 'none',
                borderRadius: '10px',
                background: 'rgba(129, 140, 248, 0.45)',
                color: '#e0e7ff',
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              Leaderboard
            </button>
            <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '0.5rem', zIndex: 1200 }}>
              <button
                type="button"
                style={{
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#e4e4e7',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '0.45rem 0.8rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
                onClick={downloadAnalyticsPage}
              >
                Download report
              </button>
              <button
                type="button"
                style={{
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#d4d4d8',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  padding: '0.45rem 0.8rem',
                  cursor: 'pointer',
                }}
                onClick={() => setShowChatHistoryModal(true)}
              >
                View ChatHistory
              </button>
            </div>
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginTop: '2.75rem',
                marginBottom: '1.25rem',
                padding: '0 1.5rem',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  marginBottom: '0.55rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '12px',
                  display: 'inline-block',
                  background: 'linear-gradient(90deg, rgba(79, 70, 229, 0.45), rgba(99, 102, 241, 0.3))',
                  color: '#f4f4f5',
                }}
              >
                Investor Verdict
              </div>
              {investorVerdictLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#e4e4e7', fontSize: '0.88rem' }}>
                  <Spinner size="sm" color="white" />
                  Synthesizing rubric and sentiment…
                </div>
              ) : investorVerdict?.trim() ? (
                investorVerdictSections && investorVerdictSections.length > 0 ? (
                  <div
                    style={{
                      maxWidth: '52rem',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    {investorVerdictSections.map((sec, idx) => (
                      <section
                        key={`verdict-sec-${idx}-${sec.heading.slice(0, 24)}`}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 12,
                          background: 'rgba(255,255,255,0.06)',
                          borderLeft: '3px solid rgba(165, 180, 252, 0.65)',
                        }}
                      >
                        <h3
                          style={{
                            margin: '0 0 0.4rem',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: '#c7d2fe',
                          }}
                        >
                          {sec.heading}
                        </h3>
                        <p style={{ margin: 0, lineHeight: 1.55, color: '#f4f4f5', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                          {sec.body}
                        </p>
                      </section>
                    ))}
                  </div>
                ) : (
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '1.35rem',
                      lineHeight: 1.55,
                      color: '#f4f4f5',
                      fontSize: '0.92rem',
                      maxWidth: '52rem',
                      textAlign: 'left',
                      listStyleType: 'disc',
                    }}
                  >
                    {splitInvestorVerdictLines(investorVerdict).map((line, idx) => (
                      <li key={`verdict-${idx}-${line.slice(0, 32)}`} style={{ marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
                        {line}
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#a1a1aa', maxWidth: '40rem' }}>
                  Verdict will appear here after the session ends and analysis completes.
                </p>
              )}
            </div>
            <div style={{ marginBottom: '0.8rem', color: '#e4e4e7', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Benchmark Comparison</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.88 }}>Toggle startup examples below to compare your analysis against reference pitches.</div>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
                overallScore={rubricAllRatings2}
                summary={rubricSummary2}
                specificFeedback={rubricSpecificFeedback2}
                resetAllStates={resetAllStates}
                totalRounds={0}
              />
              {(rubricCitations2 === null || loadingRubric1 || loadingRubric2 || loadingRubric) && (
                <div
                  role="presentation"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2500,
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '420px',
                      maxWidth: '92vw',
                      color: '#e4e4e7',
                      display: 'flex',
                      gap: '1rem',
                      flexDirection: 'column',
                      backgroundColor: '#1a1b1e',
                      borderRadius: '18px',
                      padding: '1.15rem',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.45, color: 'rgba(228,228,231,0.88)', fontStyle: 'italic' }}>
                      {ANALYTICS_LOADING_ROTATING_MESSAGES[analyticsLoadTipIndex % ANALYTICS_LOADING_ROTATING_MESSAGES.length]}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>{(rubricCitations2 === null || loadingRubric || loadingRubric1) ? <Spinner size="sm" color="white" /> : '✓ '}<span>{loadingRubric1 ? '[Loading Analysis]' : '[Successfully Loaded]'} Elevation Pitch, Team, Market Opportunity</span></div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>{(rubricCitations2 === null || loadingRubric || loadingRubric2) ? <Spinner size="sm" color="white" /> : '✓ '}<span>{loadingRubric2 ? '[Loading Analysis]' : '[Successfully Loaded]'} Market Size, Solution Value Proposition, Competitive Position</span></div>
                  </div>
                </div>
              )}
              {displayLookupPitch && <RubricInvestorPiechartExample title={'LookUp'} specificFeedback={lookupPitchRubrics()} />}
              {displayGrantPitch && <RubricInvestorPiechartExample title={'Grant'} specificFeedback={grantedPitchRubrics()} />}
              {displayMediVRPitch && <RubricInvestorPiechartExample title={'MediVR'} specificFeedback={mediVRPitchRubrics()} />}
              {displayConcretePitch && <RubricInvestorPiechartExample title={'Concrete'} specificFeedback={lookupPitchRubrics()} />}
              {!isAnyComparisonOpen && (
                <SentimentInvestorPiechart
                  pronunciationAssessment={assessment.pronunciation ?? undefined}
                  intonationAssessment={assessment.intonation ?? undefined}
                  fluencyAssessment={assessment.fluency ?? undefined}
                  audioAnalyticsLoading={audioAnalyticsLoading}
                  data={sentimentMetrics}
                  overallScore={sentimentScore}
                  feedbackSummary={feedbackText}
                  specificFeedback={sentimentSpecificFeedback}
                />
              )}
            </div>
          </div>
          : loadingRubric && (
          <div
            role="presentation"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2500,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <div
              style={{
                ...DARK_PANEL,
                color: '#e4e4e7',
                padding: '2rem',
                borderRadius: 18,
                width: 'min(420px, 88vw)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                textAlign: 'center',
                transform: 'scale(0.96)',
              }}
            >
              <Spinner size="lg" color="white" />
              {awaitingFeedbackAfterAnalytics ? (
                <p style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1.45, opacity: 0.92, maxWidth: '280px' }}>
                  {ANALYTICS_LOADING_ROTATING_MESSAGES[analyticsLoadTipIndex % ANALYTICS_LOADING_ROTATING_MESSAGES.length]}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </Card>

      {/* ── Feedback modal ── */}
      {showFeedbackModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '1rem',
          }}
        >
          <div style={{ width: "90%", maxWidth: "520px", borderRadius: "16px", padding: "1.2rem", color: "white", boxShadow: "0 12px 40px rgba(0,0,0,0.35)" }}>
            <h3 style={{ fontWeight: 700, marginBottom: "0.7rem" }}>Session Feedback</h3>
            <p style={{ fontSize: "0.85rem", marginBottom: "0.85rem", opacity: 0.92, lineHeight: 1.45 }}>
              Your feedback would greatly help us improve the experience.
            </p>
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
        <div
          role="presentation"
          onClick={() => setShowChatHistoryModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
            padding: "1rem",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '760px',
              maxHeight: '80vh',
              overflowY: 'auto',
              ...DARK_PANEL,
              padding: '1.15rem',
              color: '#f4f4f5',
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
              <h3 style={{ fontWeight: 700, margin: 0 }}>Chat History</h3>
              <Button size="sm" variant="flat" className="text-zinc-200" onClick={() => setShowChatHistoryModal(false)}>Close</Button>
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

      {/* ── Leaderboard (saved pitch analytics from Supabase; text only) ── */}
      {showLeaderboardModal && (
        <div
          role="presentation"
          onClick={() => setShowLeaderboardModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3100,
            padding: '1rem',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leaderboard-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '92%',
              maxWidth: '720px',
              maxHeight: '86vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: '#1a1b1e',
              borderRadius: '18px',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f4f4f5',
              boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.15rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
              }}
            >
              <div>
                <h3 id="leaderboard-title" style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>
                  Pitch leaderboard
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', opacity: 0.75, lineHeight: 1.4 }}>
                  Ranked by rubric overall score, then sentiment. Text analytics only (no voice).
                </p>
              </div>
              <Button size="sm" variant="flat" onPress={() => setShowLeaderboardModal(false)}>
                Close
              </Button>
            </div>
            <div style={{ overflowY: 'auto', padding: '0.75rem 1rem 1rem', flex: 1 }}>
              {leaderboardLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <Spinner color="default" />
                </div>
              ) : leaderboardError && leaderboardEntries.length === 0 ? (
                <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>{leaderboardError}</p>
              ) : leaderboardEntries.length === 0 ? (
                <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>No saved reports yet. End a session with pitch content to save to the database.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {leaderboardError ? (
                    <p style={{ fontSize: '0.78rem', color: '#fca5a5', margin: '0 0 0.35rem' }}>{leaderboardError}</p>
                  ) : null}
                  {leaderboardEntries.map((entry) => {
                    const expanded = leaderboardExpandedId === entry.id;
                    const medal = entry.rank === 1 ? '🥇 ' : entry.rank === 2 ? '🥈 ' : entry.rank === 3 ? '🥉 ' : '';
                    const when = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—';
                    return (
                      <div
                        key={entry.id}
                        style={{
                          borderRadius: '12px',
                          background: expanded ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${expanded ? 'rgba(165, 180, 252, 0.35)' : 'rgba(255,255,255,0.08)'}`,
                          overflow: 'hidden',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setLeaderboardExpandedId(expanded ? null : entry.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            padding: '0.65rem 0.85rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'inherit',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', minWidth: '2.5rem' }}>
                            {medal}#{entry.rank}
                          </span>
                          <span style={{ flex: 1, fontSize: '0.82rem', opacity: 0.9 }}>
                            <strong>Rubric</strong> {entry.rubricOverallScore.toFixed(1)}/10 · <strong>Sentiment</strong>{' '}
                            {entry.sentimentScore.toFixed(1)}/5
                            {entry.selectedModel ? ` · ${entry.selectedModel}` : ''}
                          </span>
                          <span style={{ fontSize: '0.72rem', opacity: 0.65, whiteSpace: 'nowrap' }}>{when}</span>
                          <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{expanded ? '▲' : '▼'}</span>
                        </button>
                        {expanded ? (
                          <div
                            style={{
                              padding: '0 0.85rem 0.85rem',
                              fontSize: '0.82rem',
                              lineHeight: 1.5,
                              borderTop: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            {entry.rubricSummary ? (
                              <>
                                <div style={{ fontWeight: 700, marginTop: '0.65rem', marginBottom: '0.35rem', color: '#c7d2fe' }}>
                                  Rubric summary
                                </div>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', opacity: 0.92 }}>{entry.rubricSummary}</p>
                              </>
                            ) : null}
                            {Object.keys(entry.rubricMetrics).length > 0 ? (
                              <>
                                <div style={{ fontWeight: 700, marginTop: '0.85rem', marginBottom: '0.35rem', color: '#c7d2fe' }}>
                                  Rubric scores
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.25rem 1rem', fontSize: '0.8rem' }}>
                                  {Object.entries(entry.rubricMetrics).map(([k, v]) => (
                                    <Fragment key={k}>
                                      <span style={{ opacity: 0.88 }}>{RUBRIC_LABELS[k] ?? k}</span>
                                      <span style={{ fontWeight: 600 }}>{v}/10</span>
                                    </Fragment>
                                  ))}
                                </div>
                              </>
                            ) : null}
                            {Object.keys(entry.rubricSpecificFeedback).length > 0 ? (
                              <>
                                <div style={{ fontWeight: 700, marginTop: '0.85rem', marginBottom: '0.35rem', color: '#c7d2fe' }}>
                                  Rubric feedback
                                </div>
                                {Object.entries(entry.rubricSpecificFeedback).map(([k, text]) => (
                                  <div key={k} style={{ marginBottom: '0.5rem' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.78rem', opacity: 0.85 }}>{RUBRIC_LABELS[k] ?? k}</div>
                                    <p style={{ margin: '0.15rem 0 0', whiteSpace: 'pre-wrap', opacity: 0.9 }}>{text}</p>
                                  </div>
                                ))}
                              </>
                            ) : null}
                            {entry.sentimentSummary ? (
                              <>
                                <div style={{ fontWeight: 700, marginTop: '0.85rem', marginBottom: '0.35rem', color: '#c7d2fe' }}>
                                  Sentiment summary
                                </div>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', opacity: 0.92 }}>{entry.sentimentSummary}</p>
                              </>
                            ) : null}
                            {entry.investorVerdictSections && entry.investorVerdictSections.length > 0 ? (
                              <>
                                <div style={{ fontWeight: 700, marginTop: '0.85rem', marginBottom: '0.35rem', color: '#c7d2fe' }}>
                                  Investor verdict
                                </div>
                                {entry.investorVerdictSections.map((sec, i) => (
                                  <div key={`${entry.id}-v-${i}`} style={{ marginBottom: '0.55rem' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#a5b4fc' }}>
                                      {sec.heading}
                                    </div>
                                    <p style={{ margin: '0.2rem 0 0', whiteSpace: 'pre-wrap', opacity: 0.9 }}>{sec.body}</p>
                                  </div>
                                ))}
                              </>
                            ) : entry.investorVerdict ? (
                              <>
                                <div style={{ fontWeight: 700, marginTop: '0.85rem', marginBottom: '0.35rem', color: '#c7d2fe' }}>
                                  Investor verdict
                                </div>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', opacity: 0.92 }}>{entry.investorVerdict}</p>
                              </>
                            ) : null}
                            {entry.competitorCounterplay?.trim() ? (
                              <>
                                <div style={{ fontWeight: 700, marginTop: '0.85rem', marginBottom: '0.35rem', color: '#c7d2fe' }}>
                                  Competitor counterplay
                                </div>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', opacity: 0.92 }}>{entry.competitorCounterplay}</p>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}