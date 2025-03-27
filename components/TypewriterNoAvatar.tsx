import { useState, useEffect, useRef } from "react";

interface TypewriterTextProps {
  text: string;
  feedbackText?: string;
}

const TypewriterTextNoAvatar: React.FC<TypewriterTextProps> = ({ text, feedbackText }) => {
  const [displayedText, setDisplayedText] = useState<string>("");
  const [displayedFeedback, setDisplayedFeedback] = useState<string>(""); // Feedback state
  const wordsRef = useRef<string[]>([]); // Store words for response
  const feedbackWordsRef = useRef<string[]>([]); // Store words for feedback
  const indexRef = useRef<number>(0); // Index for response text
  const feedbackIndexRef = useRef<number>(0); // Index for feedback text
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Interval for response text typing
  const feedbackIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval for feedback text typing
  const containerRef = useRef<HTMLDivElement | null>(null); // Reference to container

  // Response typing effect with delay
  useEffect(() => {
    if (!text) {
      setDisplayedText(""); 
      wordsRef.current = [];
      return;
    }

    setDisplayedFeedback("");

    const words = text.split(" ");
    wordsRef.current = [];
    indexRef.current = 0;

    const typingDelay = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current); 

      intervalRef.current = setInterval(() => {
        if (indexRef.current < words.length) {
          wordsRef.current.push(words[indexRef.current]); 
          setDisplayedText(wordsRef.current.join(" ")); 
          indexRef.current++;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          startFeedbackTyping();
        }
      }, 200);
    }, 500);

    return () => {
      clearTimeout(typingDelay); 
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  // Feedback typing effect
  const startFeedbackTyping = () => {
    if(!feedbackText) return;
    const feedbackWords = feedbackText?.split(" ");
    feedbackWordsRef.current = [];
    feedbackIndexRef.current = 0;

    if (feedbackIntervalRef.current) clearInterval(feedbackIntervalRef.current);

    feedbackIntervalRef.current = setInterval(() => {
      if (feedbackIndexRef.current < feedbackWords.length) {
        feedbackWordsRef.current.push(feedbackWords[feedbackIndexRef.current]); 
        setDisplayedFeedback(feedbackWordsRef.current.join(" "));
        feedbackIndexRef.current++;
      } else {
        if (feedbackIntervalRef.current) clearInterval(feedbackIntervalRef.current);
      }
    }, 200);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedText, displayedFeedback]);

  return (
    <div
      ref={containerRef}
      className="text-white text-lg font-mono"
      style={{
        fontSize: "14px",
      }}
    >
      <div>
        <span>{displayedText}</span>
      </div>

      {/* <Divider style={{ margin: "1rem 0" }} />

      {questionCount!==undefined && questionCount>2 &&
      <div>
        <strong>Feedback:</strong> <span>{displayedFeedback}</span>
      </div>
      } */}
    </div>
  );
};

export default TypewriterTextNoAvatar;
