interface CountdownTimerProps {
    timeLeft: number;
    isTimeUp: boolean;
    /** Shown under the timer (e.g. rotating status while the AI reply loads). */
    statusHint?: string;
  }
  
  const CountdownTimer = ({ timeLeft, isTimeUp, statusHint }: CountdownTimerProps) => {
    const formatTime = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    };
  
    return (
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.8rem 1rem",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "18px",
          background: "rgba(22, 23, 26, 0.45)",
          color: "white",
          minWidth: "190px",
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
          zIndex: 1000,
        }}
      >
        {statusHint ? (
          <p
            style={{
              fontSize: "0.72rem",
              fontWeight: 500,
              marginTop: "1rem",
              marginBottom:"1.5rem",
              textAlign: "center",
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.88)",
              maxWidth: "200px",
            }}
          >
            {statusHint}
          </p>
        ) : null}
        <h2 style={{ fontSize: "0.92rem", fontWeight: 700, textAlign: "center", marginBottom: "0.2rem" }}>
          Pitch Countdown Timer
        </h2>
        {isTimeUp ? (
          <p style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: "0.2rem", color: "#5cf7a0" }}>Q&A Time!</p>
        ) : (
          <p style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: "0.2rem", color: "#ff8b8b" }}>
            {formatTime(timeLeft)}
          </p>
        )}
        
      </div>
    );
  };
  
  export default CountdownTimer;
  