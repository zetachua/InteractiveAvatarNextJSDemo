import '../styles/introduction.css';
import { Button } from "@nextui-org/react";

interface IntroductionProps {
  setIsBeginClock: React.Dispatch<React.SetStateAction<boolean>>;
};

const Introduction: React.FC<IntroductionProps> = ({
  setIsBeginClock
}) => {
  return (
    <div className='introduction-overlay'>
      <div className='introduction-container'>
        <h1>Begin Pitch Session</h1>
        <p>You have 5 minutes to complete your pitch before moving to Q&A.</p>
        <p>You can pitch by typing or using voice input.</p>
        <Button
          className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
          size="md"
          variant="shadow"
          onPress={() => setIsBeginClock(true)}
        >
          Start Pitch
        </Button>
      </div>
    </div>
  );
};
export default Introduction;