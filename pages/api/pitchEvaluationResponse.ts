import { NextApiRequest, NextApiResponse } from 'next';
import {  pitchEvaluationPrompt2, pitchEvaluationPromptMetric1, pitchEvaluationPromptMetric2, pitchEvaluationPromptMetric3, sentimentPitchPrompt} from './prompts';
import {  rubricInvestorFilter, rubricInvestorFilter2 } from './completionFilterFunctions';
// Initialize Sonar client with Perplexity API
const sonar = {
  chat: {
    completions: {
      create: async (params: any) => {
        const { stream = false, ...restParams } = params;
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SONAR_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'sonar-reasoning', // Updated to match the template
            ...restParams
          })
        });

        if (stream) {
          return response.body; // Return stream for processing
        }
        return await response.json();
      }
    }
  }
};

const pitchEvaluationResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory, selectedModel } = req.body;
      let rubricResult2;
      
      [rubricResult2] = await Promise.all([
        fetchRubric2(userInput, chatHistory, "rubric2", selectedModel),
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

// // Function to fetch chat completion from Sonar
// const getSonarChatCompletion = async (userInput: string, chatHistory: any, promptType: any, selectedModel: any) => {
//   const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

//   let selectedPrompt = pitchEvaluationPrompt2(userInput);

//   return sonar.chat.completions.create({
//     messages: [
//       {
//         role: 'system',
//         content: selectedPrompt,
//       },
//       ...validChatHistory,
//       {
//         role: 'user',
//         content: userInput,
//       },
//     ],
//     model: 'sonar-reasoning', // Use selected model or default
//   });
// };

// Functions for each metric using Sonar
const getSonarMetric1 = async (userInput: string, chatHistory: any) => {
  const prompt = pitchEvaluationPromptMetric1(userInput);
  return await getSonarChatCompletionForMetric(userInput, chatHistory, prompt);
};

const getSonarMetric2 = async (userInput: string, chatHistory: any) => {
  const prompt = pitchEvaluationPromptMetric2(userInput);
  return await getSonarChatCompletionForMetric(userInput, chatHistory, prompt);
};

const getSonarMetric3 = async (userInput: string, chatHistory: any) => {
  const prompt = pitchEvaluationPromptMetric3(userInput);
  return await getSonarChatCompletionForMetric(userInput, chatHistory, prompt);
};
const getSonarChatCompletionForMetric = async (userInput: string, chatHistory: any, prompt: string) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];
  return sonar.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: prompt,
      },
      ...validChatHistory,
      {
        role: 'user',
        content: userInput,
      },
    ],
    model: 'sonar-reasoning', // Likely updated to a valid model like 'llama-3-70b'
  });
};
const fetchRubric2 = async (userInput: string, chatHistory: any[], promptType: string, selectedModel: any) => {
  try {
    let rubricRatingCompletion;
    if (promptType === 'rubric2') {
      const [metric1Result, metric2Result, metric3Result] = await Promise.all([
        getSonarMetric1(userInput, chatHistory),
        getSonarMetric2(userInput, chatHistory),
        getSonarMetric3(userInput, chatHistory),
      ]);

      console.log("Metric 1 Result:", JSON.stringify(metric1Result, null, 2));
      console.log("Metric 2 Result:", JSON.stringify(metric2Result, null, 2));
      console.log("Metric 3 Result:", JSON.stringify(metric3Result, null, 2));

      rubricRatingCompletion = {
        choices: [
          {
            message: {
              content: mergeSonarOutputs(metric1Result, metric2Result, metric3Result),
            },
          },
        ],
      };
    }
    // else {
    //   rubricRatingCompletion = await getSonarChatCompletion(userInput, chatHistory, promptType, selectedModel);
    // }

    let responseContent = rubricRatingCompletion?.choices[0].message.content;

    if (!responseContent) {
      throw new Error("Empty rubric response");
    }

    let filteredResponse = promptType === 'rubric2' 
      ? rubricInvestorFilter2(responseContent)
      : rubricInvestorFilter(responseContent);

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

const mergeSonarOutputs = (metric1: any, metric2: any, metric3: any): string => {
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

    if (!metric1 || !metric2 || !metric3) {
      throw new Error("One or more metrics have invalid JSON.");
    }

    const metric1Data = JSON.parse(cleanResponse(metric1.choices[0].message.content));
    const metric2Data = JSON.parse(cleanResponse(metric2.choices[0].message.content));
    const metric3Data = JSON.parse(cleanResponse(metric3.choices[0].message.content));

    const defaultMetric = {
      score: 0,
      feedback: "Not provided. Unable to evaluate due to missing data."
    };

    const validatedMetric1 = {
      elevatorPitch: metric1Data.elevatorPitch ? { ...metric1Data.elevatorPitch, feedback: transformFeedback(metric1Data.elevatorPitch.feedback) } : defaultMetric,
      team: metric1Data.team ? { ...metric1Data.team, feedback: transformFeedback(metric1Data.team.feedback) } : defaultMetric,
      marketOpportunity: metric1Data.marketOpportunity ? { ...metric1Data.marketOpportunity, feedback: transformFeedback(metric1Data.marketOpportunity.feedback) } : defaultMetric,
    };
    const validatedMetric2 = {
      marketSize: metric2Data.marketSize ? { ...metric2Data.marketSize, feedback: transformFeedback(metric2Data.marketSize.feedback) } : defaultMetric,
      solutionValueProposition: metric2Data.solutionValueProposition ? { ...metric2Data.solutionValueProposition, feedback: transformFeedback(metric2Data.solutionValueProposition.feedback) } : defaultMetric,
      competitivePosition: metric2Data.competitivePosition ? { ...metric2Data.competitivePosition, feedback: transformFeedback(metric2Data.competitivePosition.feedback) } : defaultMetric,
    };
    const validatedMetric3 = {
      tractionAwards: metric3Data.tractionAwards ? { ...metric3Data.tractionAwards, feedback: transformFeedback(metric3Data.tractionAwards.feedback) } : defaultMetric,
      revenueModel: metric3Data.revenueModel ? { ...metric3Data.revenueModel, feedback: transformFeedback(metric3Data.revenueModel.feedback) } : defaultMetric,
    };

    const scores = [
      validatedMetric1.elevatorPitch.score,
      validatedMetric1.team.score,
      validatedMetric1.marketOpportunity.score,
      validatedMetric2.marketSize.score,
      validatedMetric2.solutionValueProposition.score,
      validatedMetric2.competitivePosition.score,
      validatedMetric3.tractionAwards.score,
      validatedMetric3.revenueModel.score,
    ];
    const overallScore = Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / 8);

    const strengths = [];
    const weaknesses = [];
    const allMetrics = {
      elevatorPitch: validatedMetric1.elevatorPitch,
      team: validatedMetric1.team,
      marketOpportunity: validatedMetric1.marketOpportunity,
      marketSize: validatedMetric2.marketSize,
      solutionValueProposition: validatedMetric2.solutionValueProposition,
      competitivePosition: validatedMetric2.competitivePosition,
      tractionAwards: validatedMetric3.tractionAwards,
      revenueModel: validatedMetric3.revenueModel,
    };
    for (const [key, value] of Object.entries(allMetrics)) {
      if (value.score >= 7) strengths.push(key);
      if (value.score < 5) weaknesses.push(key);
    }
    const summary = `The pitch shows potential with strengths in ${strengths.length ? strengths.join(', ') : 'none'}, but needs improvement in ${weaknesses.length ? weaknesses.join(', ') : 'none'}.`;

    const combinedData = {
      elevatorPitch: validatedMetric1.elevatorPitch,
      team: validatedMetric1.team,
      marketOpportunity: validatedMetric1.marketOpportunity,
      marketSize: validatedMetric2.marketSize,
      solutionValueProposition: validatedMetric2.solutionValueProposition,
      competitivePosition: validatedMetric2.competitivePosition,
      tractionAwards: validatedMetric3.tractionAwards,
      revenueModel: validatedMetric3.revenueModel,
      overallScore,
      summary,
      rubricSpecificFeedback: {
        elevatorPitch: validatedMetric1.elevatorPitch.feedback,
        team: validatedMetric1.team.feedback,
        marketOpportunity: validatedMetric1.marketOpportunity.feedback,
        marketSize: validatedMetric2.marketSize.feedback,
        solutionValueProposition: validatedMetric2.solutionValueProposition.feedback,
        competitivePosition: validatedMetric2.competitivePosition.feedback,
        tractionAwards: validatedMetric3.tractionAwards.feedback,
        revenueModel: validatedMetric3.revenueModel.feedback,
      },
    };

    return JSON.stringify(combinedData);
  } catch (error) {
    console.error("Error merging Sonar outputs:", error);
    const defaultData = {
      elevatorPitch: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      team: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      marketOpportunity: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      marketSize: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      solutionValueProposition: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      competitivePosition: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      tractionAwards: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      revenueModel: { score: 0, feedback: "Not provided. Unable to evaluate due to Sonar parsing error." },
      overallScore: 0,
      summary: "Failed to evaluate pitch due to parsing errors in Sonar responses.",
      rubricSpecificFeedback: {
        elevatorPitch: "Not provided. Unable to evaluate due to Sonar parsing error.",
        team: "Not provided. Unable to evaluate due to Sonar parsing error.",
        marketOpportunity: "Not provided. Unable to evaluate due to Sonar parsing error.",
        marketSize: "Not provided. Unable to evaluate due to Sonar parsing error.",
        solutionValueProposition: "Not provided. Unable to evaluate due to Sonar parsing error.",
        competitivePosition: "Not provided. Unable to evaluate due to Sonar parsing error.",
        tractionAwards: "Not provided. Unable to evaluate due to Sonar parsing error.",
        revenueModel: "Not provided. Unable to evaluate due to Sonar parsing error.",
      },
    };
    return JSON.stringify(defaultData);
  }
};

export default pitchEvaluationResponse;