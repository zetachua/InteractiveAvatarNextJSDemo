import { CaseStudy, StartupGroups, StoryBook } from '@/components/KnowledgeClasses';

// Helper function to fetch JSON data
const fetchJsonData = async (fileName: string) => {
  try {
    const res = await fetch(`/${process.env.NEXT_PUBLIC_BASE_URL}/${fileName}`);
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

export const startupKnowledgeJsonExtract = async (groupName: string) => {
  let selectedCase: StartupGroups | undefined;
  // Fetch knowledge base
  const data = await fetchJsonData('startupIdeaKnowledge.json');
  if (!data) return { selectedCase: undefined };

  const knowledgeBase: StartupGroups[] = data.groups;

  selectedCase = knowledgeBase.find((group) => group.group_name === groupName);

  if (!selectedCase) {
    selectedCase = {
      group_name: 'Money_Savey',
      startup_idea: "A platform offering personalized financial guidance for budgeting, saving, and investing (e.g., ETFs, stocks), with adjustable risk portfolios and a visual timeline to track goals, adjusting for unexpected expenses.",
      industries: 'Banking, Insurance',
      target_audience: 'Young Singaporeans; JC students, NSmen, undergrads, fresh graduates, financial advisors',
      interview_learnings: 'fresh_graduates: Earn SGD 3,000–6,000, aim to save 30% for goals like master’s/PhD; find current tools helpful for growth but not planning, lack urgency unclear. Undergrads/Graduates: Three types (job-ready, eager-to-learn, financially literate); want long/short-term goals (e.g., home by 30, trips), find tools boring/complex, prefer one-stop shop, dislike advisors/time-intensive processes, aim to grow savings but lack confidence. Financial_advisors: Note young people struggle with expenditure awareness; viability of integrated solutions uncertain due to payment reluctance.',
      challenges: 'Personalization, Monetization',
      competitive_edge: 'User-friendly design, Simple tools, Practical design',
      competition: 'Brokerage apps, ChatGPT',
    };
  }

  return { selectedCase };
};

export const startupNameJsonExtract = async (): Promise<string[]> => {
  // Fetch knowledge base
  const data = await fetchJsonData('startupIdeaKnowledge.json');
  if (!data) return [];

  const knowledgeBase: StartupGroups[] = data.groups;

  // Extract group names into an array of strings
  const GROUPNAMES = knowledgeBase.map((group) => group.group_name);

  return GROUPNAMES;
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
