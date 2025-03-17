interface CountdownTimerProps {
    timeLeft: number;
    isTimeUp: boolean;
  }
  
  const CountdownTimer = ({ timeLeft, isTimeUp }: CountdownTimerProps) => {
    const formatTime = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    };
  
    return (
      <div
        className="flex flex-col items-center justify-center p-4 border rounded-lg shadow-lg bg-white w-100"
        style={{ position: "absolute", top: "1rem", right: "1rem" }}
      >
        <h2 className="text-lg font-semibold text-black text-center p-2">
          Pitch Countdown Timer
        </h2>
        {isTimeUp ? (
          <p className="text-2xl font-bold mt-2 text-green-500">Q&A Time!</p>
        ) : (
          <p className="text-2xl font-bold mt-2 text-red-500">
            {formatTime(timeLeft)}
          </p>
        )}
      </div>
    );
  };
  
  export default CountdownTimer;
  