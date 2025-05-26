import { NextApiRequest, NextApiResponse } from 'next';
import {sentimentPitchPrompt} from './prompts';
import { feedbackFilter } from './completionFilterFunctions';
import { getGroqChatCompletionForMetric } from './pitchEvaluationResponseShared';

const pitchSentimentResponse = async (req: NextApiRequest, res: NextApiResponse) => {

  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory,selectedModel} = req.body;
      let sentimentResult;

      [sentimentResult] = await Promise.all([
        fetchSentiment(userInput, chatHistory),
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

const fetchSentiment = async (userInput: string, chatHistory: any[]) => {
  try {
    const prompt=sentimentPitchPrompt(userInput,chatHistory);
    const sentimentRatingCompletion = await getGroqChatCompletionForMetric(chatHistory,prompt);
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

