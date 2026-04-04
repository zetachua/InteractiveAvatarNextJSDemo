import { NextApiRequest, NextApiResponse } from 'next';
import { pitchEvaluationPromptMetric2} from './prompts';
import {  metric2ResultInvestorFilter} from './completionFilterFunctions';
import { buildCitationItemsFromSonarResponse, cleanResponse, getSonarChatCompletionForMetric, transformFeedback } from './pitchEvaluationResponseShared';

const pitchEvaluationResponseMetric2 = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { currentMarketStats,chatHistory } = req.body;
      let rubricResult,citations,rubricResult2;

      rubricResult = await fetchMetric2(currentMarketStats, chatHistory);

      rubricResult2 = rubricResult?.rubricData;
      citations = rubricResult?.citations;

      let rubricScore2, rubricSummary2, rubricMetrics2, rubricSpecificFeedback2, competitorCounterplay2;
      if (rubricResult2?.rubricScore !== undefined) {
        rubricScore2 = rubricResult2.rubricScore;
        rubricSummary2 = rubricResult2.rubricSummary;
        rubricMetrics2 = rubricResult2.rubricMetrics;
        rubricSpecificFeedback2 = rubricResult2.rubricSpecificFeedback;
        competitorCounterplay2 =
          typeof (rubricResult2 as { competitorCounterplay?: string }).competitorCounterplay === 'string'
            ? String((rubricResult2 as { competitorCounterplay: string }).competitorCounterplay)
            : '';
      } else {
        console.log("Invalid rubric data, keeping previous values.");
      }

      res.status(200).json({
        rubricScore2,
        rubricSummary2,
        rubricMetrics2,
        rubricSpecificFeedback2,
        competitorCounterplay2,
        citations,
        citationItems: rubricResult?.citationItems ?? [],
      });

    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

const getSharktankMetric2 = async (currentMarketStats:string,chatHistory: any) => {
  const prompt = pitchEvaluationPromptMetric2(currentMarketStats,chatHistory);
  return await getSonarChatCompletionForMetric(chatHistory, prompt);
};

const fetchMetric2 = async (currentMarketStats:string,chatHistory: any[]) => {
  try {
    let rubricRatingCompletion;

      const metric2Result = await getSharktankMetric2(currentMarketStats,chatHistory);
      console.log(metric2Result,"direct metric2 completion")

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

    const citations = metric2Result?.citations || [];
    const citationItems = buildCitationItemsFromSonarResponse(metric2Result);

    const result = {
      rubricData: filteredResponse,
      citations,
      citationItems,
    };
    console.log('metric2 final result',result)
    return result;
  
  } catch (error) {
    console.error("Error in fetchRubric:", error);
    return null;
  }
};


const cleanSonarOutputMetric2 = (metric2:any): string => {
  // This function remains largely the same as mergeDeepSeekOutputs
  // Only the name changes and error messages reference Sonar instead
  try {

    if (!metric2 ) {
      throw new Error("One or more metrics have invalid JSON.");
    }
    console.log("testFn metric2 begin")

    const metric2Data = JSON.parse(cleanResponse(metric2.choices[0].message.content));
    console.log(metric2Data,"testFn3 metric2: JSON.parse cleanResponse successful")

    const defaultMetric = {
      score: 0,
      feedback: "Not provided. Unable to evaluate due to missing data."
    };

    const validatedMetric2 = {
      marketSize: metric2Data.marketSize
        ? {
            ...metric2Data.marketSize,
            feedback: transformFeedback({
              recap: metric2Data.marketSize.recap,
              feedback: metric2Data.marketSize.feedback,
              comparison: metric2Data.marketSize.comparison,
              suggestion: metric2Data.marketSize.suggestion,
            }),
          }
        : defaultMetric,
    
      solutionValueProposition: metric2Data.solutionValueProposition
        ? {
            ...metric2Data.solutionValueProposition,
            feedback: transformFeedback({
              recap: metric2Data.solutionValueProposition.recap,
              feedback: metric2Data.solutionValueProposition.feedback,
              comparison: metric2Data.solutionValueProposition.comparison,
              suggestion: metric2Data.solutionValueProposition.suggestion,
            }),
          }
        : defaultMetric,
    
      competitivePosition: metric2Data.competitivePosition
        ? {
            ...metric2Data.competitivePosition,
            feedback: transformFeedback({
              recap: metric2Data.competitivePosition.recap,
              feedback: metric2Data.competitivePosition.feedback,
              comparison: metric2Data.competitivePosition.comparison,
              suggestion: metric2Data.competitivePosition.suggestion,
            }),
          }
        : defaultMetric,

        revenueModel: metric2Data.revenueModel
        ? {
            ...metric2Data.revenueModel,
            feedback: transformFeedback({
              recap: metric2Data.revenueModel.recap,
              feedback: metric2Data.revenueModel.feedback,
              comparison: metric2Data.revenueModel.comparison,
              suggestion: metric2Data.revenueModel.suggestion,
            }),
          }
        : defaultMetric,
    };

    const scores = [
      validatedMetric2.marketSize.score,
      validatedMetric2.solutionValueProposition.score,
      validatedMetric2.competitivePosition.score,
      validatedMetric2.revenueModel.score,
    ];
    const overallScore = Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / 4);

    const summary = metric2Data.summary;
    const competitorCounterplay =
      typeof metric2Data.competitorCounterplay === 'string' ? metric2Data.competitorCounterplay : '';

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
      revenueModel: validatedMetric2.revenueModel,
      overallScore,
      summary,
      competitorCounterplay,
      rubricSpecificFeedback: {
        marketSize: validatedMetric2.marketSize.feedback,
        solutionValueProposition: validatedMetric2.solutionValueProposition.feedback,
        competitivePosition: validatedMetric2.competitivePosition.feedback,
        revenueModel: validatedMetric2.revenueModel.feedback,
      },
    };

    return JSON.stringify(combinedData);
  } catch (error) {
    console.error("Error merging Sonar outputs:", error);
    const defaultData = {
      marketSize: { score: 0, feedback: "Unable to evaluate due to Sonar parsing error." },
      solutionValueProposition: { score: 0, feedback: "Unable to evaluate due to Sonar parsing error." },
      competitivePosition: { score: 0, feedback: " Unable to evaluate due to Sonar parsing error." },
      revenueModel: { score: 0, feedback: " Unable to evaluate due to Sonar parsing error." },
      overallScore: 0,
      summary: "[Market Size, Solution Value Proposition, Competitive Position] Failed to evaluate pitch due to parsing errors in Sonar responses.",
      competitorCounterplay: "",
      rubricSpecificFeedback: {
        marketSize: "Unable to evaluate due to Sonar parsing error.",
        solutionValueProposition: "Unable to evaluate due to Sonar parsing error.",
        competitivePosition: "Unable to evaluate due to Sonar parsing error.",
        revenueModel: "Unable to evaluate due to Sonar parsing error.",
      },
    };
    return JSON.stringify(defaultData);
  }
};


export default pitchEvaluationResponseMetric2;