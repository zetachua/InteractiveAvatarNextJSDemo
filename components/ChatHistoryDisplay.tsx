import { useState, useEffect, useRef } from "react";
import TypewriterText from "./Typewriter";
import TypewriterTextNoAvatar from "./TypewriterNoAvatar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatHistoryProps {
  chatHistory: Message[];
}

const ChatHistoryDisplay: React.FC<ChatHistoryProps> = ({ chatHistory }) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom whenever chatHistory updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return (
    <div
      ref={chatContainerRef}
      className="text-zinc-100 font-mono"
      style={{
        margin: "1rem",
        width: "min(720px, 92%)",
        height: "600px",
        padding: "1rem",
        overflowY: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        backgroundColor: "rgba(26, 27, 30, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35)",
        borderRadius: "18px",
      }}
    >
      {chatHistory.map((message, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: message.role === "user" ? "flex-end" : "flex-start",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              maxWidth: "70%",
              padding: "0.75rem",
              borderRadius: "12px",
              backgroundColor:
                message.role === "user"
                  ? "rgba(99, 102, 241, 0.35)"
                  : "rgba(255, 255, 255, 0.06)",
              border:
                message.role === "user"
                  ? "1px solid rgba(165, 180, 252, 0.35)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
              color: "#f4f4f5",
              fontSize: "14px",
            }}
          >
            {message.role === "assistant" ? (
              <TypewriterTextNoAvatar text={message.content} />
            ) : (
              message.content
            )}
          </div>
        </div>
      ))}
      <style>
        {`
          div::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
        `}
      </style>
    </div>
  );
};

export default ChatHistoryDisplay;