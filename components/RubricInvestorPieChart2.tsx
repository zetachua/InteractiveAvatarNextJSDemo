import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, Text } from 'recharts';
import { ChatHistory, Rubric2InvestorMetricData, Rubric2InvestorSpecificData } from './KnowledgeClasses';
import { Button } from '@nextui-org/button';
import Section from './Section';
import rubricData from './test.json'; // Import the JSON file

// Props for the component
interface RubricInvestorPieChartProps2 {
  chatHistory: ChatHistory[];
  resetAllStates: () => void;
  summary?: string; // Make optional since we're providing default from JSON
  totalRounds: number;
  specificFeedback?: Rubric2InvestorSpecificData; // Make optional
  data?: Rubric2InvestorMetricData; // Optional data
  overallScore?: number; // Optional overall score
}

const RubricInvestorPiechart2: React.FC<RubricInvestorPieChartProps2> = ({
  data,
  chatHistory,
  overallScore,
  totalRounds,
  summary,
  specificFeedback,
  resetAllStates,
}) => {
  // Use JSON data as fallback/default values
  const rubricMetrics: Rubric2InvestorMetricData = data || rubricData.rubricMetrics;
  const rubricSummary: string = summary || rubricData.rubricSummary;
  const rubricSpecificFeedback: Rubric2InvestorSpecificData = specificFeedback || rubricData.rubricSpecificFeedback;
  const rubricOverallScore: number = overallScore || rubricData.rubricScore;

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert('Text copied to clipboard! Paste this in "Overall Summary Cell" in Excel Sheet');
      })
      .catch((error) => {
        console.error('Error copying text: ', error);
      });
  };

  const combinedText = `${rubricSummary}
  ${rubricSpecificFeedback?.elevatorPitch}
  ${rubricSpecificFeedback?.team}
  ${rubricSpecificFeedback?.marketOpportunity}
  ${rubricSpecificFeedback?.marketSize}
  ${rubricSpecificFeedback?.solutionValueProposition}
  ${rubricSpecificFeedback?.competitivePosition}
  ${rubricSpecificFeedback?.tractionAwards}
  ${rubricSpecificFeedback?.revenueModel}
  `;

  const feedbackEntries = Object.entries(rubricSpecificFeedback || {});

  const downloadTextFile = () => {
    const chatText = chatHistory
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");
  
    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
  
    const a = document.createElement("a");
    a.href = url;
    a.download = "chatHistory.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const chartData = Object.entries(rubricMetrics).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value as number,
  }));

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
    rubricOverallScore !== undefined
      ? Math.ceil((rubricOverallScore + Number.EPSILON) * 10) / 10
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
      {/* Rest of your component remains the same, just update the props usage */}
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
          <div style={{ fontSize: '16px', padding: '0.5rem' }}>{rubricSummary}</div>
        </div>
        <div
          style={{
            fontWeight: 600,
            fontSize: '24px',
            padding: '0rem 1.2rem 0rem 1.2rem',
            borderRadius: '10px',
            zIndex: '1000',
            position: 'absolute',
            top: '15%',
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
          {feedbackEntries.map(([metric, feedback]) => (
            <Section key={metric} title={metric} feedback={feedback} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RubricInvestorPiechart2;