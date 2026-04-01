import Groq from 'groq-sdk';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

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
            model: 'sonar', // Updated to match the template
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

const sharktankMetaLLM = {
  chat: {
    completions: {
      create: async (params: any) => {
        const { stream = false, ...restParams } = params;

        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sharktank-model', // Replace with your model name
            messages: restParams.messages,
            stream,
          }),
        });

        if (stream) {
          return response.body; // You'll need to handle the stream where this is used
        }

        const result = await response.json();
        return result;
      }
    }
  }
};


const sharktankMetaLLM2 = {
  chat: {
    completions: {
      create: async (params: any) => {
        const { stream = false, ...restParams } = params;

        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sharktank2', // Replace with your model name
            messages: restParams.messages,
            stream,
          }),
        });

        if (stream) {
          return response.body; // You'll need to handle the stream where this is used
        }

        const result = await response.json();
        return result;
      }
    }
  }
};


// Function to request a chat completion using the local LLM
export const getLocalChatCompletion = async (chatHistory:any[], prompt: string, model:string) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

  let response;
  if (model==="sharktank-model"){
      response = await sharktankMetaLLM.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        ...validChatHistory,
        {
          role: 'user',
          content: 'Please evaluate the pitch transcript based on the provided instructions.',
        },
      ],
      model: 'sharktank-model', // Optional for local API, but useful for logs
    });
  }
  else{
      response = await sharktankMetaLLM2.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        ...validChatHistory,
        {
          role: 'user',
          content: 'Please evaluate the pitch transcript based on the provided instructions.',
        },
      ],
      model: 'sharktank2', // Optional for local API, but useful for logs
    });
  }

  return response;
};


export const getSonarChatCompletionForMetric = async (chatHistory: any, prompt: string) => {
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
            content: 'Please evaluate the pitch transcript based on the provided instructions.',
        },
      ],
      model: 'sonar'
    });
  };



export const getGroqChatCompletionForMetric = async (chatHistory: any, prompt: string) => {
    const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];
    return groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          ...validChatHistory,
          {
            role: 'user',
            content: 'Please evaluate the pitch transcript based on the provided instructions.',
          },
        ],
        model:'openai/gpt-oss-120b', 
      });
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
    return jsonMatch[0];
  };

  export const transformFeedback = (feedback: any): string => {
    if (typeof feedback === 'string') return feedback;
  
    // Default values in case fields are missing
    const recap = feedback?.recap || "";
    const feedbackText = feedback?.feedback || "";
    const comparison = feedback?.comparison || "";
    const suggestion = feedback?.suggestion || "";

    console.log(`${recap}. ${comparison}. ${feedbackText}. ${suggestion}`,"testFn2: transformFeedback successful")

    // Concatenate all relevant fields
    return `${recap}. ${comparison}. ${feedbackText}. ${suggestion}`;
  };