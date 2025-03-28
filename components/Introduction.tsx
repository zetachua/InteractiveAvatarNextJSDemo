import '../styles/introduction.css';

interface IntroductionProps {
  setIsBeginClock: React.Dispatch<React.SetStateAction<boolean>>;
};

const Introduction: React.FC<IntroductionProps> = ({
  setIsBeginClock
}) => {
  return (
    <div className='introduction-container'>
      <h1>Begin session</h1>
      <p>You have 5 mins to do a pitch before proceeding to QnA.</p>
      <p>You can type or voice your pitch out.</p>
      <button
        onClick={() => setIsBeginClock(true)}
      >
        Start
      </button>
    </div>
  );
};
export default Introduction;