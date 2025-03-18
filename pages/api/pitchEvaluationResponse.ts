import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { pitchEvaluationPrompt, pitchEvaluationPrompt2, pitchEvaluationPrompt3, pitchEvaluationPromptMetric1, pitchEvaluationPromptMetric2, pitchEvaluationPromptMetric3, sentimentPitchPrompt} from './prompts';
import { feedbackFilter, rubricInvestorFilter, rubricInvestorFilter2 } from './completionFilterFunctions';
import OpenAI from 'openai';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY
});

const pitchEvaluationResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory,selectedModel} = req.body;

      let rubricResult,sentimentResult,rubricResult2;
      // Run all API calls in parallel, or fetch rubric based on displayRubricAnalytics flag
      [rubricResult2,sentimentResult] = await Promise.all([
        fetchRubric2(userInput,chatHistory, "rubric2", selectedModel),
        // fetchRubric(userInput,chatHistory, "rubric", selectedModel),
        fetchSentiment(userInput, chatHistory, "sentiment",selectedModel),
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

      // Process sentiment feedback
      // let rubricScore, rubricSummary, rubricMetrics,rubricSpecificFeedback;
      // if (rubricResult?.rubricScore !== undefined) {
      //   rubricScore = rubricResult.rubricScore;
      //   rubricSummary = rubricResult.rubricSummary;
      //   rubricMetrics = rubricResult.rubricMetrics;
      //   rubricSpecificFeedback= rubricResult.rubricSpecificFeedback;
      // } else {
      //   console.log("Invalid sentiment data, keeping previous values.");
      // }

      let rubricScore2, rubricSummary2, rubricMetrics2,rubricSpecificFeedback2;
      if (rubricResult2?.rubricScore !== undefined) {
        rubricScore2 = rubricResult2.rubricScore;
        rubricSummary2 = rubricResult2.rubricSummary;
        rubricMetrics2 = rubricResult2.rubricMetrics;
        rubricSpecificFeedback2= rubricResult2.rubricSpecificFeedback;
        console.log(rubricScore2,rubricSummary2,rubricMetrics2,rubricSpecificFeedback2,"results deep seek api 4");
      } else {
        console.log("Invalid rubric data, keeping previous values.");
      }
      console.log("im exited deep seek api 5",rubricResult2)
      // Send response
      res.status(200).json({
      // rubricScore,
      // rubricSummary,
      // rubricMetrics,
      // rubricSpecificFeedback,
        rubricScore2,
        rubricSummary2,
        rubricMetrics2,
        rubricSpecificFeedback2,
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
  console.log("Selected Prompt pitch evaluation response",selectedPrompt,promptType)

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

// Functions for each metric
const getDeepSeekMetric1 = async (userInput: string, chatHistory: any) => {
  const prompt = pitchEvaluationPromptMetric1(userInput);
  return await getDeepSeekChatCompletionForMetric(userInput, chatHistory, prompt);
};

const getDeepSeekMetric2 = async (userInput: string, chatHistory: any) => {
  const prompt = pitchEvaluationPromptMetric2(userInput);
  return await getDeepSeekChatCompletionForMetric(userInput, chatHistory, prompt);
};

const getDeepSeekMetric3 = async (userInput: string, chatHistory: any) => {
  const prompt = pitchEvaluationPromptMetric3(userInput);
  return await getDeepSeekChatCompletionForMetric(userInput, chatHistory, prompt);
};

const getDeepSeekChatCompletionForMetric = async (userInput: string, chatHistory: any, prompt: string) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

  console.log(`Calling DeepSeek for prompt: ${prompt.substring(0, 50)}...`);

  // const chatCompletion = await deepseek.chat.completions.create({
  //   messages: [
  //     ...validChatHistory,
  //     {
  //       role: 'user',
  //       content: prompt,
  //     },
  //   ],
  //   max_completion_tokens: 3000, 
  //   model: "deepseek-reasoner",
  // });


  const chatCompletion = await groq.chat.completions.create({
    messages: [
        ...validChatHistory,
        {
          role: 'user',
          content: prompt,
        },
      ],
    model: 'Deepseek-R1-Distill-Llama-70b',
  });
  return chatCompletion;
};

const getDeepSeekChatCompletion = async (userInput: string, chatHistory: any) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

  let selectedPrompt = pitchEvaluationPrompt3(userInput);
  console.log("Selected Prompt pitch evaluation response deepseek api 1", selectedPrompt);

  // const chatCompletion = await deepseek.chat.completions.create({
  //     messages: [
  //         // Combine system and user message as in the example
  //         ...validChatHistory,
  //         {
  //           role: 'user',
  //           content: selectedPrompt,
  //         },
  //     ],
  //     max_completion_tokens: 8000,
  //     model:  "deepseek-reasoner", 
  // });


  const chatCompletion = await groq.chat.completions.create({
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
    model: 'Deepseek-R1-Distill-Llama-70b',
  });

  return chatCompletion;
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
  let rubricRatingCompletion;
  if(promptType==='rubric2') {
    rubricRatingCompletion = await getDeepSeekChatCompletion(userInput, chatHistory);
    console.log(rubricRatingCompletion,"completion i should be calling here deepseek api 1.5")
  }  
  else {
    rubricRatingCompletion = await getGroqChatCompletion(userInput, chatHistory, promptType, selectedModel);
  }
  let responseContent = rubricRatingCompletion.choices[0].message.content;

  console.log(responseContent,"responseContent deepseek api 2")
  if (!responseContent) {
    throw new Error("Empty rubric response");
  }

  let filteredResponse;
  if (promptType==='rubric2'){
    filteredResponse = rubricInvestorFilter2(responseContent);
  }else{
    filteredResponse = rubricInvestorFilter(responseContent);
  }
  console.log(filteredResponse,"filteredResponse deepseek api 3")

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

const fetchRubric2 = async (userInput: string, chatHistory: any[], promptType: string, selectedModel: any) => {
  try {
    let rubricRatingCompletion;
    if (promptType === 'rubric2') {
      // Run the three DeepSeek calls in parallel
      const [metric1Result, metric2Result, metric3Result] = await Promise.all([
        getDeepSeekMetric1(userInput, chatHistory),
        getDeepSeekMetric2(userInput, chatHistory),
        getDeepSeekMetric3(userInput, chatHistory),
      ]);

      // Log the results for debugging
      console.log("Metric 1 Result:", JSON.stringify(metric1Result, null, 2));
      console.log("Metric 2 Result:", JSON.stringify(metric2Result, null, 2));
      console.log("Metric 3 Result:", JSON.stringify(metric3Result, null, 2));

      // Merge the results into a single JSON string
      rubricRatingCompletion = {
        choices: [
          {
            message: {
              content: mergeDeepSeekOutputs(metric1Result, metric2Result, metric3Result),
            },
          },
        ],
      };
      console.log(rubricRatingCompletion, "completion after merging deepseek api 1.5");
    } else {
      rubricRatingCompletion = await getGroqChatCompletion(userInput, chatHistory, promptType, selectedModel);
    }

    let responseContent = rubricRatingCompletion.choices[0].message.content;

    console.log(responseContent, "responseContent deepseek api 2");
    if (!responseContent) {
      throw new Error("Empty rubric response");
    }

    let filteredResponse;
    if (promptType === 'rubric2') {
      filteredResponse = rubricInvestorFilter2(responseContent);
    } else {
      filteredResponse = rubricInvestorFilter(responseContent);
    }
    console.log(filteredResponse, "filteredResponse deepseek api 3");

    if (!filteredResponse) {
      console.log("Invalid rubric JSON format, returning null");
      return null; // Return null if parsing fails
    }
    return filteredResponse;
  } catch (error) {
    console.error("Error in fetchRubric:", error);
    return null; // Return null if an error occurs
  }
};
const mergeDeepSeekOutputs = (metric1: any, metric2: any, metric3: any): string => {
  try {
    const cleanResponse = (content: string): string => {
      // Remove markdown code blocks and other tags
      let cleaned = content
        .replace(/```json|```/g, '') // Remove ```json and ``` markers
        .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove <think> tags
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();

      // Extract the JSON portion using a regex that matches a JSON object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      return jsonMatch[0];
    };

    // Helper function to transform feedback into a single string
    const transformFeedback = (feedback: any): string => {
      if (typeof feedback === 'string') {
        return feedback; // Already a string, no transformation needed
      }
      // If feedback is an object with recap and suggestions, concatenate them
      const recap = feedback?.recap || "Not provided";
      const suggestions = feedback?.suggestions || "Unable to evaluate due to missing data.";
      return `${recap}. ${suggestions}`;
    };

    // Log raw responses for debugging
    console.log("Metric 1 Raw Response:", metric1.choices[0].message.content);
    console.log("Metric 2 Raw Response:", metric2.choices[0].message.content);
    console.log("Metric 3 Raw Response:", metric3.choices[0].message.content);

    // Clean and parse the individual metric responses
    const metric1Data = JSON.parse(cleanResponse(metric1.choices[0].message.content));
    const metric2Data = JSON.parse(cleanResponse(metric2.choices[0].message.content));
    const metric3Data = JSON.parse(cleanResponse(metric3.choices[0].message.content));

    // Validate and transform each metric, ensuring feedback is a string
    const defaultMetric = {
      score: 0,
      feedback: "Recap: Not provided Suggestions: Unable to evaluate due to missing data."
    };

    const validatedMetric1 = {
      elevatorPitch: metric1Data.elevatorPitch
        ? { ...metric1Data.elevatorPitch, feedback: transformFeedback(metric1Data.elevatorPitch.feedback) }
        : defaultMetric,
      team: metric1Data.team
        ? { ...metric1Data.team, feedback: transformFeedback(metric1Data.team.feedback) }
        : defaultMetric,
      marketOpportunity: metric1Data.marketOpportunity
        ? { ...metric1Data.marketOpportunity, feedback: transformFeedback(metric1Data.marketOpportunity.feedback) }
        : defaultMetric,
    };
    const validatedMetric2 = {
      marketSize: metric2Data.marketSize
        ? { ...metric2Data.marketSize, feedback: transformFeedback(metric2Data.marketSize.feedback) }
        : defaultMetric,
      solutionValueProposition: metric2Data.solutionValueProposition
        ? { ...metric2Data.solutionValueProposition, feedback: transformFeedback(metric2Data.solutionValueProposition.feedback) }
        : defaultMetric,
      competitivePosition: metric2Data.competitivePosition
        ? { ...metric2Data.competitivePosition, feedback: transformFeedback(metric2Data.competitivePosition.feedback) }
        : defaultMetric,
    };
    const validatedMetric3 = {
      tractionAwards: metric3Data.tractionAwards
        ? { ...metric3Data.tractionAwards, feedback: transformFeedback(metric3Data.tractionAwards.feedback) }
        : defaultMetric,
      revenueModel: metric3Data.revenueModel
        ? { ...metric3Data.revenueModel, feedback: transformFeedback(metric3Data.revenueModel.feedback) }
        : defaultMetric,
    };

    // Combine all scores to calculate overallScore
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

    // Generate a summary based on strengths and weaknesses
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

    // Combine all data into a single JSON object with the correct field name
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
    console.error("Error merging DeepSeek outputs:", error);
    // Return a default JSON string to allow the pipeline to continue
    const defaultData = {
      elevatorPitch: { score: 0, feedback: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error." },
      team: { score: 0, feedback: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error." },
      marketOpportunity: { score: 0, feedback: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error." },
      marketSize: { score: 0, feedback: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error." },
      solutionValueProposition: { score: 0, feedback: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error." },
      competitivePosition: { score: 0, feedback: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error." },
      tractionAwards: { score: 0, feedback: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error." },
      revenueModel: { score: 0, feedback: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error." },
      overallScore: 0,
      summary: "Failed to evaluate pitch due to parsing errors in DeepSeek responses.",
      rubricSpecificFeedback: {
        elevatorPitch: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error.",
        team: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error.",
        marketOpportunity: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error.",
        marketSize: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error.",
        solutionValueProposition: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error.",
        competitivePosition: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error.",
        tractionAwards: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error.",
        revenueModel: "Recap: Not provided Suggestions: Unable to evaluate due to parsing error.",
      },
    };
    return JSON.stringify(defaultData);
  }
};

export default pitchEvaluationResponse;

