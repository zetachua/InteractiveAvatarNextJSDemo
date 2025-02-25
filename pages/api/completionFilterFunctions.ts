import { FeedbackData, RubricData } from "@/components/KnowledgeClasses";

export const suggestionsOptionsFilter = (responseContent: string,rating:number) => {
  let filteredResponseContent = responseContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  let suggestions: string[] = [];
  let suggestionsMatch: RegExpMatchArray | null = null; // Initialize as null
  let feedbackMatch = filteredResponseContent.match(/<feedback\s*\/?>\s*(.*?)\s*<\/feedback\s*\/?>/);
  filteredResponseContent = feedbackMatch ? filteredResponseContent.replace(feedbackMatch[0], '').trim() : filteredResponseContent;

  // Match the "Here are some suggestions: ..." phrase and extract everything following it
  suggestionsMatch = filteredResponseContent.match(/<suggestions>\s*([\s\S]*?)\s*<\/suggestions>/);
  console.log(suggestionsMatch, "suggestionsMatch");

  if (suggestionsMatch) {
    let suggestionsContent = suggestionsMatch[1].trim();
    console.log(suggestionsContent, "suggestionsContent");

    // Split the suggestions, clean up unwanted symbols, and filter to ensure only words
    suggestions = suggestionsContent
      .split(/,\s*(?!or\s)/)  // Split by commas but avoid splitting 'or' cases
      .map(option => option.trim()) // Trim whitespace
      .map(option => option.replace(/[^\w\s]/g, '')) // Remove any non-word characters (e.g. **, $, etc.)
      .filter(option => option.length > 0); // Filter out empty strings
    
    console.log(suggestions, "handleSuggestionClicks");

    // Remove the suggestions from the original content
    filteredResponseContent = filteredResponseContent.replace(suggestionsMatch[0], '').trim();
  }

  return { filteredResponseContent, suggestions,rating };
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
    try {
      let rubricJson = responseContent
        .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove <think> tags
        .replace(/```json|```/g, '')               // Remove ```json markers
        .trim();
        
      let rubricJsonMatch = rubricJson.match(/\{[\s\S]*\}/);
      rubricJson = rubricJsonMatch ? rubricJsonMatch[0].trim() : '{}';
      console.log("Raw rubricJson:", rubricJson);
  
      const rubricDataJson: RubricData = JSON.parse(rubricJson);
  
      return {
        rubricScore: rubricDataJson.overallScore,
        rubricSummary: rubricDataJson.feedbackSummary,
        rubricMetrics: {
          marketResearchQuality: rubricDataJson.marketResearchQuality,
          painPointValidation: rubricDataJson.painPointValidation,
          marketOpportunity: rubricDataJson.marketOpportunity,
          competitiveLandscapeAwareness: rubricDataJson.competitiveLandscapeAwareness,
          customerAdoptionInsights: rubricDataJson.customerAdoptionInsights,
        }
      };
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return null;
    }
  };
