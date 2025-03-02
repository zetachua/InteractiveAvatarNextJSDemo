import { NextApiRequest, NextApiResponse } from 'next';
import { StartupGroups } from '@/components/KnowledgeClasses';
import { rubricFilter } from './completionFilterFunctions';
import { getGroqChatCompletion } from './llmResponse';
import { startupKnowledgeJsonExtract } from './promptExtractFunctions';

let selectedJsonData: StartupGroups | undefined;

const rubricResponse = async (req: NextApiRequest, res: NextApiResponse) => {
if (req.method === 'POST') {
  try {
    const { startupIdea, hypothesis, targetAudience,chatHistory } = req.body;
    console.log('Fetching rubric for:',chatHistory);

    if (!selectedJsonData) {
      const { selectedCase } = await startupKnowledgeJsonExtract(startupIdea, hypothesis, targetAudience);
      selectedJsonData = selectedCase;
      console.log("i have a startup description rubric")
    }

    const rubricResult = await fetchRubric(chatHistory, selectedJsonData, "rubric", "");

    if (!rubricResult || rubricResult.rubricSpecificFeedback === undefined) {
      return res.status(200).json({ 
          rubricMetrics:{
            painPointValidation: 1,
            marketOpportunity: 1,
            customerAdoptionInsights: 1,
          },
          rubricScore: 1,
          rubricSuggestedQuestions: [
            "What challenges do you face with your current solutions, and how important is it for you to find a better option?",
            "What would convince you to try a new product or service to address this issue, and how much would you be willing to invest in it?"
          ],
          rubricSummary: "No startup idea or interview data was provided to evaluate. As a result, all scores are set to a baseline of 1 out of 5. To provide a meaningful assessment, specific details about the problem, target market, and customer insights are needed. The suggested questions can help gather initial validation data.",
          rubricSpecificFeedback: {
            painPointValidation: "Without data, there’s no evidence of a validated pain point. Gathering insights on user challenges is a critical first step.",
            marketOpportunity: "No information available to assess market size, revenue potential, or competitive landscape. Market research is needed to evaluate opportunity.",
            customerAdoptionInsights: "Lack of data prevents analysis of customer behavior, urgency, or willingness to adopt a solution. User interviews could uncover these insights."
          }
      });
    }

    res.status(200).json({
      rubricScore: rubricResult.rubricScore,
      rubricSummary: rubricResult.rubricSummary,
      rubricMetrics: rubricResult.rubricMetrics,
      rubricSuggestedQuestions: rubricResult.rubricSuggestionQuestions,
      rubricSpecificFeedback: rubricResult.rubricSpecificFeedback
    });

  } catch (error) {
    console.error("Error fetching rubric:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
};

const fetchRubric = async (chatHistory: any[], selectedJsonData: any, promptType: string, feedback: string) => {
try {
  const rubricRatingCompletion = await getGroqChatCompletion('', chatHistory, promptType, '', selectedJsonData);
  let responseContent = rubricRatingCompletion.choices[0].message.content;
  if (!responseContent) {
    throw new Error("Empty rubric response");
  }

  console.log(responseContent, "CHECK2Rubric responseContent");
  const filteredResponse = rubricFilter(responseContent);
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

export default rubricResponse;

