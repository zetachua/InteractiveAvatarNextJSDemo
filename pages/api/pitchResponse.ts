import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { pitchEvaluationPrompt, pitchEvaluationPrompt2, sentimentPitchPrompt} from './prompts';
import { feedbackFilter, rubricInvestorFilter, rubricInvestorFilter2 } from './completionFilterFunctions';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


const pitchResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory,selectedModel} = req.body;
      console.log('Request Body:', req.body);

      let rubricResult,sentimentResult,rubricResult2;
      // Run all API calls in parallel, or fetch rubric based on displayRubricAnalytics flag
      [rubricResult2,rubricResult,sentimentResult] = await Promise.all([
        fetchRubric(userInput,chatHistory, "rubric2", selectedModel),
        fetchRubric(userInput,chatHistory, "rubric", selectedModel),
        fetchSentiment(userInput, chatHistory, "sentiment",selectedModel),
        ]);

      let sentimentScore, sentimentSummary, sentimentMetrics;
      if (sentimentResult?.feedbackScore !== undefined) {
        sentimentScore = sentimentResult.feedbackScore;
        sentimentSummary = sentimentResult.feedbackSummary;
        sentimentMetrics = sentimentResult.feedbackMetrics;
      } else {
        console.log("Invalid sentiment data, keeping previous values.");
      }

      // Process sentiment feedback
      let rubricScore, rubricSummary, rubricMetrics,rubricSpecificFeedback;
      if (rubricResult?.rubricScore !== undefined) {
        rubricScore = rubricResult.rubricScore;
        rubricSummary = rubricResult.rubricSummary;
        rubricMetrics = rubricResult.rubricMetrics;
        rubricSpecificFeedback= rubricResult.rubricSpecificFeedback;
      } else {
        console.log("Invalid sentiment data, keeping previous values.");
      }

      let rubricScore2, rubricSummary2, rubricMetrics2,rubricSpecificFeedback2;
      if (rubricResult2?.rubricScore !== undefined) {
        rubricScore2 = rubricResult2.rubricScore;
        rubricSummary2 = rubricResult2.rubricSummary;
        rubricMetrics2 = rubricResult2.rubricMetrics;
        rubricSpecificFeedback2= rubricResult2.rubricSpecificFeedback;
        console.log("Invalid sentiment data, keeping previous values.");
      } else {
        console.log("Invalid sentiment data, keeping previous values.");
      }

      // Send response
      res.status(200).json({
        rubricScore,
        rubricSummary,
        rubricMetrics,
        rubricSpecificFeedback,
        rubricScore2,
        rubricSummary2,
        rubricMetrics2,
        rubricSpecificFeedback2,
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
    selectedPrompt=pitchEvaluationPrompt(userInput)
  } else if (promptType=='sentiment'){
    selectedPrompt=sentimentPitchPrompt(userInput,chatHistory)
  } else if (promptType=='rubric2'){
    selectedPrompt=pitchEvaluationPrompt2(userInput)
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


const fetchRubric = async (userInput:string, chatHistory: any[], promptType: string,selectedModel:any) => {
try {
  const rubricRatingCompletion = await getGroqChatCompletion(userInput, chatHistory, promptType, selectedModel);
  let responseContent = rubricRatingCompletion.choices[0].message.content;
  if (!responseContent) {
    throw new Error("Empty rubric response");
  }

  console.log(responseContent, "CHECK2Rubric responseContent");
  let filteredResponse;
  if (promptType==='rubric2'){
    filteredResponse = rubricInvestorFilter2(responseContent);
  }else{
    filteredResponse = rubricInvestorFilter(responseContent);
  }
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

