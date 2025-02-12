import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import fs from 'fs';
import { CaseStudy,FeedbackData,StoryBook } from '@/components/KnowledgeClasses';
import { nusPrompt, aiChildrenPrompt, feedbackPrompt} from './prompts';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
let thematics: string[] = [];
let oneOption=false;
let selectedCase: CaseStudy | null = null; // Store the selected case persistently
let rating=0;

const llmResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory } = req.body;
      console.log('Request Body:', req.body);

      if (userInput === "hello" || userInput === "start") thematics = [];

      // Fetch chat completion based on user input
      const chatCompletion = await getGroqChatCompletion(userInput, chatHistory, "nus", "");
      let responseContent = chatCompletion.choices[0].message.content;
      if (!responseContent) return res.status(400).json({ error: "Empty response from chat completion" });

      const { filteredResponseContent, suggestions, oneOption } = suggestionOptions(responseContent);

      // Fetch feedback rating
      const feedbackRatingCompletion = await getGroqChatCompletion(userInput, chatHistory, "feedback", filteredResponseContent);
      let responseFeedbackContent = feedbackRatingCompletion.choices[0].message.content;

      console.log("Raw responseFeedbackContent:", responseFeedbackContent); // Debugging

      if (!responseFeedbackContent) return res.status(400).json({ error: "Empty feedback response" });

      // Safely call feedbackFilter
      const feedbackResult = feedbackFilter(responseFeedbackContent);

      if (!feedbackResult) {
        console.error("Error parsing feedback JSON, returning default feedback.");
        return res.status(400).json({ error: "Invalid feedback JSON format" });
      }

      const { feedbackScore, feedbackSummary, feedbackMetrics } = feedbackResult;

      // Give response
      res.status(200).json({
        filteredResponseContent,
        suggestions,
        oneOption,
        chatHistory: [
          ...chatHistory,
          { role: 'user', content: userInput },
          { role: 'assistant', content: responseContent },
        ],
        feedbackScore,
        feedbackSummary,
        feedbackMetrics
      });

      console.log("userInput:", userInput, "response:", filteredResponseContent);
    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: 'Failed to fetch chat completion' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};


const suggestionOptions = (responseContent: string) => {
  let filteredResponseContent = responseContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  let suggestions: string[] = [];
  let suggestionsMatch: RegExpMatchArray | null = null; // Initialize as null
  let feedbackMatch = filteredResponseContent.match(/<feedback\s*\/?>\s*(.*?)\s*<\/feedback\s*\/?>/);
  filteredResponseContent = feedbackMatch ? filteredResponseContent.replace(feedbackMatch[0], '').trim() : filteredResponseContent;

  // Match the "Here are some suggestions: ..." phrase and extract everything following it
  suggestionsMatch = filteredResponseContent.match(/<suggestions>\s*([\s\S]*?)\s*<\/suggestions>/);
  console.log(suggestionsMatch, "suggestionsMatch");

  if (suggestionsMatch) {
    let suggestionsContent = suggestionsMatch[1].trim();
    console.log(suggestionsContent, "suggestionsContent");

    // Split the suggestions, clean up unwanted symbols, and filter to ensure only words
    suggestions = suggestionsContent
      .split(/,\s*(?!or\s)/)  // Split by commas but avoid splitting 'or' cases
      .map(option => option.trim()) // Trim whitespace
      .map(option => option.replace(/[^\w\s]/g, '')) // Remove any non-word characters (e.g. **, $, etc.)
      .filter(option => option.length > 0); // Filter out empty strings
    
    console.log(suggestions, "handleSuggestionClicks");

    // Remove the suggestions from the original content
    filteredResponseContent = filteredResponseContent.replace(suggestionsMatch[0], '').trim();
  }

  return { filteredResponseContent, suggestions,oneOption,rating };
};
const feedbackFilter = (responseContent: string) => {
  try {
    let feedbackJson = responseContent
      .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove <think> tags
      .replace(/```json|```/g, '')               // Remove ```json markers
      .trim();
      
    let feedbackJsonMatch = feedbackJson.match(/\{[\s\S]*\}/);
    feedbackJson = feedbackJsonMatch ? feedbackJsonMatch[0].trim() : '{}';
    console.log("Raw feedbackJson:", feedbackJson);

    const feedbackDataJson: FeedbackData = JSON.parse(feedbackJson);

    return {
      feedbackScore: feedbackDataJson.overallScore,
      feedbackSummary: feedbackDataJson.feedbackSummary,
      feedbackMetrics: {
        clarity: feedbackDataJson.clarity,
        relevance: feedbackDataJson.relevance,
        neutrality: feedbackDataJson.neutrality,
        engagement: feedbackDataJson.engagement,
        depth: feedbackDataJson.depth,
      }
    };
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null;
  }
};

const nusKnowledgeJsonFilter = (userInput:string) =>{

  // Load knowledge base
  const rawData = fs.readFileSync('./pages/api/knowledge.json', 'utf-8');
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
  console.log(nusPrompt(uniqueIndustries,selectedCase), 'selectedCase:', selectedCase, "uniqueIndustries",uniqueIndustries, "what am ii")

  return {uniqueIndustries,selectedCase}
}


const aiChildrenKnowledgeJsonFilter = (userInput:string) =>{

  // Load knowledge base
  const rawData = fs.readFileSync('./pages/api/childrenKnowledge.json', 'utf-8');
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

// Function to fetch chat completion from Groq
const getGroqChatCompletion = async (userInput: string, chatHistory: any, prompt:any,reply:any) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];
  const {uniqueIndustries,selectedCase}= nusKnowledgeJsonFilter(userInput);
  // const {storyBookTitles,selectedStoryBook}= aiChildrenKnowledgeJsonFilter(userInput);
  // thematics.push(userInput)

  let selectedPrompt=""
  if (prompt=='nus'){
    selectedPrompt=nusPrompt(uniqueIndustries,selectedCase)
  } else if (prompt=='feedback'){
    selectedPrompt=feedbackPrompt(userInput,reply)
  }
  
  return groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: selectedPrompt,
        // content: aiChildrenPrompt(storyBookTitles,selectedStoryBook,thematics[1]+thematics[2]),
      },
      ...validChatHistory,
      {
        role: 'user',
        content: userInput,
      },
    ],
    model: 'Deepseek-R1-Distill-Llama-70b',
        // model:"llama3-8b-8192",  

  });
};

export default llmResponse;
