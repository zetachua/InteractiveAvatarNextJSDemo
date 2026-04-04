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
  specificFeedback:FeedbackSpecificMetrics;
}

export interface FeedbackSpecificMetrics {
  clarity: string;
  relevance: string;
  depth: string;
  neutrality: string;
  engagement: string;
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

/** Perplexity / web search reference for investor rubric UI */
export interface RubricCitationItem {
  title: string;
  url: string;
}

export interface Rubric2InvestorSpecificDataExample {
  elevatorPitch: string;
  team: string;
  marketOpportunity: string;
  marketSize: string;
  solutionValueProposition: string;
  competitivePosition: string;
  tractionAwards: string;
  revenueModel: string;
  score:number;
  elevatorPitchScore: number;
  teamScore: number;
  marketOpportunityScore: number;
  marketSizeScore: number;
  solutionValuePropositionScore: number;
  competitivePositionScore: number;
  tractionAwardsScore: number;
  revenueModelScore: number;
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


export interface Rubric3InvestorSpecificData {
  elevatorPitch: string;
  team: string;
  marketOpportunity: string;
  marketSize: string;
  solutionValueProposition: string;
  competitivePosition: string;
  tractionAwards: string;
  revenueModel: string;
}

export interface Rubric3InvestorData {
  elevatorPitch: {
    score:number;
    feedback:string;
  };
  team:{
    score:number;
    feedback:string;
  };
  marketOpportunity: {
    score:number;
    feedback:string;
  };
  marketSize: {
    score:number;
    feedback:string;
  };
  solutionValueProposition: {
    score:number;
    feedback:string;
  };
  competitivePosition: {
    score:number;
    feedback:string;
  };
  tractionAwards: {
    score:number;
    feedback:string;
  };
  revenueModel: {
    score:number;
    feedback:string;
  };
  overallScore: number;
  summary: string;
}


export interface Metric1InvestorData {
  elevatorPitch: {
    score:number;
    feedback:string;
  };
  team:{
    score:number;
    feedback:string;
  };
  marketOpportunity: {
    score:number;
    feedback:string;
  };
  tractionAwards: {
    score:number;
    feedback:string;
  };
  summary: string;
}


export interface Metric2InvestorData {
  marketSize: {
    score:number;
    feedback:string;
  };
  solutionValueProposition: {
    score:number;
    feedback:string;
  };
  competitivePosition: {
    score:number;
    feedback:string;
  };
  revenueModel: {
    score:number;
    feedback:string;
  };
  summary: string;
  /** Rival-founder counterplay (metric 2 Sonar JSON). */
  competitorCounterplay?: string;
}


export interface Metric3InvestorData {
  tractionAwards: {
    score:number;
    feedback:string;
  };
  revenueModel: {
    score:number;
    feedback:string;
  };
  summary: string;
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

export type AssessmentType = 'Pronunciation' | 'Intonation' | 'Fluency';

export interface Phoneme {
  phoneme: string;
  score: number;
}

export interface PronunciationWord {
  text: string;
  score: number;
  phonemes: Phoneme[];
}

export interface PronunciationAssessment {
  score: number;
  words: PronunciationWord[];
}

export interface Pitch {
  time: number;
  pitch: number;
}

export interface IntonationWord {
  text: string;
  expected: boolean;
  actual: boolean;
}

export interface IntonationAssessment {
  score: number;
  words: IntonationWord[];
  pitch: Pitch[];
}

export interface FluencyWord {
  text: string;
  filler?: boolean;
  hesitation?: number;
  gap?: number;
  classification?: 'good' | 'bad';
  reason?: string;
}

export interface FluencyAssessment {
  score: number;
  pause_score: number;
  articulation_rate_wpm: number;
  words: FluencyWord[];
}
