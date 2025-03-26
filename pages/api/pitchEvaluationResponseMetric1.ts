import { NextApiRequest, NextApiResponse } from 'next';
import { pitchEvaluationPromptMetric1} from './prompts';
import {metric1ResultInvestorFilter } from './completionFilterFunctions';
import { cleanResponse, getSonarChatCompletionForMetric, transformFeedback } from './pitchEvaluationResponseShared';

const pitchEvaluationResponseMetric1 = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory } = req.body;
      let metric1Result,citations,metric1Results;
      
        [metric1Results] = await Promise.all([
          fetchMetric1(userInput, chatHistory),
        ]);

        metric1Result = metric1Results?.rubricData;
        citations = metric1Results?.citations;
  
  
        let rubricScore2, rubricSummary2, rubricMetrics2, rubricSpecificFeedback2;
        if (metric1Result?.rubricScore !== undefined) {
          rubricScore2 = metric1Result.rubricScore;
          rubricSummary2 = metric1Result.rubricSummary;
          rubricMetrics2 = metric1Result.rubricMetrics;
          rubricSpecificFeedback2 = metric1Result.rubricSpecificFeedback;
        } else {
          console.log("Invalid rubric data, keeping previous values.");
        }
  
        res.status(200).json({
          rubricScore2,
          rubricSummary2,
          rubricMetrics2,
          rubricSpecificFeedback2,
          citations
        });

    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

const getSonarMetric1 = async (userInput: string, chatHistory: any) => {
  const prompt = pitchEvaluationPromptMetric1(userInput);
  return await getSonarChatCompletionForMetric(userInput, chatHistory, prompt);
};

const fetchMetric1 = async (userInput: string, chatHistory: any[]) => {
  try {
    let rubricRatingCompletion;
      const [metric1Result] = await Promise.all([
        getSonarMetric1(userInput, chatHistory),
      ]);

      console.log("Metric 1 Sonar LLM Completion:", JSON.stringify(metric1Result, null, 2));

      rubricRatingCompletion = {
        choices: [
          {
            message: {
              content:cleanSonarOutputMetric1(metric1Result),
            },
          },
        ],
      };

    let responseContent = rubricRatingCompletion?.choices[0].message.content;
    console.log('testFn4: successful cleanSonarOutputMetric1- JsonParse combined data ')

    if (!responseContent) {
      throw new Error("Empty rubric response");
    }

    let filteredResponse = metric1ResultInvestorFilter(responseContent);

    if (!filteredResponse) {
      console.log("Invalid rubric JSON format, returning null");
      return null;
    }

    const citations = metric1Result?.citations || [];
    const result = {
      rubricData: filteredResponse,
      citations: citations,
    };
    return result;

  } catch (error) {
    console.error("Error in fetchRubric:", error);
    return null;
  }
};

const cleanSonarOutputMetric1 = (metric1:any): string => {

  try {
    
    if (!metric1 ) {
      throw new Error("One or more metrics have invalid JSON.");
    }
    console.log("testFn metric1 begin")

    const metric1Data = JSON.parse(cleanResponse(metric1.choices[0].message.content));
    console.log(metric1Data,"testFn3 metric1: JSON.parse cleanResponse successful")

    const defaultMetric = {
      score: 0,
      feedback: "Not provided. Unable to evaluate due to missing data."
    };

    const validatedMetric1 = {
      elevatorPitch: metric1Data.elevatorPitch
        ? {
            ...metric1Data.elevatorPitch,
            feedback: transformFeedback({
              recap: metric1Data.elevatorPitch.recap,
              feedback: metric1Data.elevatorPitch.feedback,
              comparison: metric1Data.elevatorPitch.comparison,
              suggestion: metric1Data.elevatorPitch.suggestion,
            }),
          }
        : defaultMetric,
    
      team: metric1Data.team
        ? {
            ...metric1Data.team,
            feedback: transformFeedback({
              recap: metric1Data.team.recap,
              feedback: metric1Data.team.feedback,
              comparison: metric1Data.team.comparison,
              suggestion: metric1Data.team.suggestion,
            }),
          }
        : defaultMetric,
    
      marketOpportunity: metric1Data.marketOpportunity
        ? {
            ...metric1Data.marketOpportunity,
            feedback: transformFeedback({
              recap: metric1Data.marketOpportunity.recap,
              feedback: metric1Data.marketOpportunity.feedback,
              comparison: metric1Data.marketOpportunity.comparison,
              suggestion: metric1Data.marketOpportunity.suggestion,
            }),
          }
        : defaultMetric,
    };

    const scores = [
      validatedMetric1.elevatorPitch.score,
      validatedMetric1.team.score,
      validatedMetric1.marketOpportunity.score,
    ];
    const overallScore = Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / 3);
    const summary= metric1Data.summary;
    
    // const strengths = [];
    // const weaknesses = [];
    // const allMetrics = {
    //   elevatorPitch: validatedMetric1.elevatorPitch,
    //   team: validatedMetric1.team,
    //   marketOpportunity: validatedMetric1.marketOpportunity,
    // };
    // for (const [key, value] of Object.entries(allMetrics)) {
    //   if (value.score >= 7) strengths.push(key);
    //   if (value.score < 5) weaknesses.push(key);
    // }
    // const strengthWeakness = `The pitch shows potential with strengths in ${strengths.length ? strengths.join(', ') : 'none'}${weaknesses.length ? `, but needs improvement in ${weaknesses.join(', ')}` : ''}.`;
    
    const combinedData = {
      elevatorPitch: validatedMetric1.elevatorPitch,
      team: validatedMetric1.team,
      marketOpportunity: validatedMetric1.marketOpportunity,
      overallScore,
      summary,
      rubricSpecificFeedback: {
        elevatorPitch: validatedMetric1.elevatorPitch.feedback,
        team: validatedMetric1.team.feedback,
        marketOpportunity: validatedMetric1.marketOpportunity.feedback,
      },
    };

    return JSON.stringify(combinedData);

  } catch (error) {
    console.error("Error merging Sonar outputs:", error);
    const defaultData = {
      elevatorPitch: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      team: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      marketOpportunity: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      overallScore: 0,
      summary: "[Eleveator Pitch, Team, Market Opportunity] Failed to evaluate pitch due to parsing errors in Sonar responses.",
      rubricSpecificFeedback: {
        elevatorPitch: "Not provided. Unable to evaluate due to Sonar parsing error.",
        team: "Not provided. Unable to evaluate due to Sonar parsing error.",
        marketOpportunity: "Not provided. Unable to evaluate due to Sonar parsing error.",
      },
    };
    return JSON.stringify(defaultData);
  }
};

export default pitchEvaluationResponseMetric1;