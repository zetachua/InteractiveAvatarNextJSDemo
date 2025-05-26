import { ChatHistory } from './../../components/KnowledgeClasses';
import { NextApiRequest, NextApiResponse } from 'next';
import { qnaFilter } from './completionFilterFunctions';
// import { models } from './configConstants';
import Groq from 'groq-sdk';
import { qnaFlarePrompt, qnaPrompt, qnaPromptEngineered } from './prompts';
import { getSonarChatCompletionForMetric, getLocalChatCompletion } from './pitchEvaluationResponseShared';

const groq = new Groq ({ apiKey: process.env.GROQ_API_KEY });

const qnaResponse = async (req: NextApiRequest, res: NextApiResponse) => {
if (req.method === 'POST') {
  try {
    const { userInput,chatHistory, selectedModel} = req.body;
    console.log('Request Body QnaResponse:',chatHistory);

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
    //  responseContent=await finetunedSharktank(userInput,chatHistory); //enable this if u have the finetuned model
     responseContent= await promptEngineeringSharktank(userInput, chatHistory);
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
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

  let selectedPrompt= qnaPrompt("",userInput,chatHistory);

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

const finetunedSharktank =async (userInput:string,chatHistory:any[]) => {

      const prompt=qnaFlarePrompt(userInput,chatHistory);

      const [completion1] = await Promise.all([
        getLocalChatCompletion(chatHistory, prompt,"sharktank-model"), //sharktank-model is the first version
      ]);

      const responseContent1 = completion1.message.content;

      const promptForFlare=qnaPrompt(responseContent1,userInput,chatHistory);
      const completion3 = await getSonarChatCompletionForMetric(chatHistory,promptForFlare);
      return completion3.choices[0].message.content;
}


const promptEngineeringSharktank =async (userInput:string,chatHistory:any[]) => {
      const prompt=qnaPromptEngineered(userInput,chatHistory);
      const completion = await getSonarChatCompletionForMetric(chatHistory,prompt);
      return completion.choices[0].message.content;
}


export default qnaResponse;

