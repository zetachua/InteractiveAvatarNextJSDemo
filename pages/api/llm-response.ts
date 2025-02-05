import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import fs from 'fs';
import { CaseStudy } from '@/components/CaseStudyClass';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let selectedCase: CaseStudy | null = null; // Store the selected case persistently

const llmResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory } = req.body;
      let feedback = null;
      console.log('Request Body:', req.body);

      // Fetch the chat completion based on user input
      const chatCompletion = await getGroqChatCompletion(userInput, chatHistory);
      let responseContent = chatCompletion.choices[0].message.content;

      if (responseContent) {
        responseContent = responseContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        let feedbackMatch = responseContent.match(/Feedback:\s*(.+)/);
        responseContent = feedbackMatch ? responseContent.replace(feedbackMatch[0], '').trim() : responseContent;
        feedback = feedbackMatch ? feedbackMatch[1].trim() : '';
      }

      res.status(200).json({
        responseContent,
        chatHistory: [
          ...chatHistory,
          { role: 'user', content: userInput },
          { role: 'assistant', content: responseContent },
        ],
      });

      console.log(responseContent, feedback, 'what am i');
    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: 'Failed to fetch chat completion' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};

// Function to fetch chat completion from Groq
const getGroqChatCompletion = async (userInput: string, chatHistory: any) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

  // Load knowledge base
  const rawData = fs.readFileSync('./pages/api/knowledge.json', 'utf-8');
  const data = JSON.parse(rawData);
  const knowledgeBase: CaseStudy[] = data.case_studies;

  // Find relevant cases
  const relevantCases = knowledgeBase.filter((caseStudy) =>
    caseStudy.industry.toLowerCase().includes(userInput.toLowerCase())
  );

  // Assign `selectedCase` only if it is null
  if (!selectedCase && relevantCases.length > 0) {
    selectedCase = relevantCases[Math.floor(Math.random() * relevantCases.length)];
  }

  // Fallback if no relevant case is found
  if (!selectedCase) {
    selectedCase = knowledgeBase.find((cs) => cs.industry.toLowerCase() === 'tourism') || null;
  }

  console.log('selectedCase:', selectedCase, 'validHistory:', validChatHistory, 'response');

  const uniqueIndustries = Array.from(new Set(knowledgeBase.map((caseStudy) => caseStudy.industry.toLowerCase())));

  return groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `
        Instruction: You are a helpful assistant teaching students how to interview customers to understand their motivations.

        Wait for the user to type anything to begin. Prompt the user which industry he is interested in with 3-5 items from these options ${uniqueIndustries}.

        "Hello! I'm here to help you practice customer interviews. Which industry are you interested in? Here are some suggestions: <3 items from the options above>"

        Respond as if you were a persona with these values: ${selectedCase?.decision_making_style}. Provide realistic answers and keep them short and concise (<100 words), like this:

        "Hi, I'm a project manager at ${selectedCase?.company}, overseeing ${selectedCase?.summary}. I achieved ${selectedCase?.outcomes}. What would you like to know?"

        After the user asks 1 question, provide 1-sentence feedback at the end of every response to improve interview skills.

        Here’s more knowledge that you know: ${selectedCase?.challenges}, ${selectedCase?.decision_making_style}, ${selectedCase?.key_decisions}.
        `,
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

export default llmResponse;
