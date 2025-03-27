import { useState, useEffect, useRef } from "react";

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
      className="text-white font-mono"
      style={{
        width: "50%",
        height: "600px", // Increased height for better visibility
        position: "absolute",
        left: "50%",
        bottom: "9rem",
        transform: "translateX(-50%)",
        padding: "1rem",
        overflowY: "auto",
        scrollbarWidth: "none", // Firefox
        msOverflowStyle: "none", // IE/Edge
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        boxShadow: "2px 2px 0px 0px rgba(0, 0, 0, 0.3)",
        borderRadius: "20px",
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
                  ? "rgba(0, 128, 255, 0.8)" // Blue for user
                  : "rgba(50, 50, 50, 0.8)", // Gray for assistant
              color: "white",
              fontSize: "14px",
            }}
          >
            {message.content}
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