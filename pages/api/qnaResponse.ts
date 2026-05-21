import { ChatHistory } from './../../components/KnowledgeClasses';
import { NextApiRequest, NextApiResponse } from 'next';
import { qnaFilter } from './completionFilterFunctions';
import { models } from './configConstants';
import Groq from 'groq-sdk';
import { qnaFlarePrompt, qnaPrompt, qnaPromptEngineered } from './prompts';
import {
  getSonarChatCompletionForMetric,
  getLocalChatCompletion,
  truncateChatMessagesForLlm,
} from './pitchEvaluationResponseShared';

const groq = new Groq ({ apiKey: process.env.GROQ_API_KEY });

const qnaResponse = async (req: NextApiRequest, res: NextApiResponse) => {
if (req.method === 'POST') {
  try {
    const { userInput,chatHistory, selectedModel} = req.body;
    const questionResponse = await fetchQna(userInput, chatHistory,selectedModel);


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

const fetchQna = async (userInput:string,chatHistory: any[],selectedModel:string) => {
try {
  let responseContent;

  console.log(chatHistory,userInput,"what is the chathistory")

  if (selectedModel==="Sharktank" ){
    // Local fine-tuned model (flare) → Perplexity Sonar (grounded follow-up JSON)
    responseContent = await finetunedSharktank(userInput, chatHistory);
  }
  else{

    const completion = await getGroqChatCompletion(userInput, chatHistory, selectedModel);
    responseContent = completion.choices[0].message.content;
    console.log(responseContent,"hello im a groq llm now");

  }

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
  const validChatHistory = truncateChatMessagesForLlm(chatHistory);

  let selectedPrompt= qnaPrompt("",userInput,validChatHistory);

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
      max_tokens: 400,
    });
  
};

const finetunedSharktank = async (userInput: string, chatHistory: any[]) => {
  const h = truncateChatMessagesForLlm(chatHistory);

  // Step 1: local fine-tuned model (optional — if Ollama is down, continue with empty context)
  let responseContent1 = '';
  try {
    const prompt = qnaFlarePrompt(userInput, h);
    const completion1 = await getLocalChatCompletion(h, prompt, 'sharktank-model');
    responseContent1 = completion1?.message?.content ?? '';
  } catch (e) {
    console.warn('finetunedSharktank: local model unavailable, skipping FLARE step:', e);
  }

  // Step 2: Sonar grounded follow-up
  const promptForFlare = qnaPrompt(responseContent1, userInput, h);
  const completion3 = await getSonarChatCompletionForMetric(h, promptForFlare);
  const content = completion3?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Sonar completion returned no content for finetunedSharktank');
  return content;
};


const promptEngineeringSharktank =async (userInput:string,chatHistory:any[]) => {
      const prompt=qnaPromptEngineered(userInput,chatHistory);
      const completion = await getSonarChatCompletionForMetric(chatHistory,prompt);
      return completion.choices[0].message.content;
}


export default qnaResponse;

