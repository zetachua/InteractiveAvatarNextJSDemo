import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { knowledgePrompt} from './prompts';
import { responseFilter } from './completionFilterFunctions';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const knowledgeResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const {  userInput, chatHistory, name, knowledge, tone} = req.body;
      console.log('Request Body:', req.body);
      let chatCompletion;
      [chatCompletion] = await Promise.all([
          getGroqChatCompletion(knowledge,userInput, chatHistory,name,tone),
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
const getGroqChatCompletion = async (knowledge:string, userInput: string, chatHistory: any, name:string, tone:string) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];
  
  if (!name || !knowledge || !tone) {
    name = "Baba Pete";  
    knowledge = "all things Peranakan, NUS Baba House stories, and cultural gems";  
    tone = "bubbly, lively, and full of fun heritage facts!";  
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
    model: 'Deepseek-R1-Distill-Llama-70b',
        // model:"llama3-8b-8192",  

  });
};

export default knowledgeResponse;

