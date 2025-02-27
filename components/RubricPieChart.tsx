import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, Text } from 'recharts';
import { RubricMetricData, RubricSpecificData } from './KnowledgeClasses';
import { Button } from '@nextui-org/button';

// Props for the component
interface RubricPieChartProps {
  summary: string;
  suggestedQuestions: string[];
  specificFeedback: RubricSpecificData;
  data?: RubricMetricData; // Optional data
  overallScore?: number; // New prop for the overall score
}

const RubricPiechart: React.FC<RubricPieChartProps> = ({
  data,
  overallScore,
  summary,
  suggestedQuestions,
  specificFeedback,
}) => {
  const [totalCounter, setTotalCounter] = useState(0);

  // Ensure data is always a valid rubricData object
  const rubricData: RubricMetricData =
    typeof data === 'object' && data !== null
      ? data
      : {
          painPointValidation: 0,
          marketOpportunity: 0,
          customerAdoptionInsights: 0,
        };

  const copyToClipboard = (text: string) => {
    // Copy the summary text to clipboard
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert('Text copied to clipboard! Paste this in "Overall Summary Cell" in Excel Sheet');
      })
      .catch((error) => {
        console.error('Error copying text: ', error);
      });
  };

  // Combine all the data into one string with paragraphs
  const combinedText = `${summary}
  ${specificFeedback?.painPointValidation}
  ${specificFeedback?.marketOpportunity}
  ${specificFeedback?.customerAdoptionInsights}

  `;

  // Convert the data into the format required for the PieChart
  const chartData = Object.entries(rubricData).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
    value: value as number, // Ensure TypeScript recognizes this as a number
  }));

  // Define colors for each section
  const COLORS = ['#A8DADC', '#FBAFC5', '#E1FAEE'];

  const roundedOverallScore =
    overallScore !== undefined
      ? Math.ceil((overallScore + Number.EPSILON) * 10) / 10
      : 0;

  return (
    <div
      style={{
        background: 'rgba(50,51,52)',
        padding: '2rem',
        borderRadius: '50px',
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%,-50%) scale(0.6)',
        width: '100%',
      }}
    >
      <Button
        className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
        size="md"
        variant="shadow"
        style={{
          width: '200px',
          position: 'absolute',
          left: '11%',
          top: '-2%',
          transform: 'translate(-50%,-50%) scale(1.6)',
        }}
        onClick={() => window.location.reload()} // Refresh the page
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
            marginBottom:'-2rem'
          }}
        >
          <b>Overall Summary</b>
          <div style={{ fontSize: '16px', padding: '0.5rem' }}>{summary}</div>
        </div>
        <div
          style={{
            fontWeight: 600,
            fontSize: '24px',
            padding: '0rem 1.2rem 0rem 1.2rem',
            borderRadius: '10px',
            zIndex: '1000',
            position: 'absolute',
            top: '31%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            color: '#000',
            backgroundColor: '#fff',
          }}
        >
          {roundedOverallScore}/{totalCounter}
        </div>
        <PieChart width={450} height={450}>
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
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              position: 'relative',
              borderRadius: '10px',
            }}
          >
            <b>Pain Point Validation:</b>
            <p>{specificFeedback?.painPointValidation}</p>
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              position: 'relative',
              borderRadius: '10px',
            }}
          >
            <b>Market Opportunity:</b>
            <p>{specificFeedback?.marketOpportunity}</p>
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              position: 'relative',
              borderRadius: '10px',
            }}
          >
            <b>Customer Adoption Insights:</b>
            <p>{specificFeedback?.customerAdoptionInsights}</p>
          </div>
        </div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '1rem',
            borderRadius: '10px',
            marginTop: '20px',
            width: '100%',
            textAlign: 'left',
          }}
        >
          <b>Suggested Interview Questions:</b>
          <ul style={{ listStyleType: 'decimal', paddingLeft: '20px' }}>
            {suggestedQuestions?.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </div>
        <button
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
        </button>
      </div>
    </div>
  );
};

export default RubricPiechart;
