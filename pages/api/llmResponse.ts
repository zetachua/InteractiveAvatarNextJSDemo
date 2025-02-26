import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { StartupGroups } from '@/components/KnowledgeClasses';
import { feedbackPrompt, marketRelevancePrompt, startupPersonaPrompt} from './prompts';
import { startupKnowledgeJsonExtract } from './promptExtractFunctions';
import { feedbackFilter, rubricFilter, suggestionsOptionsFilter } from './completionFilterFunctions';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
let thematics: string[] = [];
let selectedJsonData: StartupGroups | undefined;
let rating=0;

const llmResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory,startupIdea,hypothesis,targetAudience } = req.body;
      console.log('Request Body:', req.body);

      if (userInput === "hello" || userInput === "start") thematics = [];

      // Extract Json Data based on groupName
      if (!selectedJsonData) {
        const { selectedCase } = await startupKnowledgeJsonExtract(startupIdea,hypothesis,targetAudience);
        selectedJsonData = selectedCase;
      }

      // Fetch chat completion based on user input
      const chatCompletion = await getGroqChatCompletion(userInput, chatHistory, "nus", "", selectedJsonData);
      let responseContent = chatCompletion.choices[0].message.content;
      if (!responseContent) return res.status(400).json({ error: "Empty response from chat completion" });

      const { filteredResponseContent, suggestions } = suggestionsOptionsFilter(responseContent, rating);

      // Fetch feedback rating and check for null
      let feedbackScore, feedbackSummary, feedbackMetrics;
      const feedbackResult = await fetchFeedback(userInput, chatHistory, selectedJsonData, "feedback", filteredResponseContent);
      if (feedbackResult) {
        feedbackScore = feedbackResult.feedbackScore;
        feedbackSummary = feedbackResult.feedbackSummary;
        feedbackMetrics = feedbackResult.feedbackMetrics;
      } else {
        console.log("Invalid feedback data, keeping previous values.");
      }

      // Fetch rubric rating and check for null
      let rubricScore, rubricSummary, rubricMetrics,rubricSuggestedQuestions,rubricSpecificFeedback;
      const rubricResult = await fetchRubric(userInput, chatHistory, selectedJsonData, "rubric", "");
      if (rubricResult?.rubricSpecificFeedback && rubricResult) {
        rubricScore = rubricResult.rubricScore;
        rubricSummary = rubricResult.rubricSummary;
        rubricMetrics = rubricResult.rubricMetrics;
        rubricSuggestedQuestions = rubricResult.rubricSuggestionQuestions;
        rubricSpecificFeedback = rubricResult.rubricSpecificFeedback;
        console.log("i have updated successfully")
      } else {
        console.log("Invalid rubric data, keeping previous values.");
      }

      // Give response
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
        rubricScore,
        rubricSummary,
        rubricMetrics,
        rubricSpecificFeedback,
        rubricSuggestedQuestions
      });

      console.log(rubricSpecificFeedback, rubricSuggestedQuestions,"meowmeow");
    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: 'Failed to fetch chat completion' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};


// Function to fetch chat completion from Groq
const getGroqChatCompletion = async (userInput: string, chatHistory: any, prompt:any,reply:any,selectedCase:any) => {
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
    model: 'Deepseek-R1-Distill-Llama-70b',
        // model:"llama3-8b-8192",  

  });
};



const fetchFeedback = async (userInput: string, chatHistory: any[], selectedJsonData: any, promptType: string, feedback: string) => {
  try {
    const rubricRatingCompletion = await getGroqChatCompletion(userInput, chatHistory, promptType, feedback, selectedJsonData);
    let responseContent = rubricRatingCompletion.choices[0].message.content;

    if (!responseContent) {
      throw new Error("CHECK1 Empty feedback response");
    }

    console.log(responseContent, "CHECK2 responseContent");
    const filteredResponse = feedbackFilter(responseContent);
    console.log(filteredResponse, "CHECK3 filteredResponse");

    if (!filteredResponse) {
      console.log("Invalid feedback JSON format, returning null");
      return null;  // Return null if parsing fails
    }

    return filteredResponse;
  } catch (error) {
    console.error("Error in fetchFeedback:", error);
    return null;  // Return null if an error occurs
  }
};

const fetchRubric = async (userInput: string, chatHistory: any[], selectedJsonData: any, promptType: string, feedback: string) => {
  try {
    const rubricRatingCompletion = await getGroqChatCompletion(userInput, chatHistory, promptType, '', selectedJsonData);
    let responseContent = rubricRatingCompletion.choices[0].message.content;
    if (!responseContent) {
      throw new Error("CHECK1 Empty rubric response");
    }

    console.log(responseContent, "CHECK2 responseContent");
    const filteredResponse = rubricFilter(responseContent);
    console.log(filteredResponse, "CHECK3 filteredResponse");

    if (!filteredResponse) {
      console.log("Invalid rubric JSON format, returning null");
      return null;  // Return null if parsing fails
    }

    return filteredResponse;
  } catch (error) {
    console.error("Error in fetchRubric:", error);
    return null;  // Return null if an error occurs
  }
};

export default llmResponse;

