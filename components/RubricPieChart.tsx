import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, Text } from 'recharts';
import { RubricMetricData } from './KnowledgeClasses';


// Props for the component
interface RubricPieChartProps {
  displayRubricAnalytics:boolean;
  summary:string;
  data?: RubricMetricData; // Optional data
  overallScore?: number; // New prop for the overall score
}

const RubricPiechart: React.FC<RubricPieChartProps> = ({ data, overallScore,summary ,displayRubricAnalytics}) => {
  // Ensure data is always a valid rubricData object
  const rubricData: RubricMetricData = typeof data === 'object' && data !== null ? data : {
    marketResearchQuality: 0,
    painPointValidation: 0,
    marketOpportunity: 0,
    competitiveLandscapeAwareness: 0,
    customerAdoptionInsights: 0,
  };

  // Convert the data into the format required for the PieChart
  const chartData = Object.entries(rubricData).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
    value: value as number, // Ensure TypeScript recognizes this as a number
  }));

  // Define colors for each section
  const COLORS = ['#A8DADC', '#FBAFC5', '#1D3557', '#E1FAEE', '#E39FB1'];

  const roundedOverallScore = overallScore !== undefined 
    ? Math.ceil((overallScore + Number.EPSILON) * 10) / 10 
    : 0;  
  console.log(roundedOverallScore,"overallScore")

  return (
    <div style={{ position: 'absolute',display:'flex',justifyContent:'center',alignItems:'center',flexDirection:'column', bottom: '-6rem', right: '-7rem',transform: 'scale(0.6)' }}>
      {displayRubricAnalytics &&(<>
          <div style={{background:'rgba(255,255,255,0.1)',padding:'2rem',borderRadius:'50px',width:'400px',textAlign:'center'}}><b><u>Overall Summary:</u><br/>{summary}</b></div>
          <div style={{fontWeight:600,fontSize:'24px',padding:'0rem 1.2rem 0rem 1.2rem',borderRadius:'10px',zIndex:'1000',position:'absolute',top:'62%',left:'50%',transform:'translate(-50%,-50%)',color:'#000',backgroundColor:'#fff'}} >
            {roundedOverallScore}
          </div>
        </>)
        }
      <PieChart width={500} height={500}>
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

export default RubricPiechart;
