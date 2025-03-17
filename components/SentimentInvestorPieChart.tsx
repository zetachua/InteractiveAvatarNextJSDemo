import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, Text } from 'recharts';
import { Button } from '@nextui-org/button';
import Section from './Section';
import { FeedbackSpecificMetrics, FeedbackMetricData } from './KnowledgeClasses'; // Assuming you have these types

// Props for the component
interface SentimentInvestorPieChartProps {
  data: FeedbackMetricData; // Change from 'data' to 'feedbackData'
  overallScore:number;
  resetAllStates: () => void;
  totalRounds: number;
  feedbackSummary:string;
  specificFeedback:FeedbackSpecificMetrics;
}

const SentimentInvestorPiechart: React.FC<SentimentInvestorPieChartProps> = ({
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

  // Construct the chart data
  const chartData = Object.entries(rubricMetrics).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value as number,
  }));

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
      <Button
        className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
        size="md"
        variant="shadow"
        style={{
          width: '200px',
          position: 'absolute',
          left: '50%',
          top: '0%',
          transform: 'translate(-50%,-50%) scale(1.6)',
        }}
        onClick={() => {
          resetAllStates();
          window.location.reload();
        }}
      >
        Restart Round
      </Button>

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
            marginBottom: '-2rem'
          }}
        >
          <b>Rubric2 Overall</b>
          <div style={{ fontSize: '16px', padding: '0.5rem' }}>{feedbackSummary}</div>
        </div>
        <div
          style={{
            fontWeight: 600,
            fontSize: '24px',
            padding: '0rem 1.2rem 0rem 1.2rem',
            borderRadius: '10px',
            zIndex: '1000',
            position: 'absolute',
            top: '19%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            color: '#000',
            backgroundColor: '#fff',
          }}
        >
          {roundedOverallScore}/10
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
