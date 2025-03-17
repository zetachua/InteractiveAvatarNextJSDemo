import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { knowledgePrompt} from './prompts';
import { responseFilter } from './completionFilterFunctions';
import { baba_house } from './configConstants';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const knowledgeResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const {  userInput, chatHistory, name, knowledge, tone,selectedModel} = req.body;
      let chatCompletion;
      [chatCompletion] = await Promise.all([
          getGroqChatCompletion(knowledge,userInput, chatHistory,name,tone,selectedModel),
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

// Function to fetch chat completion from Groq
const getGroqChatCompletion = async (knowledge:string, userInput: string, chatHistory: any, name:string, tone:string,selectedModel:string) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

  if (!name || !knowledge || !tone) {
      [name, knowledge, tone] = [baba_house.name, baba_house.knowledge, baba_house.tone];
  }

  return groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: knowledgePrompt(knowledge,name,tone),
      },
      ...validChatHistory,
      {
        role: 'user',
        content: userInput,
      },
    ],
    model:selectedModel,
  });
};

export default knowledgeResponse;

