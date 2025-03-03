import { FeedbackData, RubricData } from "@/components/KnowledgeClasses";

export const suggestionsOptionsFilter = (responseContent: string,rating:number) => {
  let filteredResponseContent = responseContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  let suggestions: string[] = [];
  let suggestionsMatch: RegExpMatchArray | null = null; // Initialize as null
  let feedbackMatch = filteredResponseContent.match(/<feedback\s*\/?>\s*(.*?)\s*<\/feedback\s*\/?>/);
  filteredResponseContent = feedbackMatch ? filteredResponseContent.replace(feedbackMatch[0], '').trim() : filteredResponseContent;

  // Match the "Here are some suggestions: ..." phrase and extract everything following it
  suggestionsMatch = filteredResponseContent.match(/<suggestions>\s*([\s\S]*?)\s*<\/suggestions>/);
  // console.log(suggestionsMatch, "suggestionsMatch");

  if (suggestionsMatch) {
    let suggestionsContent = suggestionsMatch[1].trim();
    // console.log(suggestionsContent, "suggestionsContent");

    // Split the suggestions, clean up unwanted symbols, and filter to ensure only words
    suggestions = suggestionsContent
      .split(/,\s*(?!or\s)/)  // Split by commas but avoid splitting 'or' cases
      .map(option => option.trim()) // Trim whitespace
      .map(option => option.replace(/[^\w\s]/g, '')) // Remove any non-word characters (e.g. **, $, etc.)
      .filter(option => option.length > 0); // Filter out empty strings
    

    // Remove the suggestions from the original content
    filteredResponseContent = filteredResponseContent.replace(suggestionsMatch[0], '').trim();
  }

  return { filteredResponseContent, suggestions,rating };
};


export const responseFilter = (responseContent: string) => {
  let filteredResponseContent = responseContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  let feedbackMatch = filteredResponseContent.match(/<feedback\s*\/?>\s*(.*?)\s*<\/feedback\s*\/?>/);
  filteredResponseContent = feedbackMatch ? filteredResponseContent.replace(feedbackMatch[0], '').trim() : filteredResponseContent;

  return { filteredResponseContent };
};


export const feedbackFilter = (responseContent: string) => {
  try {
    let feedbackJson = responseContent
      .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove <think> tags
      .replace(/```json|```/g, '')               // Remove ```json markers
      .trim();
      
    let feedbackJsonMatch = feedbackJson.match(/\{[\s\S]*\}/);
    feedbackJson = feedbackJsonMatch ? feedbackJsonMatch[0].trim() : '{}';
    console.log("Raw feedbackJson:", feedbackJson);

    const feedbackDataJson: FeedbackData = JSON.parse(feedbackJson);

    return {
      feedbackScore: feedbackDataJson.overallScore,
      feedbackSummary: feedbackDataJson.feedbackSummary,
      feedbackMetrics: {
        clarity: feedbackDataJson.clarity,
        relevance: feedbackDataJson.relevance,
        neutrality: feedbackDataJson.neutrality,
        engagement: feedbackDataJson.engagement,
        depth: feedbackDataJson.depth,
      }
    };
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null;
  }
};

export const rubricFilter = (responseContent: string) => {
  console.log(responseContent, "original responseContent");
  
  try {
    let rubricJson = responseContent
      .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove <think> tags
      .replace(/```json|```/g, '')               // Remove ```json markers
      .trim();
    
    let rubricJsonMatch = rubricJson.match(/\{[\s\S]*\}/);
    rubricJson = rubricJsonMatch ? rubricJsonMatch[0].trim() : '{}';
    console.log("Raw rubricJson:", rubricJson);

    let rubricDataJson: RubricData;

    // Try to parse the JSON, or use default fallback if parsing fails
    try {
      rubricDataJson = JSON.parse(rubricJson);
    } catch (error) {
      console.error("Error parsing rubric JSON, using default values:", error);
      // Default rubric values when no valid rubricJson is found
      rubricDataJson = {
        painPointValidation: 1,
        marketOpportunity: 1,
        customerAdoptionInsights: 1,
        overallScore: 1,
        suggestedQuestions: [
          "What challenges do you face with your current solutions, and how important is it for you to find a better option?",
          "What would convince you to try a new product or service to address this issue, and how much would you be willing to invest in it?"
        ],
        feedbackSummary: "No startup idea or interview data was provided to evaluate. As a result, all scores are set to a baseline of 1 out of 5. To provide a meaningful assessment, specific details about the problem, target market, and customer insights are needed. The suggested questions can help gather initial validation data.",
        specificFeedback: {
          painPointValidation: "Without data, there’s no evidence of a validated pain point. Gathering insights on user challenges is a critical first step.",
          marketOpportunity: "No information available to assess market size, revenue potential, or competitive landscape. Market research is needed to evaluate opportunity.",
          customerAdoptionInsights: "Lack of data prevents analysis of customer behavior, urgency, or willingness to adopt a solution. User interviews could uncover these insights."
        }
      };
    }

    if (rubricDataJson.overallScore==undefined) return;
    return {
      rubricScore: rubricDataJson.overallScore,
      rubricSummary: rubricDataJson.feedbackSummary,
      rubricMetrics: {
        painPointValidation: rubricDataJson.painPointValidation,
        marketOpportunity: rubricDataJson.marketOpportunity,
        customerAdoptionInsights: rubricDataJson.customerAdoptionInsights,
      },
      rubricSpecificFeedback: rubricDataJson.specificFeedback,
      rubricSuggestionQuestions: rubricDataJson.suggestedQuestions,
    };

  } catch (error) {
    console.error("Error in rubricFilter function:", error);
    return null;
  }
};
