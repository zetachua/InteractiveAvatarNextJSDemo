import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, Text } from 'recharts';
import { Button } from '@nextui-org/button';
import Section from './Section';
import {
  FeedbackSpecificMetrics,
  FeedbackMetricData,
  AudioAnalysisMetrics
} from './KnowledgeClasses'; // Assuming you have these types

// Props for the component
interface SentimentInvestorPieChartProps {
  audioAnalytics: AudioAnalysisMetrics;
  data: FeedbackMetricData; // Change from 'data' to 'feedbackData'
  overallScore:number;
  resetAllStates: () => void;
  totalRounds: number;
  feedbackSummary:string;
  specificFeedback:FeedbackSpecificMetrics;
}

const SentimentInvestorPiechart: React.FC<SentimentInvestorPieChartProps> = ({
  audioAnalytics,
  data,
  totalRounds,
  overallScore,
  resetAllStates,
  feedbackSummary,
  specificFeedback,
}) => {
  const {
    arousal,
    dominance,
    valence
  } = audioAnalytics;
  const [isAudioMetricDescriptionHidden, setIsAudioMetricDescriptionHidden] = useState(true);

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
  console.log(overallScore,"overallScore")

  // Construct the chart data
  const chartData = Object.entries(rubricMetrics).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value as number,
  }));
  
  const roundToTwoSignificantFigures = (num:any) => {
    if (num === 0) return 0;
    const factor = Math.pow(10, 2 - Math.floor(Math.log10(Math.abs(num))));
    return Math.round(num * factor) / factor;
  };
  const roundedArousal = roundToTwoSignificantFigures(arousal);
  const roundedDominance = roundToTwoSignificantFigures(dominance);
  const roundedValence = roundToTwoSignificantFigures(valence);

  // Colors for the pie chart
  const COLORS = [
    '#A8DADC', // Soft light blue
    '#FBAFC5', // Soft pink
    '#E1FAEE', // Light mint green
    '#F5D0C5', // Warm peach
    '#BFD8B8', // Soft sage green
    '#FFC1E3', // Pastel pink
    '#D1B3D3', // Light lavender
    '#FFE156', // Soft yellow
    '#C9E4CA', // Pale olive green
    '#FF9F1C'  // Warm orange
  ];

  const roundedOverallScore =
    overallScore !== undefined
      ? Math.ceil((overallScore + Number.EPSILON) * 10) / 10
      : 0;

  return (
    <div
      style={{
        padding: '3rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        position: 'relative',
        height: '100%',
        width: '100%',
        zIndex: '1001',
      }}
    >

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.1)',
            position: 'relative',
            padding: '1rem',
            borderRadius: '50px',
            textAlign: 'center',
            width: '90%',
            fontSize: '24px',
            marginBottom: '-2rem',
            justifyContent: 'center',
          }}
        >
          <b>Sentiment Overall</b>
          <div style={{ fontSize: '16px', padding: '0.5rem' }}>{feedbackSummary}</div>
          <div
            style={{
              position: 'relative',
              margin: 'auto',
              marginTop: '.8rem',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              textAlign: 'center',
              width: '80%',
              fontSize: '16px',
              color: '#fff',
            }}
            onMouseEnter={() => setIsAudioMetricDescriptionHidden(prev => !prev)}
            onMouseLeave={() => setIsAudioMetricDescriptionHidden(prev => !prev)}
          >
            {!isAudioMetricDescriptionHidden && <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(200, 200, 200)',
                color: '#fff',
                padding: '10px',
                borderRadius: '5px',
                fontSize: '14px',
              }}
            >
              <p><b>Arousal:</b> Represents the intensity of emotion.</p>
              <p><b>Dominance:</b> Measures the perceived level of control associated with an emotion.</p>
              <p><b>Valence:</b> Measures the pleasantness or unpleasantness of the emotion.</p>
            </div>}
            <b>Arousal:</b> {roundedArousal} | <b>Dominance:</b> {roundedDominance} | <b>Valence:</b> {roundedDominance}
          </div>
        </div>
        <div
          style={{
            fontWeight: 600,
            fontSize: '24px',
            borderRadius: '10px',
            padding: '0rem 1.2rem 0rem 1.2rem',
            zIndex: '1000',
            position: 'absolute',
            top: '27%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            color: '#000',
            backgroundColor: '#fff',
          }}
        >
          {roundedOverallScore}/5
        </div>
        <PieChart width={450} height={600}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={150}
            label
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>
      <div style={{ padding: '1rem' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            width: '100%',
          }}
        >
          {Object.entries(specificFeedback || {}).map(([metric, feedback]) => (
            <Section key={metric} title={metric} feedback={feedback as string} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SentimentInvestorPiechart;
