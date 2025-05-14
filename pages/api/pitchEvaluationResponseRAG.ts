import { NextApiRequest, NextApiResponse } from 'next';
import { ragSonar} from './prompts';
import { cleanResponse, getSonarChatCompletionForMetric } from './pitchEvaluationResponseShared';

const pitchEvaluationResponseRAG = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { chatHistory } = req.body;
      let results;
      
        results = await fetchCurrentMarketStats(chatHistory);
        const currentMarketStats=results?.responseContent;
        const citations=results?.citations;
        console.log(currentMarketStats,"RAG return api",citations);
        res.status(200).json({
          currentMarketStats,
          citations
        });

    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

const getSonarMetric1 = async (chatHistory: any) => {
  const prompt = ragSonar(chatHistory);
  return await getSonarChatCompletionForMetric(chatHistory, prompt);
};


const fetchCurrentMarketStats = async (chatHistory: any[]) => {
  try {
    let rubricRatingCompletion= await getSonarMetric1(chatHistory);

    let responseContent = rubricRatingCompletion?.choices[0].message.content;
    const citations = rubricRatingCompletion?.citations || [];
    const cleanedResponse=cleanResponse(responseContent);
    console.log("direct RAG completion LALALA",citations,"citations LALALA",cleanedResponse)

    if (!responseContent) {
      throw new Error("Empty rubric response");
    }
    const result={
        citations:citations, 
        responseContent:cleanedResponse
    }
    return result;

  } catch (error) {
    console.error("Error in fetchRubric:", error);
    return null;
  }
};

export default pitchEvaluationResponseRAG;