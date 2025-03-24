import { NextApiRequest, NextApiResponse } from 'next';
import { pitchEvaluationPromptMetric2} from './prompts';
import {  metric2ResultInvestorFilter} from './completionFilterFunctions';
import { getSonarChatCompletionForMetric } from './pitchEvaluationResponseShared';

const pitchEvaluationResponseMetric2 = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory } = req.body;
      let rubricResult2;
      
      [rubricResult2] = await Promise.all([
        fetchMetric2(userInput, chatHistory),
      ]);

      let rubricScore2, rubricSummary2, rubricMetrics2, rubricSpecificFeedback2;
      if (rubricResult2?.rubricScore !== undefined) {
        rubricScore2 = rubricResult2.rubricScore;
        rubricSummary2 = rubricResult2.rubricSummary;
        rubricMetrics2 = rubricResult2.rubricMetrics;
        rubricSpecificFeedback2 = rubricResult2.rubricSpecificFeedback;
      } else {
        console.log("Invalid rubric data, keeping previous values.");
      }

      res.status(200).json({
        rubricScore2,
        rubricSummary2,
        rubricMetrics2,
        rubricSpecificFeedback2,
      });

    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

const getSonarMetric2 = async (userInput: string, chatHistory: any) => {
  const prompt = pitchEvaluationPromptMetric2(userInput);
  return await getSonarChatCompletionForMetric(userInput, chatHistory, prompt);
};


const fetchMetric2 = async (userInput: string, chatHistory: any[]) => {
  try {
    let rubricRatingCompletion;

      const [metric2Result] = await Promise.all([
        getSonarMetric2(userInput, chatHistory),
      ]);

      console.log("Metric 2 Result:", JSON.stringify(metric2Result, null, 2));

      rubricRatingCompletion = {
        choices: [
          {
            message: {
              content: cleanSonarOutputMetric2(metric2Result),
            },
          },
        ],
      };

    let responseContent = rubricRatingCompletion?.choices[0].message.content;

    if (!responseContent) {
      throw new Error("Empty rubric response");
    }

    let filteredResponse =metric2ResultInvestorFilter(responseContent);

    if (!filteredResponse) {
      console.log("Invalid rubric JSON format, returning null");
      return null;
    }
    return filteredResponse;
  } catch (error) {
    console.error("Error in fetchRubric:", error);
    return null;
  }
};


const cleanSonarOutputMetric2 = (metric2:any): string => {
  // This function remains largely the same as mergeDeepSeekOutputs
  // Only the name changes and error messages reference Sonar instead
  try {
    const cleanResponse = (content: string): string => {
      let cleaned = content
        .replace(/```json|```/g, '')
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      return jsonMatch[0];
    };

    const transformFeedback = (feedback: any): string => {
      if (typeof feedback === 'string') return feedback;
      const recap = feedback?.recap || "Not provided";
      const suggestions = feedback?.suggestions || "Unable to evaluate due to missing data.";
      return `${recap}. ${suggestions}`;
    };

    if (!metric2 ) {
      throw new Error("One or more metrics have invalid JSON.");
    }

    const metric2Data = JSON.parse(cleanResponse(metric2.choices[0].message.content));

    const defaultMetric = {
      score: 0,
      feedback: "Not provided. Unable to evaluate due to missing data."
    };

    
    const validatedMetric2 = {
      marketSize: metric2Data.marketSize ? { ...metric2Data.marketSize, feedback: transformFeedback(metric2Data.marketSize.feedback) } : defaultMetric,
      solutionValueProposition: metric2Data.solutionValueProposition ? { ...metric2Data.solutionValueProposition, feedback: transformFeedback(metric2Data.solutionValueProposition.feedback) } : defaultMetric,
      competitivePosition: metric2Data.competitivePosition ? { ...metric2Data.competitivePosition, feedback: transformFeedback(metric2Data.competitivePosition.feedback) } : defaultMetric,
    };
  

    const scores = [
      validatedMetric2.marketSize.score,
      validatedMetric2.solutionValueProposition.score,
      validatedMetric2.competitivePosition.score,
    ];
    const overallScore = Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / 3);

    const summary= metric2Data.summary;

    // const strengths = [];
    // const weaknesses = [];
    // const allMetrics = {
    //   marketSize: validatedMetric2.marketSize,
    //   solutionValueProposition: validatedMetric2.solutionValueProposition,
    //   competitivePosition: validatedMetric2.competitivePosition,
    // };
    // for (const [key, value] of Object.entries(allMetrics)) {
    //   if (value.score >= 7) strengths.push(key);
    //   if (value.score < 5) weaknesses.push(key);
    // }
    // const summary = `The pitch shows potential with strengths in ${strengths.length ? strengths.join(', ') : 'none'}, but needs improvement in ${weaknesses.length ? weaknesses.join(', ') : 'none'}.`;

    const combinedData = {
      marketSize: validatedMetric2.marketSize,
      solutionValueProposition: validatedMetric2.solutionValueProposition,
      competitivePosition: validatedMetric2.competitivePosition,
      overallScore,
      summary,
      rubricSpecificFeedback: {
        marketSize: validatedMetric2.marketSize.feedback,
        solutionValueProposition: validatedMetric2.solutionValueProposition.feedback,
        competitivePosition: validatedMetric2.competitivePosition.feedback,
      },
    };

    return JSON.stringify(combinedData);
  } catch (error) {
    console.error("Error merging Sonar outputs:", error);
    const defaultData = {
      marketSize: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      solutionValueProposition: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      competitivePosition: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      overallScore: 0,
      summary: "[Market Size, Solution Value Proposition, Compeititive Position] Failed to evaluate pitch due to parsing errors in Sonar responses.",
      rubricSpecificFeedback: {
        marketSize: "Not provided. Unable to evaluate due to Sonar parsing error.",
        solutionValueProposition: "Not provided. Unable to evaluate due to Sonar parsing error.",
        competitivePosition: "Not provided. Unable to evaluate due to Sonar parsing error.",
      },
    };
    return JSON.stringify(defaultData);
  }
};


export default pitchEvaluationResponseMetric2;