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
    // return sonar.chat.completions.create({
    //   messages: [
    //     {
    //       role: 'system',
    //       content: prompt,
    //     },
    //     ...validChatHistory,
    //     {
    //       role: 'user',
    //       content: userInput,
    //     },
    //   ],
    //   model: 'sonar', 
    // });
    return groq.chat.completions.create({
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
        model:'Deepseek-R1-Distill-Llama-70b', 
      });
  };
