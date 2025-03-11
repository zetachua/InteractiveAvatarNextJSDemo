import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { pitchEvaluationPrompt, sentimentPitchPrompt} from './prompts';
import { feedbackFilter, rubricInvestorFilter } from './completionFilterFunctions';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


const pitchResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory,selectedModel} = req.body;
      console.log('Request Body:', req.body);

      let rubricResult,sentimentResult;
      // Run all API calls in parallel, or fetch rubric based on displayRubricAnalytics flag
      [rubricResult,sentimentResult] = await Promise.all([
          fetchRubric(chatHistory, "rubric", selectedModel),
          fetchSentiment(userInput, chatHistory, "feedback",selectedModel),
        ]);

      let sentimentScore, sentimentSummary, sentimentMetrics;
      if (sentimentResult?.feedbackScore !== undefined) {
        sentimentScore = sentimentResult.feedbackScore;
        sentimentSummary = sentimentResult.feedbackSummary;
        sentimentMetrics = sentimentResult.feedbackMetrics;
      } else {
        console.log("Invalid feedback data, keeping previous values.");
      }

      // Process sentiment feedback
      let rubricScore, rubricSummary, rubricMetrics,rubricSpecificFeedback;
      if (rubricResult?.rubricScore !== undefined) {
        rubricScore = rubricResult.rubricScore;
        rubricSummary = rubricResult.rubricSummary;
        rubricMetrics = rubricResult.rubricMetrics;
        rubricSpecificFeedback= rubricResult.rubricSpecificFeedback;
      } else {
        console.log("Invalid feedback data, keeping previous values.");
      }

      // Send response
      res.status(200).json({
        rubricScore,
        rubricSummary,
        rubricMetrics,
        rubricSpecificFeedback,
        sentimentScore,
        sentimentSummary,
        sentimentMetrics,
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

  let selectedPrompt=""
  if (promptType=='rubric'){
    selectedPrompt=pitchEvaluationPrompt(chatHistory)
  } else if (promptType=='feedback'){
    selectedPrompt=sentimentPitchPrompt(chatHistory)
  }
  console.log(promptType,"selectedPrompt",selectedPrompt)

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
  });
};

const fetchSentiment = async (userInput: string, chatHistory: any[], promptType: string, selectedModel:any) => {
  try {
    const rubricRatingCompletion = await getGroqChatCompletion(userInput, chatHistory, promptType,selectedModel);
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


const fetchRubric = async (chatHistory: any[], promptType: string,selectedModel:any) => {
try {
  const rubricRatingCompletion = await getGroqChatCompletion('', chatHistory, promptType, selectedModel);
  let responseContent = rubricRatingCompletion.choices[0].message.content;
  if (!responseContent) {
    throw new Error("Empty rubric response");
  }

  console.log(responseContent, "CHECK2Rubric responseContent");
  const filteredResponse = rubricInvestorFilter(responseContent);
  console.log(filteredResponse, "CHECK3Rubric filteredResponse");

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

export default pitchResponse;

