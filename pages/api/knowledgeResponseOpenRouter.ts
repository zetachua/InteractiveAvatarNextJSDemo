import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { knowledgePrompt } from './prompts';
import { responseFilter } from './completionFilterFunctions';

// Initialize OpenAI client with OpenRouter's endpoint and API key
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const knowledgeResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory, name, knowledge, tone } = req.body;
      console.log('Request Body:', req.body);
      let chatCompletion;
      
      [chatCompletion] = await Promise.all([
        getOpenRouterChatCompletion(knowledge, userInput, chatHistory, name, tone),
      ]);

      // Process chat completion
      let responseContent = chatCompletion?.choices[0]?.message?.content;
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

// Function to fetch chat completion from OpenRouter
const getOpenRouterChatCompletion = async (
  knowledge: string, 
  userInput: string, 
  chatHistory: any, 
  name: string, 
  tone: string
) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

  return openai.chat.completions.create({
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
    model: 'sao10k/l3.1-euryale-70b',
  });
};

export default knowledgeResponse;