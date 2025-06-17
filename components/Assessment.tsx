import React, { useEffect, useRef, useState } from 'react';
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AssessmentType,
  FluencyAssessment,
  IntonationAssessment,
  PronunciationAssessment
} from './KnowledgeClasses';

interface AssessmentProps {
  assessment: AssessmentType;
  pronunciationAssessment: PronunciationAssessment;
  intonationAssessment: IntonationAssessment;
  fluencyAssessment: FluencyAssessment;
};

const Assessment: React.FC<AssessmentProps> = ({
  assessment,
  pronunciationAssessment,
  intonationAssessment,
  fluencyAssessment,
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
  `;

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

  const getIntonationDescription = (score: number): string => {
    if (score < 38) {
      return 'Start learning how emphasis changes meaning! Try reading simple sentences out loud, exaggerating important words to hear the difference in pitch and tone.';
    } else if (score < 49) {
      return 'Focus on word stress and sentence rhythm. Practice emphasizing nouns, verbs, and adjectives in your speech to sound clearer and more natural.';
    } else if (score < 62) {
      return 'You\'re starting to use intonation better! Try reading sentences with emotion or storytelling style to naturally add more expressive pitch variation.';
    } else if (score < 76) {
      return 'Great progress! Now work on smooth rising and falling pitch patterns to match natural English intonation. Mimic native speakers in videos or audiobooks.';
    } else if (score < 86) {
      return 'You\'re using intonation well! Focus on fine-tuning subtle pitch shifts in longer, expressive sentences. Practice conversational speech for flow and tone.';
    } else if (score <= 100) {
      return 'Excellent intonation! You\'re using pitch and emphasis in a natural, expressive way. Keep refining it by practicing storytelling, debate, or expressive reading.';
    } else {
      return '';
    }
  };

  const INTONATION_DESC = `
    Your speech is analyzed to measure how well you use intonation — the rise and
    fall of pitch in your voice — to emphasize important words and convey meaning. The
    system analyzes whether you placed emphasis on the correct words (based on grammar and
    context), whether your pitch and loudness increased appropriately during those words,
    and how consistent your pitch was across the sentence.
    Good intonation makes your speech sound natural, engaging, and easier to understand.
    Native speakers often emphasize content words (like nouns, verbs, and adjectives) by
    raising pitch and speaking with more energy. Good intonation typically ranges from 50 Hz to 150 Hz.
  `;

  const getFluencyDescription = (score: number): string => {
    if (score < 38) {
      return 'Your speech is quite hesitant, with frequent long pauses and slow articulation. Practice speaking full sentences aloud without stopping to build confidence and flow.';
    } else if (score < 49) {
      return 'Try to reduce your filler words and unnecessary pauses. Practice speaking smoothly by recording yourself and aiming for a steady rhythm.';
    } else if (score < 62) {
      return 'You\'re getting better! Work on minimizing hesitation and increasing your speaking pace slightly. Try reading aloud to develop smoother transitions between words.';
    } else if (score < 76) {
      return 'Nice progress! Focus on polishing your fluency by reducing minor hesitations and keeping a consistent pace. Shadow native speakers to improve further.';
    } else if (score < 86) {
      return 'You\'re sounding fluent! Minor improvements can be made in pacing and avoiding repetitive phrasing. Keep practicing with longer conversations.';
    } else if (score <= 100) {
      return 'Excellent fluency! You speak smoothly and naturally, with few interruptions or hesitations. Maintain this level with regular speaking practice.';
    } else {
      return '';
    }
  };

  const FLUENCY_DESC = `
    Fluency is how naturally and smoothly you speak without frequent pauses or fillers.
    It\'s not just about speed — it includes your rhythm, hesitation, pacing, and use of filler words or repeated phrases.
    Pauses are expected, but too many or poorly placed ones can make your speech sound hesitant.
    Filler words like “uh”, “um”, “like”, or “you know” may indicate uncertainty or a lack of flow.
    Hesitations are detected by analyzing gaps between words or prolonged durations on certain words.
    The AI analyzes these patterns to give you a score from 0 to 100.
    You\'ll also see a detailed breakdown of pauses, speaking rate, and detected filler words or phrases.
    By reviewing this feedback, you can target specific habits that affect your fluency and sound more confident.
  `;

  const getNeedleAngle = () => {
    const clamped = Math.min(Math.max(fluencyAssessment.articulation_rate_wpm, 50), 250)
    return ((clamped - 50) / 200) * 180 - 90;
  };

  const getSpeedLabel = () => {
    if (fluencyAssessment.articulation_rate_wpm < 120) return 'Slow';
    if (fluencyAssessment.articulation_rate_wpm <= 180) return 'Natural';
    return 'Fast';
  };

  useEffect(() => {
    switch (assessment) {
      case 'Pronunciation':
        setAudioSummary({
          score: pronunciationAssessment.score,
          grade: getGrade(pronunciationAssessment.score),
          color: getColor(pronunciationAssessment.score),
          description: getPronunciationDescription(pronunciationAssessment.score),
          tooltip: PRONUNCIATION_DESC
        });
        break;
      case 'Intonation':
        setAudioSummary({
          score: intonationAssessment.score,
          grade: getGrade(intonationAssessment.score),
          color: getColor(intonationAssessment.score),
          description: getIntonationDescription(intonationAssessment.score),
          tooltip: INTONATION_DESC
        });
        break;
      case 'Fluency':
        setAudioSummary({
          score: fluencyAssessment.score,
          grade: getGrade(fluencyAssessment.score),
          color: getColor(fluencyAssessment.score),
          description: getFluencyDescription(fluencyAssessment.score),
          tooltip: FLUENCY_DESC
        });
        break;
    }
  }, [assessment]);

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const wordInfoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const selectActiveIndex = (index: number) => {
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

      <div className='charts'>
        {assessment === 'Pronunciation' ? (
          <></>
        ) : assessment === 'Intonation' ? (
          <div className='w-full h-64'>
            <ResponsiveContainer>
              <LineChart data={intonationAssessment.pitch}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='time' tickFormatter={(t) => t.toFixed(1)} tick={{ fontSize: '1rem' }} />
                <YAxis domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(0)} tick={{ fontSize: '1rem'}}>
                  <Label value='Pitch (Hz)' angle={-90} position='insideLeft' />
                </YAxis>
                <Tooltip />
                <Line
                  type='monotone'
                  dataKey='pitch'
                  stroke='#8884d8'
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : assessment === 'Fluency' ? (
          <>
            <div className='pace'>
              <div className='speedometer-wrapper'>
                <div className='speedometer'>
                  <div className='needle' style={{ transform: `rotate(${getNeedleAngle()}deg)` }} />
                  <div className='center-label'>
                    <div className='wpm'>{fluencyAssessment.articulation_rate_wpm} wpm</div>
                    <div className='label'>{getSpeedLabel()}</div>
                  </div>
                </div>
              </div>
              <strong>Pace</strong>
            </div>

            <div className='pause'>
              <div className='meter'>
                <div
                  className='fill'
                  style={{
                    '--score': fluencyAssessment.pause_score,
                    '--clr': getColor(fluencyAssessment.pause_score)
                  } as React.CSSProperties } />
              </div>
              <strong>Pause Score</strong>
              <div>{fluencyAssessment.pause_score}</div>
            </div>
          </>
        ) : (
          <div>Error: Invalid assessment type.</div>
        )}
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
                          className='red'
                          onClick={() => selectActiveIndex(i)}
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
            {intonationAssessment === undefined || !intonationAssessment.words ? (
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
                        >
                          {word.text}
                        </div>
                        {activeIndex === i && (
                          <div
                            className='word-info'
                            ref={el => {wordInfoRefs.current[i] = el}}
                          >
                            {word.expected ? (
                              <>Make sure you say this word with more energy. It was too soft!</>
                            ) : (
                              <>You incorrectly emphasized this word. Say it softly next time!</>
                            )}
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
        ) : assessment === 'Fluency' ? (
          <>
            {fluencyAssessment === undefined || !fluencyAssessment.words ? (
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
                        >
                          {word.text}
                        </div>
                        {activeIndex === i && (
                          <div
                            className='word-info'
                            ref={el => {wordInfoRefs.current[i] = el}}
                          >
                            Filler words can make your speech sound uncertain. Try pausing briefly instead. It helps you sound more confident and deliberate.
                          </div>
                        )}
                      </>
                    ) : word.hesitation ? (
                      <>
                        <div
                          className='blue'
                          onClick={() => selectActiveIndex(i)}
                        >
                          {word.text}
                        </div>
                        {activeIndex === i && (
                          <div
                            className='word-info'
                            ref={el => {wordInfoRefs.current[i] = el}}
                          >
                            You hesitated on this word! Hesitations often happen when you're unsure of the next word. Practice slowing down and using short pauses instead of dragging words.
                          </div>
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
                            />
                            {activeIndex === i && (
                              <div
                                className='word-info'
                                ref={el => {wordInfoRefs.current[i] = el}}
                              >
                                This is a good pause - {word.reason}
                              </div>
                            )}
                          </>
                        ) : word.classification === 'bad' ? (
                          <>
                            <img
                              className='pause'
                              src='/red_pause.png'
                              alt='bad pause'
                              onClick={() => selectActiveIndex(i)}
                            />
                            {activeIndex === i && (
                              <div
                                className='word-info'
                                ref={el => {wordInfoRefs.current[i] = el}}
                              >
                                This is a bad pause - {word.reason}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <img
                              className='pause'
                              src='gray_pause.png'
                              alt='pause'
                              onClick={() => selectActiveIndex(i)}
                            />
                            {activeIndex === i && (
                              <div
                                className='word-info'
                                ref={el => {wordInfoRefs.current[i] = el}}
                              >
                                You paused here for {word.gap} seconds.
                              </div>
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

    </div>
  );
};

export default Assessment;