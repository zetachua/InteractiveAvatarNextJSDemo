import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AssessmentType,
  FluencyAssessment,
  IntonationAssessment,
  PronunciationAssessment
} from './KnowledgeClasses';

interface TranscriptProps {
  assessment: AssessmentType;
  pronunciationAssessment: PronunciationAssessment;
  intonationAssessment: IntonationAssessment;
  fluencyAssessment: FluencyAssessment;
};

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
  "aɪ": "For the /aɪ/ diphthong, start with your mouth open and tongue low and centered (like /ɑ/), then glide your tongue forward and up toward /ɪ/, as in 'my', 'eye', or 'bite'.",
  "ɡ": "For /ɡ/, raise the back of your tongue to the soft palate and release with vocal cord vibration, as in 'go' or 'give'. It's the voiced counterpart to /k/.",
  "ɝ": "For the /ɝ/ (as in 'bird' or 'learn') vowel, position your tongue in the middle of your mouth, slightly raised, and curl the tongue tip upward without touching the roof. Lips are slightly rounded, and the sound is 'r-colored' — meaning it ends with an /r/-like quality.",
  "aʊ": "For the /aʊ/ diphthong, start with your mouth open and your tongue low and central (similar to /a/), then glide your tongue upward and slightly back toward /ʊ/, as in 'now', 'house', or 'out'. Lips should start unrounded and gradually round during the glide.",
  "eɪ": "For the /eɪ/ diphthong, start with your tongue in a mid-front position and lips unrounded, similar to /e/, then glide upward slightly toward /ɪ/. This diphthong appears in words like 'say', 'day', and 'face'. Keep the tongue movement subtle and controlled.",
  "ɔɪ": "For the /ɔɪ/ diphthong, start with your tongue low-mid and slightly back (like /ɔ/), with rounded lips, then glide forward and upward toward /ɪ/, as in 'boy', 'toy', or 'choice'. Unround your lips slightly during the glide.",
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

const Transcript: React.FC<TranscriptProps> = ({
  assessment,
  pronunciationAssessment,
  intonationAssessment,
  fluencyAssessment,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const wordInfoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [infoPosition, setInfoPosition] = useState<{ top: number; left: number; }>({
    top: 0,
    left: 0,
  });
  const selectActiveIndex = (index: number) => {
    setActiveIndex(prev => (prev === index ? -1 : index));
  };

  // Adjust word info box position if it's overflowing
  useEffect(() => {
    if (activeIndex < 0) return;

    const wordEl = wordInfoRefs.current[activeIndex];
    const containerEl = document.getElementById('evaluation')
    if (!wordEl || !containerEl) return;

    const wordRect = wordEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    const estimatedWidth = 350;
    const padding = 8;

    let left = wordRect.left - containerRect.left + wordRect.width / 2 - estimatedWidth / 2 + containerEl.scrollLeft;
    let top = wordRect.bottom - containerRect.top + padding + containerEl.scrollTop;

    // Adjust horizontally
    if (left + estimatedWidth + padding - containerEl.scrollLeft > containerEl.clientWidth) {
      left = containerEl.clientWidth + containerEl.scrollLeft - estimatedWidth - padding;
    } else if (left - containerEl.scrollLeft < padding) {
      left = padding + containerEl.scrollLeft;
    }

    setInfoPosition({ top, left });
  }, [activeIndex]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [assessment]);

  return (
    <div className='transcript'>
      {assessment === 'Pronunciation' ? (
        <>
          {pronunciationAssessment == null || !pronunciationAssessment.words ? (
            <p>Cannot analyze pronunciation.</p>
          ) : (
            <>
              {pronunciationAssessment.words.map((word, i) => (
                <div key={i} className='word'>
                  {word.score < 70 ? (
                    <>
                      <div
                        className='red'
                        onClick={() => selectActiveIndex(i)}
                        ref={el => { wordInfoRefs.current[i] = el }}
                      >
                        {word.text}
                      </div>
                      {activeIndex === i && createPortal(
                        <div
                          className='word-info'
                          style={{
                            top: `${infoPosition.top}px`,
                            left: `${infoPosition.left}px`
                          }}
                        >
                          <div className='header'>
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
                            <img
                              className='close'
                              src='/close.png'
                              alt='close'
                              onClick={() => selectActiveIndex(i)}
                            />
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
                        </div>,
                        document.getElementById('evaluation')!
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
          {intonationAssessment == null || !intonationAssessment.words ? (
            <p>Cannot analyze intonation.</p>
          ) : (
            <>
              {intonationAssessment.words.map((word, i) => (
                <div key={i} className='word'>
                  {word.expected !== word.actual ? (
                    <>
                      <div
                        className='red'
                        onClick={() => selectActiveIndex(i)}
                        ref={el => { wordInfoRefs.current[i] = el }}
                      >
                        {word.text}
                      </div>
                      {activeIndex === i && createPortal(
                        <div
                          className='word-info'
                          style={{
                            top: `${infoPosition.top}px`,
                            left: `${infoPosition.left}px`
                          }}
                        >
                          <div className='header'>
                            <div>
                              {word.expected ? 'Make sure you say this word with more energy. It was too soft!' : 'You incorrectly emphasized this word. Say it softly next time!'}
                            </div>
                            <img
                              className='close'
                              src='/close.png'
                              alt='close'
                              onClick={() => selectActiveIndex(i)}
                            />
                          </div>
                        </div>,
                        document.getElementById('evaluation')!
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
      ) : assessment === 'Fluency' ? (
        <>
          {fluencyAssessment == null || !fluencyAssessment.words ? (
            <p>Cannot analyze fluency.</p>
          ) : (
            <>
              {fluencyAssessment.words.map((word, i) => (
                <div key={i} className='word'>
                  {word.filler ? (
                    <>
                      <div
                        className='red'
                        onClick={() => selectActiveIndex(i)}
                        ref={el => { wordInfoRefs.current[i] = el }}
                      >
                        {word.text}
                      </div>
                      {activeIndex === i && createPortal(
                        <div
                          className='word-info'
                          style={{
                            top: `${infoPosition.top}px`,
                            left: `${infoPosition.left}px`
                          }}
                        >
                          <div className='header'>
                            <div>Filler words can make your speech sound uncertain. Try pausing briefly instead. It helps you sound more confident and deliberate.</div>
                            <img
                              className='close'
                              src='/close.png'
                              alt='close'
                              onClick={() => selectActiveIndex(i)}
                            />
                          </div>
                        </div>,
                        document.getElementById('evaluation')!
                      )}
                    </>
                  ) : word.hesitation ? (
                    <>
                      <div
                        className='blue'
                        onClick={() => selectActiveIndex(i)}
                        ref={el => {wordInfoRefs.current[i] = el}}
                      >
                        {word.text}
                      </div>
                      {activeIndex === i && createPortal(
                        <div
                          className='word-info'
                          style={{
                            top: `${infoPosition.top}px`,
                            left: `${infoPosition.left}px`
                          }}
                        >
                          <div className='header'>
                            <div>You hesitated on this word! Hesitations often happen when you're unsure of the next word. Practice slowing down and using short pauses instead of dragging words.</div>
                            <img
                              className='close'
                              src='/close.png'
                              alt='close'
                              onClick={() => selectActiveIndex(i)}
                            />
                          </div>
                        </div>,
                        document.getElementById('evaluation')!
                      )}
                    </>
                  ) : word.gap ? (
                    <>
                      {word.classification === 'good' ? (
                        <>
                          <img
                            className='pause'
                            src='/green_pause.png'
                            alt='good pause'
                            onClick={() => selectActiveIndex(i)}
                            ref={el => {wordInfoRefs.current[i] = el}}
                          />
                          {activeIndex === i && createPortal(
                            <div
                              className='word-info'
                              style={{
                                top: `${infoPosition.top}px`,
                                left: `${infoPosition.left}px`
                              }}
                            >
                              <div className='header'>
                                <div>This is a good pause - {word.reason}</div>
                                <img
                                  className='close'
                                  src='/close.png'
                                  alt='close'
                                  onClick={() => selectActiveIndex(i)}
                                />
                              </div>
                            </div>,
                            document.getElementById('evaluation')!
                          )}
                        </>
                      ) : word.classification === 'bad' ? (
                        <>
                          <img
                            className='pause'
                            src='/red_pause.png'
                            alt='bad pause'
                            onClick={() => selectActiveIndex(i)}
                            ref={el => {wordInfoRefs.current[i] = el}}
                          />
                          {activeIndex === i && createPortal(
                            <div
                              className='word-info'
                              style={{
                                top: `${infoPosition.top}px`,
                                left: `${infoPosition.left}px`
                              }}
                            >
                              <div className='header'>
                                <div>This is a bad pause - {word.reason}</div>
                                <img
                                  className='close'
                                  src='/close.png'
                                  alt='close'
                                  onClick={() => selectActiveIndex(i)}
                                />
                              </div>
                            </div>,
                            document.getElementById('evaluation')!
                          )}
                        </>
                      ) : (
                        <>
                          <img
                            className='pause'
                            src='gray_pause.png'
                            alt='pause'
                            onClick={() => selectActiveIndex(i)}
                            ref={el => {wordInfoRefs.current[i] = el}}
                          />
                          {activeIndex === i && createPortal(
                            <div
                              className='word-info'
                              style={{
                                top: `${infoPosition.top}px`,
                                left: `${infoPosition.left}px`
                              }}
                            >
                              <div className='header'>
                                <div>You paused here for {word.gap} seconds.</div>
                                <img
                                  className='close'
                                  src='/close.png'
                                  alt='close'
                                  onClick={() => selectActiveIndex(i)}
                                />
                              </div>
                            </div>,
                            document.getElementById('evaluation')!
                          )}
                        </>
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
      ) : (
        <div>Error: Invalid assessment type.</div>
      )}
    </div>
  );
};

export default Transcript;