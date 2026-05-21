import React, { useState } from 'react';
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
  FluencyAssessment,
  IntonationAssessment,
  PronunciationAssessment
} from './KnowledgeClasses';

interface AssessmentProps {
  pronunciationAssessment?: PronunciationAssessment;
  intonationAssessment?: IntonationAssessment;
  fluencyAssessment?: FluencyAssessment;
};

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

const getNeedleAngle = (wpm: number) => {
  const clamped = Math.min(Math.max(wpm, 50), 250)
  return ((clamped - 50) / 200) * 180 - 90;
};

const getSpeedLabel = (wpm: number) => {
  if (wpm < 120) return 'Slow';
  if (wpm <= 180) return 'Natural';
  return 'Fast';
};

const Assessment: React.FC<AssessmentProps> = ({
  pronunciationAssessment,
  intonationAssessment,
  fluencyAssessment,
}) => {
  const [isExpanded, setIsExpanded] = useState<{
    pronunciation: boolean;
    intonation: boolean;
    fluency: boolean;
  }>({
    pronunciation: false,
    intonation: false,
    fluency: false,
  });

  return (
    <div className='assessment'>
      {/* Pronunciation */}
      {pronunciationAssessment && (
        <>
          <div className='summary'>
            <div className='meter'>
              <div
                className='progress'
                style={{ '--i': pronunciationAssessment.score, '--clr': getColor(pronunciationAssessment.score) } as React.CSSProperties }
              >
                <h3>{pronunciationAssessment.score}</h3>
                <h4>{getGrade(pronunciationAssessment.score)}</h4>
              </div>
            </div>
            <div className='description'>
              <div className='metric'>
                <h1>Pronunciation Score</h1>
                <span className='tooltip-container'>
                  <img src='/question.png' alt='description' />
                  <span className='tooltip-text'>{PRONUNCIATION_DESC}</span>
                </span>
              </div>
              <h2>Your Pronunciation is <strong>{getGrade(pronunciationAssessment.score)}</strong>.</h2>
              <p>{getPronunciationDescription(pronunciationAssessment.score)}</p>
            </div>
          </div>
          <div className={`charts ${isExpanded.pronunciation ? 'expanded' : ''}`}></div>
        </>
      )}

      {/* Intonation */}
      {intonationAssessment && (
        <>
          <div className='summary'>
            <div className='meter'>
              <div
                className='progress'
                style={{ '--i': intonationAssessment.score, '--clr': getColor(intonationAssessment.score) } as React.CSSProperties }
              >
                <h3>{intonationAssessment.score}</h3>
                <h4>{getGrade(intonationAssessment.score)}</h4>
              </div>
            </div>
            <div className='description'>
              <div className='metric'>
                <h1>Intonation Score</h1>
                <span className='tooltip-container'>
                  <img src='/question.png' alt='description' />
                  <span className='tooltip-text'>{INTONATION_DESC}</span>
                </span>
              </div>
              <h2>Your Intonation is <strong>{getGrade(intonationAssessment.score)}</strong>.</h2>
              <p>{getIntonationDescription(intonationAssessment.score)}</p>
            </div>
          </div>
          <div className='more-info'>
            <button onClick={() => setIsExpanded(prev => ({ ...prev, intonation: !prev.intonation }))}>
              More info {isExpanded.intonation ? '▲' : '▼'}
            </button>
          </div>
          <div className={`charts ${isExpanded.intonation ? 'expanded' : ''}`}>
            <div className='w-full h-64'>
              <ResponsiveContainer>
                <LineChart data={intonationAssessment.pitch}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='time' tickFormatter={(t) => t.toFixed(1)} tick={{ fontSize: '0.8rem' }} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(0)} tick={{ fontSize: '0.8rem'}}>
                    <Label value='Pitch (Hz)' angle={-90} position='insideLeft' />
                  </YAxis>
                  <Tooltip />
                  <Line type='monotone' dataKey='pitch' stroke='#8884d8' strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Fluency */}
      {fluencyAssessment && (
        <>
          <div className='summary'>
            <div className='meter'>
              <div
                className='progress'
                style={{ '--i': fluencyAssessment.score, '--clr': getColor(fluencyAssessment.score) } as React.CSSProperties }
              >
                <h3>{fluencyAssessment.score}</h3>
                <h4>{getGrade(fluencyAssessment.score)}</h4>
              </div>
            </div>
            <div className='description'>
              <div className='metric'>
                <h1>Fluency Score</h1>
                <span className='tooltip-container'>
                  <img src='/question.png' alt='description' />
                  <span className='tooltip-text'>{FLUENCY_DESC}</span>
                </span>
              </div>
              <h2>Your Fluency is <strong>{getGrade(fluencyAssessment.score)}</strong>.</h2>
              <p>{getFluencyDescription(fluencyAssessment.score)}</p>
            </div>
          </div>
          <div className='more-info'>
            <button onClick={() => setIsExpanded(prev => ({ ...prev, fluency: !prev.fluency }))}>
              More info {isExpanded.fluency ? '▲' : '▼'}
            </button>
          </div>
          <div className={`charts ${isExpanded.fluency ? 'expanded' : ''}`}>
            <div className='pace'>
              <div className='speedometer-wrapper'>
                <div className='speedometer'>
                  <div className='needle' style={{ transform: `rotate(${getNeedleAngle(fluencyAssessment.articulation_rate_wpm)}deg)` }} />
                  <div className='center-label'>
                    <div className='wpm'>{fluencyAssessment.articulation_rate_wpm} wpm</div>
                    <div className='label'>{getSpeedLabel(fluencyAssessment.articulation_rate_wpm)}</div>
                  </div>
                </div>
              </div>
              <strong>Pace</strong>
            </div>
            <div className='pause'>
              <div className='meter'>
                <div
                  className='fill'
                  style={{ '--score': fluencyAssessment.pause_score, '--clr': getColor(fluencyAssessment.pause_score) } as React.CSSProperties}
                />
              </div>
              <strong>Pause Score</strong>
              <div>{fluencyAssessment.pause_score}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Assessment;