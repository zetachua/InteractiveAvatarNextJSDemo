import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, Text } from 'recharts';
import { Rubric2InvestorMetricData, Rubric2InvestorSpecificData } from './KnowledgeClasses';
import { Button } from '@nextui-org/button';
import Section from './Section';
// Props for the component
interface RubricInvestorPieChartProps2 {
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
  overallScore,
  totalRounds,
  summary,
  specificFeedback,
  resetAllStates,
}) => {
  const rubricMetrics: Rubric2InvestorMetricData = data ?? {} as Rubric2InvestorMetricData;
  const rubricSummary: string = summary ?? '';
  const rubricSpecificFeedback: Rubric2InvestorSpecificData = specificFeedback ?? {} as Rubric2InvestorSpecificData;
  const rubricOverallScore: number = overallScore ?? 0;
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

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

  const citationList = citations?.split(',').filter(Boolean) || [];
  const summaryPoints = rubricSummary
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const visibleSummaryPoints = showFullSummary ? summaryPoints : summaryPoints.slice(0, 4);

  return (
    <div
      style={{
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        position: 'relative',
        height: '100%',
        zIndex: '1001',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: '0.95rem',
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
            borderRadius: '20px',
            textAlign: 'center',
            width: '100%',
            fontSize: '1rem',
          }}
        >
          <b>Perplexity LLM Analysis Overall</b>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.45, padding: '0.3rem', textAlign: 'left' }}>
            <ul style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.75rem 0.95rem', margin: 0, textAlign: 'left' }}>
              {visibleSummaryPoints.map((point, index) => (
                <li key={`${point}-${index}`} style={{ marginBottom: '0.55rem' }}>
                  {point}{point.endsWith('.') ? '' : '.'}
                </li>
              ))}
            </ul>
            {summaryPoints.length > 4 && (
              <button
                onClick={() => setShowFullSummary(!showFullSummary)}
                style={{ marginTop: '0.45rem', border: 'none', background: 'transparent', color: '#9bb5ff', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                {showFullSummary ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
          <button
            onClick={() => setShowCitations(!showCitations)}
            style={{ marginTop: '0.25rem', border: 'none', background: 'transparent', color: '#9bb5ff', fontSize: '0.82rem', cursor: 'pointer' }}
          >
            {showCitations ? 'Hide citations' : `Show citations (${citationList.length})`}
          </button>
          {showCitations && (
            <div style={{ display: 'flex', maxHeight: '200px', marginTop: '0.5rem', overflow: 'auto', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', padding: '0.5rem', textAlign: 'left', whiteSpace: 'pre-line', background: 'rgba(255,255,255,0.06)', borderRadius: '12px' }}>
              <b>Reference Citations:</b>
              {citationList.map((citation, index) => (
                <div key={index}>
                  {index + 1}.{" "}
                  <u><a href={citation} target="_blank" rel="noopener noreferrer">
                    {citation}
                  </a></u>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ position: 'relative', marginTop: '2rem' }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.95rem',
              padding: '0.2rem 0.8rem',
              borderRadius: '12px',
              color: '#000',
              backgroundColor: '#fff',
              position: 'absolute',
              top: '8px',
              left: '14px',
              zIndex: 2,
            }}
          >
            {roundedOverallScore}/10
          </div>
          <PieChart width={450} height={350}>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
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
        </div>
      </div>
    </div>
  );
};

export default RubricInvestorPiechart2;