import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { pitchEvaluationPrompt, pitchEvaluationPrompt2, pitchEvaluationPrompt3, pitchEvaluationPromptMetric1, pitchEvaluationPromptMetric2, pitchEvaluationPromptMetric3, sentimentPitchPrompt} from './prompts';
import { feedbackFilter, rubricInvestorFilter, rubricInvestorFilter2 } from './completionFilterFunctions';
import OpenAI from 'openai';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const pitchSentimentResponse = async (req: NextApiRequest, res: NextApiResponse) => {

  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory,selectedModel} = req.body;
      let sentimentResult;

      [sentimentResult] = await Promise.all([
        fetchSentiment(userInput, chatHistory, "sentiment",selectedModel),
        ]);

      let sentimentScore, sentimentSummary, sentimentMetrics,sentimentSpecifics;
      if (sentimentResult?.feedbackScore !== undefined) {
        sentimentScore = sentimentResult.feedbackScore;
        sentimentSummary = sentimentResult.feedbackSummary;
        sentimentMetrics = sentimentResult.feedbackMetrics;
        sentimentSpecifics= sentimentResult.feedbackSpecific;
      } else {
        console.log("Invalid sentiment data, keeping previous values.");
      }
      
      // Send response
      res.status(200).json({
        sentimentScore,
        sentimentSummary,
        sentimentMetrics,
        sentimentSpecifics
      });

    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

// Function to fetch chat completion from Groq
const getGroqChatCompletion = async (userInput: string, chatHistory: any, promptType:any,selectedModel:any) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

  let selectedPrompt=sentimentPitchPrompt(userInput,chatHistory)

  return groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: selectedPrompt,
      },
      ...validChatHistory,
      {
        role: 'user',
        content: userInput,
      },
    ],
    model: selectedModel,
    response_format: { type: "json_object" },
  });
};

const fetchSentiment = async (userInput: string, chatHistory: any[], promptType: string, selectedModel:any) => {
  try {
    const sentimentRatingCompletion = await getGroqChatCompletion(userInput, chatHistory, promptType,selectedModel);
    let responseContent = sentimentRatingCompletion.choices[0].message.content;

    if (responseContent==undefined) {
      throw new Error("Empty sentiment response");
    }

    const filteredResponse = feedbackFilter(responseContent);

    if (filteredResponse==undefined) {
      console.log("Invalid sentiment JSON format, returning null");
      return null;  // Return null if parsing fails
    }

    return filteredResponse;
  } catch (error) {
    console.error("Error in fetchSentiment:", error);
    return null;  // Return null if an error occurs
  }
};

export default pitchSentimentResponse;

