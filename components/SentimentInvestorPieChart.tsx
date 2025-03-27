import React, { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

  // Colors for the bar chart
  const getBarColor = (value: number) => {
    if (value <= 1) return '#FF6B6B';  // Red for low values
    if (value <= 2) return '#4ECDC4';  // Teal for medium values
    if (value <= 3) return '#45B7D1';  // Blue for higher values
    return '#2AB673';  // Green for highest values
  };

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
            justifyContent: 'center',
          }}
        >
          <b style={{ fontSize: '2rem' }}>Sentiment Overall</b>
          <div style={{ padding: '0.5rem' }}>{feedbackSummary}</div>
          <div
            style={{
              position: 'relative',
              margin: 'auto',
              marginTop: '.8rem',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              textAlign: 'center',
              width: '85%',
              color: '#fff',
            }}
          >
            {/* {!isAudioMetricDescriptionHidden && <div
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
            </div>} */}
            <div style={{ fontSize: '1.5rem' }}><b>Pitch Overall: {(roundedArousal+roundedDominance+roundedValence)/3<0.7?'Mid':(roundedArousal+roundedDominance+roundedValence)<0.8?'Good':'Excellent'}</b> </div>
            <b>Arousal:</b> {roundedArousal} | <b>Dominance:</b> {roundedDominance} | <b>Valence:</b> {roundedValence}
             <p></p>
             <div style={{textAlign:'left',padding:'0.5rem'}}>
              <p><b>Arousal:</b> Intensity of emotion.</p>
              <p><b>Dominance:</b> Perceived level of control associated with an emotion.</p>
              <p><b>Valence:</b> Pleasantness or unpleasantness of the emotion.</p>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: '2rem',
          fontWeight: 600,
          fontSize: '24px',
          borderRadius: '10px',
          padding: '0rem 1.2rem 0rem 1.2rem',
          color: '#000',
          backgroundColor: '#fff',
        }}
      >
        {roundedOverallScore}/5
      </div>
      <ResponsiveContainer style={{ marginTop: '3rem' }} width='90%' height={400}>
        <BarChart
          layout='vertical'
          data={chartData}
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
            {chartData.map((entry, index) => (
              <Cell
                key={`bar-${index}`}
                fill={getBarColor(entry.value)}
              />
            ))}
          </Bar>
          <Tooltip />
        </BarChart>
      </ResponsiveContainer>
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
