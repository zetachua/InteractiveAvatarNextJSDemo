import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, Text } from 'recharts';

// Define the type for feedback data
interface FeedbackData {
  clarity: number;
  relevance: number;
  depth: number;
  neutrality: number;
  engagement: number;
}

// Props for the component
interface FeedbackPieChartProps {
  data?: FeedbackData; // Optional data
  overallScore?: number; // New prop for the overall score
}

const FeedbackPieChart: React.FC<FeedbackPieChartProps> = ({ data, overallScore }) => {
  // Ensure data is always a valid FeedbackData object
  const feedbackData: FeedbackData = typeof data === 'object' && data !== null ? data : {
    clarity: 0,
    relevance: 0,
    depth: 0,
    neutrality: 0,
    engagement: 0,
  };

  // Convert the data into the format required for the PieChart
  const chartData = Object.entries(feedbackData).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
    value: value as number, // Ensure TypeScript recognizes this as a number
  }));

  // Define colors for each section
  const COLORS = ['#A8DADC', '#8BAFC5', '#1D3557', '#F1FAEE', '#839FB1'];

  const roundedOverallScore = overallScore !== undefined 
    ? Math.ceil((overallScore + Number.EPSILON) * 10) / 10 
    : 0;  
  console.log(roundedOverallScore,"overallScore")

  return (
    <div style={{ position: 'absolute', bottom: '-4rem', right: '-4rem',transform: 'scale(0.6)' }}>
      <div style={{fontWeight:600,fontSize:'24px',padding:'0rem 1.2rem 0rem 1.2rem',borderRadius:'10px',zIndex:'1000',position:'absolute',top:'45%',left:'50%',transform:'translate(-50%,-50%)',color:'#000',backgroundColor:'#fff'}} >
          {roundedOverallScore}
        </div>
      <PieChart width={400} height={400}>
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
  );
};

export default FeedbackPieChart;
