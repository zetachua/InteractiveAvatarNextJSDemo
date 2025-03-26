import { NextApiRequest, NextApiResponse } from 'next';
import { pitchEvaluationPromptMetric3} from './prompts';
import {  metric3ResultInvestorFilter } from './completionFilterFunctions';
import { cleanResponse, getSonarChatCompletionForMetric, transformFeedback } from './pitchEvaluationResponseShared';

const pitchEvaluationResponseMetric3 = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory } = req.body;
      let rubricResult,rubricResult2,citations;

      [rubricResult] = await Promise.all([
        fetchMetric3(userInput, chatHistory),
      ]);
      rubricResult2 = rubricResult?.rubricData;
      citations = rubricResult?.citations;

      let rubricScore2, rubricSummary2, rubricMetrics2, rubricSpecificFeedback2;
      if (rubricResult2?.rubricScore !== undefined) {
        rubricScore2 = rubricResult2.rubricScore;
        rubricSummary2 = rubricResult2.rubricSummary;
        rubricMetrics2 = rubricResult2.rubricMetrics;
        rubricSpecificFeedback2 = rubricResult2.rubricSpecificFeedback;
      } else {
        console.log("Invalid rubric data, keeping previous values.");
      }

      console.log("score: ",rubricScore2, "summary: ",rubricSummary2,"metrics2: ", rubricMetrics2,"specific feedback:", rubricSpecificFeedback2,"testing metric 3 answer")
      res.status(200).json({
        rubricScore2,
        rubricSummary2,
        rubricMetrics2,
        rubricSpecificFeedback2,
        citations,
      });

    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

const getSonarMetric3 = async (userInput: string, chatHistory: any) => {
  const prompt = pitchEvaluationPromptMetric3(userInput);
  return await getSonarChatCompletionForMetric(userInput, chatHistory, prompt);
};

const fetchMetric3 = async (userInput: string, chatHistory: any[]) => {
  try {
    let rubricRatingCompletion;
      const [metric3Result] = await Promise.all([
        getSonarMetric3(userInput, chatHistory),
      ]);

      console.log("Metric 3 Sonar LLM Completion:", JSON.stringify(metric3Result, null, 2));

      rubricRatingCompletion = {
        choices: [
          {
            message: {
              content: cleanSonarOutputMetric3(metric3Result),
            },
          },
        ],
      };
      
    let responseContent = rubricRatingCompletion?.choices[0].message.content;

    if (!responseContent) {
      throw new Error("Empty rubric response");
    }

    let filteredResponse =metric3ResultInvestorFilter(responseContent);

    if (!filteredResponse) {
      console.log("Invalid rubric JSON format, returning null");
      return null;
    }
    const citations = metric3Result?.citations || [];
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

const cleanSonarOutputMetric3 = (metric3: any): string => {
  try {

    if (!metric3) {
      throw new Error("One or more metrics have invalid JSON.");
    }
    console.log("testFn metric3 begin")
    const metric3Data = JSON.parse(cleanResponse(metric3.choices[0].message.content));
    console.log(metric3Data,"testFn3 metric3: JSON.parse cleanResponse successful")

    const defaultMetric = {
      score: 0,
      feedback: "Not provided. Unable to evaluate due to missing data."
    };

    const validatedMetric3 = {
      tractionAwards: metric3Data.tractionAwards
        ? {
            ...metric3Data.tractionAwards,
            feedback: transformFeedback({
              recap: metric3Data.tractionAwards.recap,
              feedback: metric3Data.tractionAwards.feedback,
              comparison: metric3Data.tractionAwards.comparison,
              suggestions: metric3Data.tractionAwards.suggestion,
            }),
          }
        : defaultMetric,
      
      revenueModel: metric3Data.revenueModel
        ? {
            ...metric3Data.revenueModel,
            feedback: transformFeedback({
              recap: metric3Data.revenueModel.recap,
              feedback: metric3Data.revenueModel.feedback,
              comparison: metric3Data.revenueModel.comparison,
              suggestions: metric3Data.revenueModel.suggestion,
            }),
          }
        : defaultMetric,
    };

    const scores = [
      validatedMetric3.tractionAwards.score,
      validatedMetric3.revenueModel.score,
    ];

    const overallScore = Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / 2);

    const summary= metric3Data.summary;

    // const strengths = [];
    // const weaknesses = [];
    // const allMetrics = {
    //   tractionAwards: validatedMetric3.tractionAwards,
    //   revenueModel: validatedMetric3.revenueModel,
    // };
    // for (const [key, value] of Object.entries(allMetrics)) {
    //   if (value.score >= 7) strengths.push(key);
    //   if (value.score < 5) weaknesses.push(key);
    // }
    // const summary = `The pitch shows potential with strengths in ${strengths.length ? strengths.join(', ') : 'none'}, but needs improvement in ${weaknesses.length ? weaknesses.join(', ') : 'none'}.`;

    const combinedData = {
      tractionAwards: validatedMetric3.tractionAwards,
      revenueModel: validatedMetric3.revenueModel,
      overallScore,
      summary,
      rubricSpecificFeedback: {
        tractionAwards: validatedMetric3.tractionAwards.feedback,
        revenueModel: validatedMetric3.revenueModel.feedback,
      },
    };

    return JSON.stringify(combinedData);
  } catch (error) {
    console.error("Error merging Sonar outputs:", error);
    const defaultData = {
      tractionAwards: { score: 0, feedback: "Unable to evaluate due to Sonar parsing error." },
      revenueModel: { score: 0, feedback: "Unable to evaluate due to Sonar parsing error." },
      overallScore: 0,
      summary: "[Traction Awards, Revenue Model, Overall Score] Failed to evaluate pitch due to parsing errors in Sonar responses.",
      rubricSpecificFeedback: {
        tractionAwards: "Unable to evaluate due to Sonar parsing error.",
        revenueModel: "Unable to evaluate due to Sonar parsing error.",
      },
    };
    return JSON.stringify(defaultData);
  }
};

export default pitchEvaluationResponseMetric3;