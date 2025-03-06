import { NextApiRequest, NextApiResponse } from 'next';
import { knowledgePrompt } from './prompts';
import { responseFilter } from './completionFilterFunctions';

const knowledgeResponseOpenRouter = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory, name, knowledge, tone,selectedModel} = req.body;
      console.log('Request Body:', req.body);

      // Fetch chat completion using fetch API
      const chatCompletion = await getOpenRouterChatCompletion(knowledge, userInput, chatHistory, name, tone);

      let responseContent = chatCompletion?.choices[0]?.message?.content;
      console.log(responseContent, "was there a response");

      if (!responseContent) return res.status(400).json({ error: "Empty response from chat completion" });

      const { filteredResponseContent } = responseFilter(responseContent);

      // Send response
      res.status(200).json({
        filteredResponseContent,
        chatHistory: [
          ...chatHistory,
          { role: 'user', content: userInput },
          { role: 'assistant', content: responseContent },
        ],
      });

    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

// Function to fetch chat completion from OpenRouter using fetch API
const getOpenRouterChatCompletion = async (
  knowledge: string,
  userInput: string,
  chatHistory: any,
  name: string,
  tone: string
) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, // Your OpenRouter API key
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sao10k/l3.1-euryale-70b', // Model to use
        messages: [
          {
            role: 'system',
            content: knowledgePrompt(knowledge, name, tone),
          },
          ...validChatHistory,
          {
            role: 'user',
            content: userInput,
          },
        ],
      }),
    });

    // Check for a successful response
    if (!response.ok) {
      throw new Error('Failed to fetch chat completion');
    }

    const data = await response.json();
    return data; // Return the response data from OpenRouter API
  } catch (error) {
    console.error('Error in fetch request:', error);
    throw new Error('Error fetching chat completion');
  }
};

export default knowledgeResponseOpenRouter;
