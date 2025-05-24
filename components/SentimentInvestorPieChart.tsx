import React, { useEffect, useState } from 'react';
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
import {
  FeedbackSpecificMetrics,
  FeedbackMetricData,
  AssessmentType,
  PronunciationAssessment
} from './KnowledgeClasses'; // Assuming you have these types
import '../styles/SentimentInvestorPieChart.css';

// Props for the component
interface SentimentInvestorPieChartProps {
  pronunciationAssessment: PronunciationAssessment;
  data: FeedbackMetricData; // Change from 'data' to 'feedbackData'
  overallScore:number;
  resetAllStates: () => void;
  totalRounds: number;
  feedbackSummary:string;
  specificFeedback:FeedbackSpecificMetrics;
}

const assessments: AssessmentType[] = ['Pronunciation', 'Intonation', 'Fluency'];

const SentimentInvestorPiechart: React.FC<SentimentInvestorPieChartProps> = ({
  data,
  totalRounds,
  overallScore,
  resetAllStates,
  feedbackSummary,
  specificFeedback,
  pronunciationAssessment,
}) => {

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

  return (
    <div className='sentiment-analysis'>

      <div className='overall'>
          <b>Sentiment Overall</b>
          <div>{feedbackSummary}</div>
      </div>

      <div className='select-assessment'>
        {assessments.map((assessment) => (
          <Button
            key={assessment}
            onPress={() => setSelectedAssessment(assessment)}
            className={`text-xl px-6 py-7 border transition-all ${
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

      <Assessment
        assessment={selectedAssessment}
        pronunciationAssessment={pronunciationAssessment}
      />

      <div className='average-score'>{roundedOverallScore}/5</div>
      <ResponsiveContainer width='90%' height={400}>
        <BarChart
          layout='vertical'
          data={barData}
        >
          <XAxis
            type='number'
            ticks={[1, 2, 3, 4, 5]}
            scale='linear'
          />
          <YAxis type='category' dataKey='name' width={130} />
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
          <Tooltip />
        </BarChart>
      </ResponsiveContainer>
      <div className='metrics'>
        {Object.entries(specificFeedback || {}).map(([metric, feedback]) => (
          <Section key={metric} title={metric} feedback={feedback as string} />
        ))}
      </div>
    </div>
  );
};

export default SentimentInvestorPiechart;
