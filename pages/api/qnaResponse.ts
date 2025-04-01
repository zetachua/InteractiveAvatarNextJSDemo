import { NextApiRequest, NextApiResponse } from 'next';
import { qnaFilter } from './completionFilterFunctions';
import { models } from './configConstants';
import Groq from 'groq-sdk';
import { qnaPrompt } from './prompts';

const groq = new Groq ({ apiKey: process.env.GROQ_API_KEY });

const qnaResponse = async (req: NextApiRequest, res: NextApiResponse) => {
if (req.method === 'POST') {
  try {
    const { userInput,chatHistory} = req.body;
    console.log('Request Body QnaResponse:',chatHistory);

    const questionResponse = await fetchQna(userInput, chatHistory);


    res.status(200).json({
      chatHistory: [
        ...chatHistory,
        { role: 'user', content: userInput },
        { role: 'assistant', content: questionResponse },
      ],
      questionResponse
    });

  } catch (error) {
    console.error("Error fetching rubric:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
};

const fetchQna = async (userInput:string,chatHistory: any[]) => {
try {
  const completion = await getGroqChatCompletion(userInput, chatHistory, models[0]);
  let responseContent = completion.choices[0].message.content;
  if (!responseContent) {
    throw new Error("Empty rubric response");
  }

  const questionResponse = qnaFilter(responseContent);

  if (!questionResponse) {
    console.log("Invalid rubric JSON format, returning null");
    return null;  // Return null if parsing fails
  }

  return questionResponse;

} catch (error) {
  console.error("Error in fetchQna:", error);
  return null;  // Return null if an error occurs
}
};


// Function to fetch chat completion from Groq
const getGroqChatCompletion = async (userInput: string, chatHistory: any, selectedModel:any) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

  let selectedPrompt= qnaPrompt(userInput,validChatHistory);

  console.log("selected prompt qna response",selectedPrompt)

  return groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: selectedPrompt,
      },
      ...validChatHistory,
      {
        role: 'user',
        content: userInput,
      },
    ],
    response_format: { type: "json_object" },
    model: selectedModel,
  });
};


export default qnaResponse;

