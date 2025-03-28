import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, Text } from 'recharts';
import { ChatHistory, Rubric2InvestorMetricData, Rubric2InvestorSpecificData } from './KnowledgeClasses';
import { Button } from '@nextui-org/button';
import Section from './Section';
// Props for the component
interface RubricInvestorPieChartProps2 {
  chatHistory: ChatHistory[];
  resetAllStates: () => void;
  summary?: string;
  totalRounds: number;
  specificFeedback?: Rubric2InvestorSpecificData;
  data?: Rubric2InvestorMetricData;
  overallScore?: number;
  citations?: string;
}

const RubricInvestorPiechart2: React.FC<RubricInvestorPieChartProps2> = ({
  data,
  citations,
  chatHistory,
  overallScore,
  totalRounds,
  summary,
  specificFeedback,
  resetAllStates,
}) => {
  const rubricMetrics: Rubric2InvestorMetricData = data ?? {} as Rubric2InvestorMetricData;
  const rubricSummary: string = summary ?? '';
  const formattedSummary = rubricSummary
    .split(/[.!?]\s+/)
    .filter(sentence => sentence.trim().length > 0)
    .map(sentence => `- ${sentence.trim()}`)
    .join('\n');
  const rubricSpecificFeedback: Rubric2InvestorSpecificData = specificFeedback ?? {} as Rubric2InvestorSpecificData;
  const rubricOverallScore: number = overallScore ?? 0;

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


  console.log(rubricSpecificFeedback, "all the metric feedback");
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

  const citationList = citations?.split(',');

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
      {/* <Button
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
      </Button> */}

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
          <b>Perplexity LLM Analysis Overall</b>
          <div style={{ fontSize: '18px', padding: '0.5rem', textAlign: 'left', whiteSpace: 'pre-line' }}>
            {formattedSummary} <br/>
            <span> </span>
            <b>Reference Citations:</b>
          </div>
          <div style={{ display: 'flex', maxHeight: '200px', marginTop: '1rem', overflow: 'scroll', flexDirection: 'column', gap: '1rem', fontSize: '16px', maxWidth: '90%', padding: '0.5rem', textAlign: 'left', whiteSpace: 'pre-line' }}>
            {citationList?.map((citation, index) => (
              <div key={index}>
                {index + 1}.
                <u><a href={citation} target="_blank" rel="noopener noreferrer">
                  {citation}
                </a></u>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            fontWeight: 600,
            fontSize: '24px',
            padding: '0rem 1.2rem 0rem 1.2rem',
            borderRadius: '10px',
            zIndex: '1000',
            position: 'absolute',
            top: '25%',
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
           {/* <button
          onClick={() => copyToClipboard(combinedText)}
          style={{
            position: 'absolute',
            right: '2%',
            top: '1%',
            padding: '0.5rem 1rem',
            border: 'none',
            background: 'rgba(255,255,255,0.4)',
            borderRadius: '50px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Copy All
        </button> */}
        <button
         style={{
          position: 'absolute',
          right: '-3%',
          top: '0',
          padding: '0.5rem 1rem',
          border: 'none',
          background: 'rgba(255,255,255,0.4)',
          borderRadius: '10px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '16px',
        }}
          onClick={() => downloadTextFile()}
        >
          Download ChatHistory
        </button>
        </div>
      </div>
    </div>
  );
};

export default RubricInvestorPiechart2;