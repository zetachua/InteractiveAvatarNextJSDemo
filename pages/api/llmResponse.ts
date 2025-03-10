import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { StartupGroups } from '@/components/KnowledgeClasses';
import { feedbackPrompt, marketRelevancePrompt, startupPersonaPrompt} from './prompts';
import { startupKnowledgeJsonExtract } from './promptExtractFunctions';
import { feedbackFilter, suggestionsOptionsFilter } from './completionFilterFunctions';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let thematics: string[] = [];
let selectedJsonData: StartupGroups | undefined;
let rating=0;

const llmResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory, startupIdea, hypothesis, targetAudience,selectedModel} = req.body;
      console.log('Request Body:', req.body);

      if (userInput === "hello" || userInput === "start") thematics = [];

      // Extract Json Data based on groupName
      if (!selectedJsonData) {
        const { selectedCase } = await startupKnowledgeJsonExtract(startupIdea, hypothesis, targetAudience);
        selectedJsonData = selectedCase;
        console.log("i have a startup description")
      }

      let chatCompletion, sentimentResult;

      // Run all API calls in parallel, or fetch rubric based on displayRubricAnalytics flag
      [chatCompletion, sentimentResult] = await Promise.all([
          getGroqChatCompletion(userInput, chatHistory, "nus", "", selectedJsonData,selectedModel),
          fetchSentiment(userInput, chatHistory, selectedJsonData, "feedback", "",selectedModel),
        ]);

      // Process chat completion
      let responseContent = chatCompletion?.choices[0]?.message?.content;
      if (!responseContent) return res.status(400).json({ error: "Empty response from chat completion" });
      const { filteredResponseContent, suggestions } = suggestionsOptionsFilter(responseContent, rating);

      // Process sentiment feedback
      let feedbackScore, feedbackSummary, feedbackMetrics;
      if (sentimentResult?.feedbackScore !== undefined) {
        feedbackScore = sentimentResult.feedbackScore;
        feedbackSummary = sentimentResult.feedbackSummary;
        feedbackMetrics = sentimentResult.feedbackMetrics;
      } else {
        console.log("Invalid feedback data, keeping previous values.");
      }

      // Send response
      res.status(200).json({
        filteredResponseContent,
        suggestions,
        chatHistory: [
          ...chatHistory,
          { role: 'user', content: userInput },
          { role: 'assistant', content: responseContent },
        ],
        feedbackScore,
        feedbackSummary,
        feedbackMetrics,
      });

    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

// Function to fetch chat completion from Groq
export const getGroqChatCompletion = async (userInput: string, chatHistory: any, prompt:any,reply:any,selectedCase:any,selectedModel:any) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];
  // const {storyBookTitles,selectedStoryBook}= aiChildrenKnowledgeJsonFilter(userInput);
  // thematics.push(userInput)

  let selectedPrompt=""
  if (prompt=='nus'){
    selectedPrompt=startupPersonaPrompt(selectedCase)
  } else if (prompt=='feedback'){
    selectedPrompt=feedbackPrompt(userInput,reply,selectedCase.startup_idea)
  } else if (prompt='rubric'){
    selectedPrompt=marketRelevancePrompt(selectedCase.startup_idea,chatHistory)
  }  
  console.log(prompt,"startupPersonaPrompt",selectedPrompt)

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
    model: selectedModel,
  });
};

const fetchSentiment = async (userInput: string, chatHistory: any[], selectedJsonData: any, promptType: string, feedback: string,selectedModel:any) => {
  try {
    const rubricRatingCompletion = await getGroqChatCompletion(userInput, chatHistory, promptType, feedback, selectedJsonData,selectedModel);
    let responseContent = rubricRatingCompletion.choices[0].message.content;

    if (!responseContent) {
      throw new Error("Empty feedback response");
    }

    const filteredResponse = feedbackFilter(responseContent);

    if (!filteredResponse) {
      console.log("Invalid feedback JSON format, returning null");
      return null;  // Return null if parsing fails
    }

    return filteredResponse;
  } catch (error) {
    console.error("Error in fetchSentiment:", error);
    return null;  // Return null if an error occurs
  }
};

export default llmResponse;

