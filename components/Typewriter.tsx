import { Divider } from "@nextui-org/react";
import { useState, useEffect, useRef } from "react";

interface TypewriterTextProps {
  text: string;
  feedbackText: string;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, feedbackText }) => {
  const [displayedText, setDisplayedText] = useState<string>("");
  const [displayedFeedback, setDisplayedFeedback] = useState<string>(""); // Feedback state
  const wordsRef = useRef<string[]>([]); // Store words for response
  const feedbackWordsRef = useRef<string[]>([]); // Store words for feedback
  const indexRef = useRef<number>(0); // Index for response text
  const feedbackIndexRef = useRef<number>(0); // Index for feedback text
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Interval for response text typing
  const feedbackIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval for feedback text typing
  const containerRef = useRef<HTMLDivElement | null>(null); // Reference to container

  // Response typing effect
  useEffect(() => {
    if (!text) {
      setDisplayedText(""); // Reset if text is empty
      wordsRef.current = [];
      return;
    }

    const words = text.split(" "); // Split text into words
    wordsRef.current = []; // Clear previous words
    indexRef.current = 0; // Reset index

    if (intervalRef.current) clearInterval(intervalRef.current); // Clear any previous interval

    intervalRef.current = setInterval(() => {
      if (indexRef.current < words.length) {
        wordsRef.current.push(words[indexRef.current]); // Add new word
        setDisplayedText(wordsRef.current.join(" ")); // Update state
        indexRef.current++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // After finishing typing the response, start typing the feedback
        startFeedbackTyping();
      }
    }, 200); // Adjust speed here (word delay)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  // Feedback typing effect
  const startFeedbackTyping = () => {
    const feedbackWords = feedbackText.split(" "); // Split feedback text into words
    feedbackWordsRef.current = []; // Clear previous feedback words
    feedbackIndexRef.current = 0; // Reset index for feedback

    if (feedbackIntervalRef.current) clearInterval(feedbackIntervalRef.current); // Clear any previous feedback interval

    feedbackIntervalRef.current = setInterval(() => {
      if (feedbackIndexRef.current < feedbackWords.length) {
        feedbackWordsRef.current.push(feedbackWords[feedbackIndexRef.current]); // Add new word to feedback
        setDisplayedFeedback(feedbackWordsRef.current.join(" ")); // Update feedback state
        feedbackIndexRef.current++;
      } else {
        if (feedbackIntervalRef.current) clearInterval(feedbackIntervalRef.current);
      }
    }, 200); // Adjust speed here (word delay)
  };

  // Auto-scroll to the bottom after each text update
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedText, displayedFeedback]); // Scroll when either response or feedback updates

  return (
    <div
      ref={containerRef} // Assign ref to the container
      className="text-white text-lg font-mono"
      style={{
        padding: "1rem",
        fontSize: "14px",
        textAlign: "left",
        height: "200px", // Set fixed height
        overflowY: "auto", // Enable vertical scrolling
        backgroundColor: "#1e1e1e", // Optional: Set a background for contrast
        border: "1px solid #444", // Optional: Add a border to the container
      }}
    >
      <div style={{ marginBottom: "1rem" }}>
        <strong>Response:</strong> <span>{displayedText}</span>
      </div>

      <Divider style={{ margin: "1rem 0" }} /> {/* Adjust divider spacing */}

      <div>
        <strong>Feedback:</strong> <span>{displayedFeedback}</span>
      </div>
    </div>
  );
};

export default TypewriterText;
