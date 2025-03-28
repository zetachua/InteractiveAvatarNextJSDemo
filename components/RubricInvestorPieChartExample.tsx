import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, Text } from 'recharts';
import { Rubric2InvestorSpecificDataExample, AudioAnalysisMetrics } from './KnowledgeClasses';
import Section from './Section';
import '../styles/meter.css';

// Props for the component
interface RubricInvestorPieChartProps2 {
  specificFeedback?: Rubric2InvestorSpecificDataExample;
  title:string;
  audioAnalytics: AudioAnalysisMetrics
}

const RubricInvestorPiechartExample: React.FC<RubricInvestorPieChartProps2> = ({
  specificFeedback,
  title,
  audioAnalytics
}) => {
  const rubricSpecificFeedback: Rubric2InvestorSpecificDataExample = specificFeedback ?? {} as Rubric2InvestorSpecificDataExample;
  const rubricOverallScore: number = specificFeedback?.score ?? 0;
  const rubricMetrics = {
    competitivePositionScore: specificFeedback?.competitivePositionScore,
    elevatorPitchScore: specificFeedback?.elevatorPitchScore,
    teamScore: specificFeedback?.teamScore,
    marketOpportunityScore: specificFeedback?.marketOpportunityScore,
    revenueModelScore: specificFeedback?.revenueModelScore,
    tractionAwardsScore: specificFeedback?.tractionAwardsScore,
    marketSizeScore: specificFeedback?.marketSizeScore,
  };
  const rubricSpecificFeedbackString = {
    competitivePosition: specificFeedback?.competitivePosition,
    elevatorPitch: specificFeedback?.elevatorPitch,
    team: specificFeedback?.team,
    marketOpportunity: specificFeedback?.marketOpportunity,
    revenueModel: specificFeedback?.revenueModel,
    tractionAwards: specificFeedback?.tractionAwards,
    marketSize: specificFeedback?.marketSize,
  };

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

  console.log(rubricSpecificFeedback, "all the metric feedback");

  const feedbackEntries = Object.entries(rubricSpecificFeedbackString || {});

  const chartData = Object.entries(rubricMetrics).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value as number,
  }));

  // Function to determine color based on score (0-1 scale assumed)
  const getColor = (score: number) => {
    if (score <= 5) {
      // Red gradient: darker red for lower scores, brighter red for higher scores up to 0.5
      const intensity = score / 5; // Normalize to 0-1 within red range (0 to 0.5)
      const redValue = Math.floor(100 + (155 * intensity)); // From #640000 (very dark red) to #FF0000 (bright red)
      return `rgb(${redValue}, 0, 0)`;
    } else {
      // Green gradient: darker green for scores just above 0.5, brighter green for higher scores
      const intensity = (score - 5) / 5; // Normalize to 0-1 within green range (0.5 to 1)
      const greenValue = Math.floor(100 + (155 * intensity)); // From #006400 (dark green) to #00FF00 (bright green)
      return `rgb(0, ${greenValue}, 0)`;
    }
  };

  const roundedOverallScore =
    rubricOverallScore !== undefined
      ? Math.ceil((rubricOverallScore + Number.EPSILON) * 10) / 10
      : 0;

  const getMeterColor = (value: number) => {
    if (value < 50) return '#FF6B6B';
    if (value < 55) return '#FFC300';
    if (value < 60) return '#4ECDC4';
    if (value < 65) return '#45B7D1';
    return '#2AB673';
  };

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
      }}>

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
          <b>{title} Startup LLM Analysis </b>
        </div>

        <div className='meter'>
          {Object.entries(audioAnalytics).map(([key, value]) => (
            <div
              key={key}
              className='progress'
              style={{ '--i': value, '--clr': getMeterColor(value) } as React.CSSProperties}
            >
              <h4>{value.toFixed(1)}%</h4>
              <h5>{key.charAt(0).toUpperCase() + key.slice(1)}</h5>
            </div>
          ))}
        </div>

        <div
          style={{
            fontWeight: 600,
            fontSize: '24px',
            padding: '0rem 1.2rem 0rem 1.2rem',
            borderRadius: '10px',
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
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.value)} />
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

export default RubricInvestorPiechartExample;