import '../styles/introduction.css';
import { Button } from "@nextui-org/react";

interface IntroductionProps {
  setIsBeginClock: React.Dispatch<React.SetStateAction<boolean>>;
  /** When true, show Talk-button guidance for live avatar sessions. */
  isAvatarMode?: boolean;
}

const Introduction: React.FC<IntroductionProps> = ({
  setIsBeginClock,
  isAvatarMode = false,
}) => {
  return (
    <div className='introduction-overlay'>
      <div className='introduction-container'>
        <h1>Begin pitch session</h1>
        <p className="introduction-lead">
          You have <strong>8 minutes</strong> to deliver your pitch before Q&amp;A.
        </p>
        <ul className="introduction-tips">
          <li>Type in the box and press <strong>Send</strong>, or use voice (see below).</li>
          {isAvatarMode ? (
            <li>
              <strong>Voice</strong> (microphone): tap <strong>once</strong> to <strong>start</strong> recording;
              tap <strong>again</strong> to <strong>stop</strong>. Your speech is transcribed and sent to the chat
              so the investor avatar can respond.
            </li>
          ) : (
            <li>
              <strong>Voice</strong>: tap <strong>once</strong> to start recording, <strong>again</strong> to stop.
              Your words are transcribed into the chat.
            </li>
          )}
          <li>
            After you stop a recording, a copy is saved as an <strong>MP3</strong> on your device (or WebM if MP3 isn’t available)
            so you can use <strong>Upload Audio</strong> to retry if transcription had issues.
          </li>
        </ul>
        <Button
          className="introduction-start-btn bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white w-full max-w-xs"
          size="lg"
          variant="shadow"
          onPress={() => setIsBeginClock(true)}
        >
          Start pitch
        </Button>
      </div>
    </div>
  );
};

export default Introduction;
