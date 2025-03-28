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
import Section from './Section';
import {
  FeedbackSpecificMetrics,
  FeedbackMetricData,
  AudioAnalysisMetrics
} from './KnowledgeClasses'; // Assuming you have these types
import '../styles/meter.css';
import AudioAnalyticsDescription from './AudioAnalyticsDescription';

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

  const [audioAnalyticsDescriptionVisibility, setAudioAnalyticsDescriptionVisibility] = useState({
    arousal: false,
    dominance: false,
    valence: false,
  });

  const toggleAudioAnalyticsDescriptionVisibility = (key: string) => {
    if (key === 'arousal') {
      setAudioAnalyticsDescriptionVisibility(prev => ({
        ...prev,
        arousal: !prev.arousal
      }));
    } else if (key === 'dominance') {
      setAudioAnalyticsDescriptionVisibility(prev => ({
        ...prev,
        dominance: !prev.dominance
      }));
    } else {
      setAudioAnalyticsDescriptionVisibility(prev => ({
        ...prev,
        valence: !prev.valence
      }));
    }
  };

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
  
  // const roundToTwoSignificantFigures = (num:any) => {
  //   if (num === 0) return 0;
  //   const factor = Math.pow(10, 2 - Math.floor(Math.log10(Math.abs(num))));
  //   return Math.round(num * factor) / factor;
  // };
  // const roundedArousal = roundToTwoSignificantFigures(arousal);
  // const roundedDominance = roundToTwoSignificantFigures(dominance);
  // const roundedValence = roundToTwoSignificantFigures(valence);

  // Colors for the meter chart
  const getMeterColor = (value: number) => {
    if (value < 50) return '#FF6B6B';
    if (value < 55) return '#FFC300';
    if (value < 60) return '#4ECDC4';
    if (value < 65) return '#45B7D1';
    return '#2AB673';
  };

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
      
      <div className='meter'>
        {Object.entries(audioAnalytics).map(([key, value]) => (
          <div
            key={key}
            className='progress hoverable'
            style={{ '--i': value, '--clr': getMeterColor(value) } as React.CSSProperties}
            onMouseEnter={() => toggleAudioAnalyticsDescriptionVisibility(key)}
            onMouseLeave={() => toggleAudioAnalyticsDescriptionVisibility(key)}
          >
            {audioAnalyticsDescriptionVisibility[key as keyof typeof audioAnalyticsDescriptionVisibility] && 
            <AudioAnalyticsDescription metric={key} value={value} />}
            <h4>{value.toFixed(1)}%</h4>
            <h5>{key.charAt(0).toUpperCase() + key.slice(1)}</h5>
          </div>
        ))}
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
