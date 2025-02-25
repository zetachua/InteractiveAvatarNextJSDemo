import { CaseStudy,StartupGroups,StoryBook } from '@/components/KnowledgeClasses';
import fs from 'fs';

export const nusKnowledgeJsonExtract = (userInput:string) =>{

    let selectedCase;
    // Load knowledge base
    const rawData = fs.readFileSync('./pages/api/json/knowledge.json', 'utf-8');
    const data = JSON.parse(rawData);
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
  
    return {uniqueIndustries,selectedCase}
  }


export const startupKnowledgeJsonExtract = (groupName:string) =>{

    let selectedCase: StartupGroups | undefined;
    // Load knowledge base
    const rawData = fs.readFileSync('./pages/api/json/startupIdeaKnowledge.json', 'utf-8');
    const data = JSON.parse(rawData);
    const knowledgeBase: StartupGroups[] = data.groups;

    selectedCase = knowledgeBase.find(group => group.group_name === groupName);

    if (!selectedCase) {
        selectedCase = 
        {
            "group_name": "Money_Savey",
            "startup_idea":"A platform offering personalized financial guidance for budgeting, saving, and investing (e.g., ETFs, stocks), with adjustable risk portfolios and a visual timeline to track goals, adjusting for unexpected expenses.",
            "industries": "Banking, Insurance",
            "target_audience": "Young Singaporeans; JC students, NSmen, undergrads, fresh graduates, financial advisors",
            "interview_learnings": "fresh_graduates: Earn SGD 3,000–6,000, aim to save 30% for goals like master’s/PhD; find current tools helpful for growth but not planning, lack urgency unclear. Undergrads/Graduates: Three types (job-ready, eager-to-learn, financially literate); want long/short-term goals (e.g., home by 30, trips), find tools boring/complex, prefer one-stop shop, dislike advisors/time-intensive processes, aim to grow savings but lack confidence. Financial_advisors: Note young people struggle with expenditure awareness; viability of integrated solutions uncertain due to payment reluctance.",
            "challenges": "Personalization, Monetization",
            "competitive_edge": "User-friendly design, Simple tools, Practical design",
            "competition": "Brokerage apps, ChatGPT"
          }  
    }

    return {selectedCase}
}

export const startupNameJsonExtract = (): string[] => {
  // Load knowledge base
  const rawData = fs.readFileSync('./pages/api/json/startupIdeaKnowledge.json', 'utf-8');
  const data = JSON.parse(rawData);
  const knowledgeBase: StartupGroups[] = data.groups;

  // Extract group names into an array of strings
  const GROUPNAMES = knowledgeBase.map(group => group.group_name);

  return GROUPNAMES;
};
  
export const aiChildrenKnowledgeJsonExtract = (userInput:string) =>{
  
    // Load knowledge base
    const rawData = fs.readFileSync('./pages/api/json/childrenKnowledge.json', 'utf-8');
    const data = JSON.parse(rawData);
    const storyBooks: StoryBook[] = data.stories;
  
    const storyBookTitles = storyBooks.map(story => story.title);
  
    // Find the selected storybook based on userInput
    const selectedStoryBook = storyBooks.find((story) =>
      story.title.toLowerCase().includes(userInput.toLowerCase())
    ) || null; // Return null if no match is found
  
    console.log(storyBooks,"hellu", selectedStoryBook,"hellu")
    return { storyBookTitles, selectedStoryBook };
  }