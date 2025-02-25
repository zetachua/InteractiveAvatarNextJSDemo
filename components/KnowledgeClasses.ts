// Define the type for each case study object
export interface CaseStudy {
    id: number;
    title: string;
    author: string;
    institution: string;
    publication_year: number;
    industry: string;
    company: string;
    summary: string;
    key_decisions: string[];
    challenges: string[];
    outcomes: string[];
    decision_making_style: string;
    url: string;
  }


// Define the types for StoryBook and availableThemes
export interface StoryBook {
  title: string;
  characters: string;
  setting:string;
  plot: string;
  moral:string;
}


export interface FeedbackData {
  clarity: number;
  relevance: number;
  depth: number;
  neutrality: number;
  engagement: number;
  overallScore: number;
  feedbackSummary: string;
}

export interface FeedbackMetricData {
  clarity: number;
  relevance: number;
  depth: number;
  neutrality: number;
  engagement: number;
}

export interface RubricMetricData {
  marketResearchQuality: number;
  painPointValidation: number;
  marketOpportunity: number;
  competitiveLandscapeAwareness: number;
  customerAdoptionInsights: number;
}

export interface RubricData {
  marketResearchQuality: number;
  painPointValidation: number;
  marketOpportunity: number;
  competitiveLandscapeAwareness: number;
  customerAdoptionInsights: number;
  overallScore: number;
  feedbackSummary: string;
}

export interface StartupGroups {
  group_name: string;
  startup_idea: string;
  industries: string;
  target_audience: string;
  interview_learnings: string;
  challenges: string;
  competitive_edge: string;
  competition: string;
}
