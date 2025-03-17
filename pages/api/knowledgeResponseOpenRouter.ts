import { NextApiRequest, NextApiResponse } from 'next';
import { knowledgePrompt } from './prompts';
import { responseFilter } from './completionFilterFunctions';

const knowledgeResponseOpenRouter = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userInput, chatHistory, name, knowledge, tone, selectedModel } = req.body;

    // Fetch chat completion from OpenRouter
    const chatCompletion = await getOpenRouterChatCompletion(
      knowledge,
      userInput,
      chatHistory,
      name,
      tone,
      selectedModel
    );

    let responseContent = chatCompletion?.choices?.[0]?.message?.content;

    if (!responseContent) {
      return res.status(400).json({ error: 'Empty response from chat completion' });
    }

    const { filteredResponseContent } = responseFilter(responseContent);

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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Function to fetch chat completion using OpenRouter API
const getOpenRouterChatCompletion = async (
  knowledge: string,
  userInput: string,
  chatHistory: any[],
  name: string,
  tone: string,
  selectedModel: string
) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, // Use environment variable for security
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel || 'sao10k/l3.1-euryale-70b', // Use selected model or default
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

    if (!response.ok) {
      throw new Error(`Failed to fetch chat completion: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in fetch request:', error);
    throw new Error('Error fetching chat completion');
  }
};

export default knowledgeResponseOpenRouter;
