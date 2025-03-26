import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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


export const getSonarChatCompletionForMetric = async (userInput: string, chatHistory: any, prompt: string) => {
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
      model: 'sonar', 
    });
    // return groq.chat.completions.create({
    //     messages: [
    //       {
    //         role: 'system',
    //         content: prompt,
    //       },
    //       ...validChatHistory,
    //       {
    //         role: 'user',
    //         content: userInput,
    //       },
    //     ],
    //     model:'Deepseek-R1-Distill-Llama-70b', 
    //   });
  };

  export const cleanResponse = (content: string): string => {
    let cleaned = content
    .replace(/```json|```/g, '')           // Remove code block markers
    .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove <think>...</think> tags
    .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }
    console.log(jsonMatch,"testFn1: cleanResponse successful")
    return jsonMatch[0];
  };

  export const transformFeedback = (feedback: any): string => {
    if (typeof feedback === 'string') return feedback;
  
    // Default values in case fields are missing
    const recap = feedback?.recap || "";
    const feedbackText = feedback?.feedback || "";
    const comparison = feedback?.comparison || "";
    const suggestion = feedback?.suggestion || "";

    console.log(transformFeedback,"testFn2: transformFeedback successful")

    // Concatenate all relevant fields
    return `${recap}. ${comparison}. ${feedbackText}. ${suggestion}`;
  };