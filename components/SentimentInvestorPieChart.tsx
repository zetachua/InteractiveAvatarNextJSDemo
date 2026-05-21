import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Button } from '@nextui-org/button';
import { Spinner } from '@nextui-org/spinner';
import Assessment from './Assessment';
import Section from './Section';
import Transcript from './Transcript';
import {
  FeedbackSpecificMetrics,
  FeedbackMetricData,
  AssessmentType,
  PronunciationAssessment,
  IntonationAssessment,
  FluencyAssessment,
} from './KnowledgeClasses'; // Assuming you have these types
import '../styles/SentimentInvestorPieChart.css';

// Props for the component
interface SentimentInvestorPieChartProps {
  /** When all three are set, pronunciation / intonation / fluency panels appear; otherwise only LLM sentiment is shown. */
  pronunciationAssessment?: PronunciationAssessment | null;
  intonationAssessment?: IntonationAssessment | null;
  fluencyAssessment?: FluencyAssessment | null;
  /** True while upload/recording audio is being analyzed (separate from LLM sentiment). */
  audioAnalyticsLoading?: boolean;
  data: FeedbackMetricData; // Change from 'data' to 'feedbackData'
  overallScore:number;
  feedbackSummary:string;
  specificFeedback:FeedbackSpecificMetrics;
}

const assessments: AssessmentType[] = ['Pronunciation', 'Intonation', 'Fluency'];

const SENTIMENT_METRIC_LABELS: Record<string, string> = {
  clarity: 'Clarity',
  relevance: 'Relevance',
  depth: 'Depth',
  neutrality: 'Neutrality',
  engagement: 'Engagement',
};

/** Same gradient as rubric pie (RubricInvestorPieChart2); `score` is 0–10. */
function getRubricPieColor(score: number) {
  if (score <= 5) {
    const t = score / 5;
    const r = Math.round(255);
    const g = Math.round(175 - 5 * t);
    const b = Math.round(175 - 5 * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const intensity = (score - 5) / 5;
  const greenValue = Math.floor(100 + 155 * intensity);
  return `rgb(0, ${greenValue}, 0)`;
}

/** Map LLM sentiment scores (1–5) onto the same 0–10 palette as the investor rubric. */
function sentimentScoreColor(score: number) {
  const s = typeof score === 'number' && !Number.isNaN(score) ? score : 0;
  const onTen = Math.max(0, Math.min(10, (s / 5) * 10));
  return getRubricPieColor(onTen);
}

const SentimentInvestorPiechart: React.FC<SentimentInvestorPieChartProps> = ({
  data,
  overallScore,
  feedbackSummary,
  specificFeedback,
  pronunciationAssessment,
  intonationAssessment,
  fluencyAssessment,
  audioAnalyticsLoading = false,
}) => {
  const hasVoiceAnalysis =
    pronunciationAssessment != null ||
    intonationAssessment != null ||
    fluencyAssessment != null;

  // Destructure values from the feedbackData prop
  const {
    clarity,
    relevance,
    depth,
    neutrality,
    engagement,
  } = data;

  // Combine metrics data for the chart
  const rubricMetrics: FeedbackMetricData = {
    clarity,
    relevance,
    depth,
    neutrality,
    engagement,
  };

  const sortedSentimentRows = useMemo(() => {
    const keys = ['clarity', 'relevance', 'depth', 'neutrality', 'engagement'] as const;
    return keys
      .map((key) => {
        const scoreRaw = rubricMetrics[key];
        const n = typeof scoreRaw === 'number' && !Number.isNaN(scoreRaw) ? scoreRaw : 0;
        const feedback = (specificFeedback?.[key] as string) || '';
        return {
          key,
          score: n,
          feedback,
          label: SENTIMENT_METRIC_LABELS[key] ?? key,
          accent: sentimentScoreColor(n),
        };
      })
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.key.localeCompare(b.key);
      });
  }, [rubricMetrics, specificFeedback]);

  // Bar chart: worst → best (same order as feedback sections)
  const barData = useMemo(
    () =>
      sortedSentimentRows.map((row) => ({
        name: row.label,
        value: row.score,
        key: row.key,
      })),
    [sortedSentimentRows],
  );

  const roundedOverallScore =
    overallScore !== undefined
      ? Math.ceil((overallScore + Number.EPSILON) * 10) / 10
      : 0;

  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentType>('Pronunciation');
  const [showFullSummary, setShowFullSummary] = useState(false);
  const summaryPoints = feedbackSummary
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const visibleSummaryPoints = showFullSummary ? summaryPoints : summaryPoints.slice(0, 3);

  return (
    <div className='sentiment-analysis'>

      <div className='overall'>
          <b>Sentiment Analysis</b>
          <ul className='overall-summary-points'>
            {visibleSummaryPoints.map((point, index) => (
              <li key={`${point}-${index}`}>{point}{point.endsWith('.') ? '' : '.'}</li>
            ))}
          </ul>
          {summaryPoints.length > 3 && (
            <button className='summary-toggle' onClick={() => setShowFullSummary(!showFullSummary)}>
              {showFullSummary ? 'Show less' : 'Show more'}
            </button>
          )}
      </div>

      {audioAnalyticsLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.85rem',
            lineHeight: 1.45,
            margin: '0.5rem 0 0.75rem',
            padding: '0.85rem 0.9rem',
            borderRadius: '10px',
            background: 'rgba(120, 140, 255, 0.12)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(245,245,250,0.95)',
          }}
        >
          <Spinner size="sm" color="default" />
          <span>Analyzing your audio (pronunciation, intonation, fluency). This usually takes a little while—scores below are from text sentiment in the meantime.</span>
        </div>
      ) : !hasVoiceAnalysis ? (
        <p
          style={{
            fontSize: '0.85rem',
            lineHeight: 1.45,
            opacity: 0.9,
            margin: '0.5rem 0 0.75rem',
            padding: '0.65rem 0.75rem',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)',
          }}
        >
          No microphone voice analysis for this session. The scores and breakdown below are from{' '}
          <strong>LLM sentiment</strong> on your pitch text (clarity, relevance, depth, neutrality, engagement).
        </p>
      ) : (
        <>
          <Assessment
            pronunciationAssessment={pronunciationAssessment}
            intonationAssessment={intonationAssessment}
            fluencyAssessment={fluencyAssessment}
          />

          <div className='select-assessment'>
            {assessments.map((assessment) => (
              <Button
                key={assessment}
                onPress={() => setSelectedAssessment(assessment)}
                className={`text-sm px-4 py-4 border transition-all ${
                  selectedAssessment === assessment
                    ? 'bg-gray-500 text-white border-gray-500'
                    : 'bg-transparent text-gray-500 border-gray-500'
                }`}
                variant='flat'
              >
                {assessment}
              </Button>
            ))}
          </div>

          <Transcript
            assessment={selectedAssessment}
            pronunciationAssessment={pronunciationAssessment}
            intonationAssessment={intonationAssessment}
            fluencyAssessment={fluencyAssessment}
          />
        </>
      )}

      <div className='chart-feedback-card'>
        <div className='chart-feedback-header'>
          <span>Sentiment Breakdown</span>
          <div className='average-score'>{roundedOverallScore}/5</div>
        </div>
        <ResponsiveContainer height={280}>
          <BarChart
            layout='vertical'
            data={barData}
          >
            <XAxis
              type='number'
              ticks={[1, 2, 3, 4, 5]}
              scale='linear'
            />
            <YAxis type='category' dataKey='name' width={90} />
            <Bar
              dataKey='value'
              label={false}
            >
              {barData.map((entry, index) => (
                <Cell
                  key={`bar-${entry.key ?? index}`}
                  fill={sentimentScoreColor(entry.value as number)}
                />
              ))}
            </Bar>
            <Tooltip
              cursor={{ fill: 'rgba(20, 24, 32, 0.35)' }}
              contentStyle={{
                background: 'rgba(18, 20, 26, 0.95)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: '10px',
                color: '#fff',
              }}
              labelStyle={{ color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className='metrics'>
          {sortedSentimentRows.map(({ key, label, feedback, score, accent }) => (
            <Section
              key={key}
              title={`${label} (${score}/5)`}
              feedback={feedback}
              headerAccentColor={accent}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SentimentInvestorPiechart;
