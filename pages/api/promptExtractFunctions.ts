import { CaseStudy, StartupGroups, StoryBook } from '@/components/KnowledgeClasses';
import { start } from 'repl';

// Helper function to fetch JSON data
const fetchJsonData = async (fileName: string) => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${fileName}`);
    if (!res.ok) throw new Error(`Failed to fetch ${fileName}`);
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const nusKnowledgeJsonExtract = async (userInput: string) => {
  let selectedCase;
  // Fetch knowledge base
  const data = await fetchJsonData('knowledge.json');
  if (!data) return { uniqueIndustries: [], selectedCase: null };

  const knowledgeBase: CaseStudy[] = data.case_studies;

  // Find relevant cases
  const relevantCases = knowledgeBase.filter((caseStudy) =>
    caseStudy.industry.toLowerCase().includes(userInput.toLowerCase())
  );

  // Assign `selectedCase` only if it is null
  if (!selectedCase && relevantCases.length > 0) {
    selectedCase = relevantCases[Math.floor(Math.random() * relevantCases.length)];
  }

  // Fallback if no relevant case is found
  if (!selectedCase) {
    selectedCase = knowledgeBase.find((cs) => cs.industry.toLowerCase() === 'tourism') || null;
  }

  const uniqueIndustries = Array.from(new Set(knowledgeBase.map((caseStudy) => caseStudy.industry.toLowerCase())));

  return { uniqueIndustries, selectedCase };
};

export const startupKnowledgeJsonExtract = async (startupIdea:string,hypothesis:string,targetAudience:string) => {
  let selectedCase: StartupGroups | undefined;

  if (!startupIdea || !hypothesis || !targetAudience) {
    selectedCase = {
      startup_idea: "A platform offering personalized financial guidance for budgeting, saving, and investing (e.g., ETFs, stocks), with adjustable risk portfolios and a visual timeline to track goals, adjusting for unexpected expenses.",
      hypothesis:"Many young people struggle with managing their finances due to a lack of understanding, complexity in existing solutions, and a reluctance to seek financial advice. While they have long-term goals like homeownership, they lack detailed plans, prefer simple, one-stop financial tools, and are hesitant to engage with financial advisors due to concerns about cost and trust.",
      target_audience: 'a fresh graduate',
    };
  }
  else{
    selectedCase = {
      startup_idea:startupIdea,
      target_audience: targetAudience,
      hypothesis:hypothesis,
    };
  }

  return { selectedCase };
};

export const aiChildrenKnowledgeJsonExtract = async (userInput: string) => {
  // Fetch knowledge base
  const data = await fetchJsonData('childrenKnowledge.json');
  if (!data) return { storyBookTitles: [], selectedStoryBook: null };

  const storyBooks: StoryBook[] = data.stories;

  const storyBookTitles = storyBooks.map((story) => story.title);

  // Find the selected storybook based on userInput
  const selectedStoryBook =
    storyBooks.find((story) => story.title.toLowerCase().includes(userInput.toLowerCase())) || null;

  return { storyBookTitles, selectedStoryBook };
};
