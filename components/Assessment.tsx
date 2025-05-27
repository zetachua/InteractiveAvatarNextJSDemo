import React, { useEffect, useRef, useState } from 'react';
import {
  AssessmentType,
  PronunciationAssessment
} from './KnowledgeClasses';

interface AssessmentProps {
  assessment: AssessmentType;
  pronunciationAssessment: PronunciationAssessment;
};

const Assessment: React.FC<AssessmentProps> = ({
  assessment,
  pronunciationAssessment,
}) => {
  const [audioSummary, setAudioSummary] = useState({
    score: 0,
    grade: 'Undefined',
    color: '#7F8C8D',
    description: '',
    tooltip: ''
  });

  const getGrade = (score: number) => {
    if (score < 38) {
      return 'Beginner';
    } else if (score < 49) {
      return 'Elementary';
    } else if (score < 62) {
      return 'Intermediate';
    } else if (score < 76) {
      return 'Upper Intermediate';
    } else if (score < 86) {
      return 'Advanced';
    } else if (score <= 100) {
      return 'Fluent';
    } else {
      return 'Undefined';
    }
  };

  const getColor = (score: number) => {
    if (score < 38) {
      return '#DC7633';
    } else if (score < 49) {
      return '#EB984E';
    } else if (score < 62) {
      return '#F5B041';
    } else if (score < 76) {
      return '#F4D03F';
    } else if (score < 86) {
      return '#58D68D';
    } else if (score <= 100) {
      return '#52BE80';
    } else {
      return '#7F8C8D';
    }
  };

  const getPronunciationDescription = (score: number) => {
    if (score < 38) {
      return 'Start your journey by practicing basic words and sounds. Focus on clear, slow speech and repeat after native speakers to build a strong foundation.'
    } else if (score < 49) {
      return 'Make a list of “tricky” words or sentences you find hard to pronounce, then say them out loud here. You\'ll get immediate feedback on your pronunciation!';
    } else if (score < 62) {
      return 'You\'re getting the hang of it! Now focus on stress and rhythm. Try reading longer sentences and work on sounding more natural and confident.';
    } else if (score < 76) {
      return 'Your pronunciation is quite good! Fine-tune your accent and intonation. Record yourself reading aloud and compare it to native speakers to spot subtle differences.';
    } else if (score < 86) {
      return 'You\'re almost there! Focus on refining intonation patterns, connected speech, and reducing your accent. Practice with longer conversations or presentations.';
    } else if (score <= 100) {
      return 'Excellent work! Your pronunciation is clear, natural, and easy to understand. Keep maintaining it by speaking regularly and exploring different speaking styles.';
    } else {
      return '';
    }
  };

  const PRONUNCIATION_DESC = `
    Your speech is analyzed using AI to compare it to native English pronunciation.
    It checks how accurately you pronounce each word by analyzing the sounds (phonemes).
    Fluency is measured based on how smoothly and naturally you speak, including pauses and speed.
    Completeness looks at whether you said all the required words or skipped any.
    The system also evaluates rhythm, stress, and intonation for natural speaking patterns.
    Each word is scored individually, so you can see exactly which ones need improvement.
    You'll also get feedback on specific sounds you may have mispronounced.
    This helps you focus on the areas that need the most practice.
    The analysis works instantly after you finish speaking.
    It's designed to help you improve pronunciation, fluency, and overall speaking confidence.
  `

  const GET_PHONEME_DETAILS: Record<string, string> = {
    "i": "For the /i/ (ee) vowel, your tongue should be high and close to the roof of your mouth, as in 'see'. Lips should be spread.",
    "ɪ": "For the /ɪ/ (ih) vowel, the tongue is slightly lower than /i/, as in 'bit'. Lips should be relaxed.",
    "e": "For the /e/ vowel, the tongue is mid-high and lips spread, like in some non-American 'bait' pronunciations.",
    "ɛ": "For the /ɛ/ (eh) vowel, your tongue and jaw should be at a medium height: lower than /ɪ/, as in 'it,' but higher than /æ/, as in 'bad.'",
    "æ": "For the /æ/ (a) vowel, open your mouth wide and lower your jaw more than for /ɛ/, as in 'cat'.",
    "ɑ": "For the /ɑ/ (ah) vowel, the tongue is low and the mouth is wide open, as in 'father'.",
    "ʌ": "For the /ʌ/ (uh) vowel, the tongue is in a mid-central position, as in 'cup'.",
    "ə": "For the /ə/ (schwa), the tongue is relaxed and centered, used in unstressed syllables like the 'a' in 'sofa'.",
    "u": "For the /u/ (oo) vowel, the tongue is high and back with rounded lips, as in 'food'.",
    "ʊ": "For the /ʊ/ (uh as in book) vowel, the tongue is high-mid back and lips rounded, as in 'good'.",
    "o": "For the /o/ vowel, lips are rounded and the tongue is mid-high and back, like in some accents of 'go'.",
    "ɔ": "For the /ɔ/ (aw) vowel, the tongue is back and slightly lower, lips rounded, as in 'thought'.",
    "ɜ": "For the /ɜ/ (er) vowel, the tongue is mid-central, lips slightly rounded, often with r-coloring.",
    "r": "Your mouth should be almost closed for /r/. This will help you get your tongue up high. People also generally round their lips for /r/.",
    "l": "For /l/, the tongue touches the alveolar ridge just behind the upper front teeth. The sides of the tongue allow air to flow around.",
    "m": "For /m/, close your lips and let air flow through your nose, as in 'man'.",
    "n": "For /n/, touch your tongue to the alveolar ridge and let air flow through your nose, as in 'no'.",
    "ŋ": "For /ŋ/, raise the back of your tongue to the soft palate and allow air through the nose, as in 'sing'.",
    "p": "For /p/, press your lips together and release with a burst of air, as in 'pen'.",
    "b": "For /b/, press your lips together and release with voice, as in 'bat'.",
    "t": "For /t/, touch the tip of your tongue to the alveolar ridge and release a burst of air, as in 'top'.",
    "d": "For /d/, similar to /t/ but with vocal cord vibration, as in 'dog'.",
    "k": "For /k/, raise the back of your tongue to the soft palate and release air, as in 'cat'.",
    "g": "For /g/, similar to /k/ but voiced, as in 'go'.",
    "f": "For /f/, touch your top teeth to your bottom lip and blow air, as in 'fun'.",
    "v": "For /v/, like /f/ but with vocal cord vibration, as in 'van'.",
    "θ": "For /θ/, place your tongue between your teeth and blow air, as in 'think'.",
    "ð": "For /ð/, same tongue position as /θ/ but voiced, as in 'this'.",
    "s": "For /s/, direct air over the edge of your tongue towards the teeth, as in 'see'.",
    "z": "For /z/, same as /s/ but voiced, as in 'zoo'.",
    "ʃ": "For /ʃ/, round your lips slightly and let air pass over the tongue to the palate, as in 'shoe'.",
    "ʒ": "For /ʒ/, like /ʃ/ but voiced, as in the 's' in 'measure'.",
    "tʃ": "For /tʃ/, combine a /t/ and /ʃ/ sound, as in 'chop'.",
    "dʒ": "For /dʒ/, combine a /d/ and /ʒ/ sound, as in 'judge'.",
    "h": "For /h/, exhale sharply through an open mouth and throat, as in 'hat'.",
    "w": "For /w/, round your lips and raise the back of the tongue as in 'we'.",
    "oʊ": "For the /oʊ/ diphthong, start with your tongue in a mid-back position with rounded lips, similar to /o/, and glide toward a higher position, as in 'go' or 'no'. Keep your lips rounded and slightly move your tongue upward during the glide.",
  };

  useEffect(() => {
    switch (assessment) {
      case 'Pronunciation':
        const score = pronunciationAssessment.score;
        setAudioSummary({
          score: score,
          grade: getGrade(score),
          color: getColor(score),
          description: getPronunciationDescription(score),
          tooltip: PRONUNCIATION_DESC
        });
      case 'Intonation':

      case 'Fluency':

    }
  }, [assessment]);

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const wordInfoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const selectPronunciationIndex = (index: number) => {
    setActiveIndex(prev => (prev === index ? -1 : index));
  };

  // Adjust word info box position if it's overflowing
  useEffect(() => {
    if (activeIndex < 0) return;

    const wordInfo = wordInfoRefs.current[activeIndex];
    if (!wordInfo) return;

    const rect = wordInfo.getBoundingClientRect();
    const padding = 8;

    // Reset position first
    wordInfo.style.left = "50%";
    wordInfo.style.transform = "translateX(-50%)";

    // Shift left if overflowing right
    if (rect.right > window.innerWidth - padding) {
      wordInfo.style.left = "auto";
      wordInfo.style.right = "0";
      wordInfo.style.transform = "translateX(0)";
    }

    // Shift right if overflowing left
    if (rect.left < padding) {
      wordInfo.style.left = "0";
      wordInfo.style.right = "auto";
      wordInfo.style.transform = "translateX(0)";
    }
  }, [activeIndex]);

  return (
    <div className='assessment'>

      <div className='summary'>
        <div className='meter'>
          <div
            className='progress'
            style={{ '--i': audioSummary.score, '--clr': audioSummary.color } as React.CSSProperties }
          >
            <h3>{audioSummary.score}</h3>
            <h4>{audioSummary.grade}</h4>
          </div>
        </div>

        <div className='description'>
          <h1>
            {assessment} Score
            <span className='tooltip-container'>
              <img src='/question.png' alt='description' />
              <span className='tooltip-text'>{audioSummary.tooltip}</span>
            </span>
          </h1>
          <h2>Your {assessment} is <strong>{audioSummary.grade}</strong>.</h2>
          <p>{audioSummary.description}</p>
        </div>
      </div>

      <div className='content'>
        {assessment === 'Pronunciation' ? (
          <>
            {pronunciationAssessment === undefined || !pronunciationAssessment.words ? (
              <p>Cannot analyze pronunciation.</p>
            ) : (
              <>
                {pronunciationAssessment.words.map((word, i) => (
                  <div key={i} className='word'>
                    {word.score < 70 ? (
                      <>
                        <div
                          className='low-score'
                          onClick={() => selectPronunciationIndex(i)}
                        >
                          {word.text}
                        </div>
                        {activeIndex === i && (
                          <div
                            className='word-info'
                            ref={el => {wordInfoRefs.current[i] = el}}
                          >
                            <div className='transcript'>
                              <div>{word.text}</div>
                              <div className='phonemes'>
                                /
                                {word.phonemes.map((phoneme, j) => (
                                  <span key={j}>
                                    {phoneme.phoneme}
                                  </span>
                                ))}
                                /
                              </div>
                            </div>
                            <div className='progress-container'>
                              <span className='score'>{word.score}</span>
                              <div className='progress-bar'>
                                <div
                                  className='progress-fill'
                                  style={{ width: `${word.score}%`, backgroundColor: getColor(word.score) }}
                                ></div>
                              </div>
                            </div>
                            <div className='table'>
                              <div className='title'>
                                <span className='sound-title'>Sound</span>
                                <span className='said-title'>You said</span>
                              </div>
                              {word.phonemes.map((phoneme, j) => (
                                <div className='row' key={j}>
                                  <span className='sound-result'>/{phoneme.phoneme}/</span>
                                  <span className='said-result'>
                                    {phoneme.score < 70 ? (
                                      <>
                                        <div className='incorrect'>Incorrect</div>
                                        <div className='details'>
                                          {GET_PHONEME_DETAILS[phoneme.phoneme]}
                                        </div>
                                      </>
                                    ) : (
                                      <div className='correct'>Correct</div>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      word.text
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        ) : assessment === 'Intonation' ? (
          <>
          </>
        ) : assessment === 'Fluency' ? (
          <>
          </>
        ) : (
          <div>Error: Invalid assessment type.</div>
        )}
      </div>

    </div>
  );
};

export default Assessment;