import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
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
  const barData = Object.entries(rubricMetrics).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value as number,
  }));

  const radarData = Object.entries(audioAnalytics).map(([key, value]) => ({
    trait: key.charAt(0).toUpperCase() + key.slice(1),
    value: value as number,
  }));

  // const roundToTwoSignificantFigures = (num:any) => {
  //   if (num === 0) return 0;
  //   const factor = Math.pow(10, 2 - Math.floor(Math.log10(Math.abs(num))));
  //   return Math.round(num * factor) / factor;
  // };
  // const roundedArousal = roundToTwoSignificantFigures(arousal);
  // const roundedDominance = roundToTwoSignificantFigures(dominance);
  // const roundedValence = roundToTwoSignificantFigures(valence);

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

  return (
    <div
      style={{
        padding: '3rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        height: '100%',
        width: '100%',
        minWidth:'700px'
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
          <b style={{ fontSize: '24px' }}>Sentiment Overall</b>
          <div style={{ padding: '0.5rem' ,fontSize:'18px'}}>{feedbackSummary}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
        <RadarChart cy="70%" outerRadius={160} width={600} height={350} data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="trait" tick={{ dy: -20 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 20, opacity: 0.8 }} />
          <Radar name="Emotion Levels" dataKey="value" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
          <Tooltip contentStyle={{ color: 'black' }} />
        </RadarChart>
      </div>

      <div
        style={{
          margin: '2rem 2rem 2rem 0',
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
