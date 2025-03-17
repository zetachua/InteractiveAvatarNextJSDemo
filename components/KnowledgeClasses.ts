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


export interface QnaData {
  question:string;
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
  painPointValidation: number;
  marketOpportunity: number;
  customerAdoptionInsights: number;
}
export interface RubricSpecificData {
  painPointValidation: string;
  marketOpportunity: string;
  customerAdoptionInsights: string;
}

export interface RubricData {
  painPointValidation: number;
  marketOpportunity: number;
  customerAdoptionInsights: number;
  overallScore: number;
  feedbackSummary: string;
  suggestedQuestions:string[];
  specificFeedback: RubricSpecificData;
}

export interface RubricInvestorMetricData {
  marketValidation: number;
  pitchDeck: number;
  oralPresentation: number;
}
export interface RubricInvestorSpecificData {
  marketValidation: string;
  pitchDeck: string;
  oralPresentation: string;
}
export interface RubricInvestorData {
  marketValidation: number;
  pitchDeck: number;
  oralPresentation: number;
  overallScore: number;
  summary: string;
  specificFeedback: RubricInvestorSpecificData;
}

export interface Rubric2InvestorMetricData {
  elevatorPitch: number;
  team: number;
  marketOpportunity: number;
  marketSize: number;
  solutionValueProposition: number;
  competitivePosition: number;
  tractionAwards: number;
  revenueModel: number;
}
export interface Rubric2InvestorSpecificData {
  elevatorPitch: string;
  team: string;
  marketOpportunity: string;
  marketSize: string;
  solutionValueProposition: string;
  competitivePosition: string;
  tractionAwards: string;
  revenueModel: string;
}

export interface Rubric2InvestorData {
  elevatorPitch: number;
  team: number;
  marketOpportunity: number;
  marketSize: number;
  solutionValueProposition: number;
  competitivePosition: number;
  tractionAwards: number;
  revenueModel: number;
  overallScore: number;
  summary: string;
  specificFeedback: Rubric2InvestorSpecificData;
}

export interface StartupGroups {
  startup_idea: string;
  target_audience: string;
  hypothesis:string;
}

export interface ChatHistory {
  role: 'user' | 'assistant'; // Define allowed roles
  content: string;
}
