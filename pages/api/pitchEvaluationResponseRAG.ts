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


/**
 * Sonar sometimes emits literal newlines inside JSON string values, producing
 * invalid JSON.  Walk the text with a tiny state machine and replace every
 * bare \n / \r inside a string with a space so JSON.parse can succeed.
 */
function sanitizeJsonNewlines(text: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) { result += ch; escaped = false; continue; }
      if (ch === '\\') { result += ch; escaped = true; continue; }
      if (ch === '"')  { inString = false; result += ch; continue; }
      if (ch === '\n' || ch === '\r') { result += ' '; continue; }
      result += ch;
    } else {
      if (ch === '"') inString = true;
      result += ch;
    }
  }
  return result;
}

const fetchCurrentMarketStats = async (chatHistory: any[]) => {
  try {
    const rubricRatingCompletion = await getSonarMetric1(chatHistory);
    const responseContent = rubricRatingCompletion?.choices[0].message.content;
    const citations = rubricRatingCompletion?.citations || [];

    if (!responseContent) throw new Error('Empty rubric response');

    // Sanitise literal newlines inside JSON strings before parsing
    const sanitized = sanitizeJsonNewlines(responseContent);
    const cleanedResponse = cleanResponse(sanitized);

    return { citations, responseContent: cleanedResponse };
  } catch (error) {
    console.error('Error in fetchRubric:', error);
    return null;
  }
};

export default pitchEvaluationResponseRAG;