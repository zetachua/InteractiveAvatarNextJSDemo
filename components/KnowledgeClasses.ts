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
