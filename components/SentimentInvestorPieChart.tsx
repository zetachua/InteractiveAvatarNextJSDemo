import React, { useState } from 'react';
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
  data: FeedbackMetricData; // Change from 'data' to 'feedbackData'
  overallScore:number;
  feedbackSummary:string;
  specificFeedback:FeedbackSpecificMetrics;
}

const assessments: AssessmentType[] = ['Pronunciation', 'Intonation', 'Fluency'];

const SentimentInvestorPiechart: React.FC<SentimentInvestorPieChartProps> = ({
  data,
  overallScore,
  feedbackSummary,
  specificFeedback,
  pronunciationAssessment,
  intonationAssessment,
  fluencyAssessment,
}) => {
  const hasVoiceAnalysis =
    pronunciationAssessment != null &&
    intonationAssessment != null &&
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

  // Construct the chart data
  const barData = Object.entries(rubricMetrics).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value as number,
  }));

  // Colors for the bar chart
  const getBarColor = (value: number) => {
    if (value <= 1) return '#FF6B6B';  // Red for low values
    if (value <= 2) return '#FFC300';  // Orange for low values
    if (value <= 3) return '#4ECDC4';  // Teal for medium values
    if (value <= 4) return '#45B7D1';  // Blue for higher values
    return '#2AB673';  // Green for highest values
  };

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
          <b>Sentiment Overall</b>
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

      {!hasVoiceAnalysis ? (
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
                  key={`bar-${index}`}
                  fill={getBarColor(entry.value)}
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
          {Object.entries(specificFeedback || {}).map(([metric, feedback]) => (
            <Section key={metric} title={metric} feedback={feedback as string} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SentimentInvestorPiechart;
