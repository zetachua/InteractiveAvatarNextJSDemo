import { FeedbackData, Rubric2InvestorData, RubricData, RubricInvestorData } from "@/components/KnowledgeClasses";

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



export const rubricInvestorFilter = (responseContent: string) => {
  console.log(responseContent, "original responseContent");
  
  try {
    let rubricJson = responseContent
      .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove <think> tags
      .replace(/```json|```/g, '')               // Remove ```json markers
      .trim();
    
    let rubricJsonMatch = rubricJson.match(/\{[\s\S]*\}/);
    rubricJson = rubricJsonMatch ? rubricJsonMatch[0].trim() : '{}';
    console.log("Raw rubricJson:", rubricJson);

    let rubricDataJson: RubricInvestorData;

    // Try to parse the JSON, or use default fallback if parsing fails
    try {
      rubricDataJson = JSON.parse(rubricJson);
    } catch (error) {
      console.error("Error parsing rubric JSON, using default values:", error);
      // Default rubric values when no valid rubricJson is found
      rubricDataJson = {
        marketValidation: 3,
        pitchDeck: 4,
        oralPresentation: 5,
        overallScore: 4,
        summary: "The pitch lacks strong market validation, and the deck is not compelling. The oral presentation is basic and needs significant improvement to capture investor interest.",
        specificFeedback: {
          marketValidation: "The market validation is weak, with limited evidence of customer interest or traction. The student should provide more specific data or testimonials to demonstrate the product’s value and demand.",
          pitchDeck: "The pitch deck is lacking in key areas such as market opportunity, competition analysis, and customer acquisition strategy. The team’s experience is barely mentioned, and the overall structure feels underdeveloped.",
          oralPresentation: "The presenter spoke in a monotone, without much enthusiasm or engagement. The pitch felt rushed and lacked clarity, making it hard for investors to grasp the full value of the startup."
        }
      };
    }

    if (rubricDataJson.overallScore==undefined) return;
    return {
      rubricScore: rubricDataJson.overallScore,
      rubricSummary: rubricDataJson.summary,
      rubricMetrics: {
        marketValidation: rubricDataJson.marketValidation,
        pitchDeck: rubricDataJson.pitchDeck,
        oralPresentation: rubricDataJson.oralPresentation,
      },
      rubricSpecificFeedback: rubricDataJson.specificFeedback,
    };

  } catch (error) {
    console.error("Error in rubricFilter function:", error);
    return null;
  }
};



export const rubricInvestorFilter2 = (responseContent: string) => {
  console.log(responseContent, "original responseContent rubric2");
  
  try {
    let rubricJson = responseContent
      .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove <think> tags
      .replace(/```json|```/g, '')               // Remove ```json markers
      .trim();
    
    let rubricJsonMatch = rubricJson.match(/\{[\s\S]*\}/);
    rubricJson = rubricJsonMatch ? rubricJsonMatch[0].trim() : '{}';
    console.log("Raw rubricJson2:", rubricJson);

    let rubricDataJson: Rubric2InvestorData;

    // Try to parse the JSON, or use default fallback if parsing fails
    try {
      rubricDataJson = JSON.parse(rubricJson);
    } catch (error) {
      console.error("Error parsing rubric JSON, using default values:", error);
      // Default rubric values when no valid rubricJson is found
      rubricDataJson = {
          elevatorPitch: 5,
          team: 4,
          marketOpportunity: 5,
          marketSize: 3,
          solutionValueProposition: 5,
          competitivePosition: 2,
          tractionAwards: 3,
          revenueModel: 4,
          overallScore: 3.8,
          summary: "The pitch lacks clarity and engagement, making it difficult to capture investor interest. The presentation was disorganized, and key details on market validation and differentiation were missing. While the problem was articulated, the solution lacked a compelling value proposition. Significant improvements are needed in competitive positioning, revenue modeling, and team credibility.",
          specificFeedback: {
            elevatorPitch: "The opening statement was generic and did not effectively hook the audience. The pitch lacked a strong narrative to engage investors.",
            team: "The founders’ background was mentioned but failed to establish why they are the right team for this venture.",
            marketOpportunity: "The problem was described, but the urgency and customer pain points were not well-supported by data.",
            marketSize: "Market size estimates were vague, with no clear distinction between TAM, SAM, and SOM.",
            solutionValueProposition: "The proposed solution was explained, but it was unclear how it significantly improves upon existing alternatives.",
            competitivePosition: "No strong competitive advantage was demonstrated. The differentiation from existing solutions was not well-articulated.",
            tractionAwards: "Minimal traction was presented, with little evidence of early customer validation or revenue.",
            revenueModel: "Revenue model was loosely defined, with unclear monetization strategy and scalability concerns."
          }        
      };
    }

    if (rubricDataJson.overallScore==undefined) return;
    return {
      rubricScore: rubricDataJson.overallScore,
      rubricSummary: rubricDataJson.summary,
      rubricMetrics: {
        elevatorPitch: rubricDataJson.elevatorPitch,
        team: rubricDataJson.team,
        marketOpportunity: rubricDataJson.marketOpportunity,
        marketSize: rubricDataJson.marketSize,
        solutionValueProposition: rubricDataJson.solutionValueProposition,
        competitivePosition: rubricDataJson.competitivePosition,
        tractionAwards: rubricDataJson.tractionAwards,
        revenueModel: rubricDataJson.revenueModel,
      },
      rubricSpecificFeedback: rubricDataJson.specificFeedback,
    };

  } catch (error) {
    console.error("Error in rubricFilter function:", error);
    return null;
  }
};