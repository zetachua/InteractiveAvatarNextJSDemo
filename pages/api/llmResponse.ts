import { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { StartupGroups } from '@/components/KnowledgeClasses';
import { feedbackPrompt, marketRelevancePrompt, startupPersonaPrompt} from './prompts';
import { startupKnowledgeJsonExtract } from './promptExtractFunctions';
import { feedbackFilter, rubricFilter, suggestionsOptionsFilter } from './completionFilterFunctions';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
let thematics: string[] = [];
let selectedJsonData: StartupGroups | undefined;
let rating=0;
let groupToFetch='Money_Savey'
const llmResponse = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { userInput, chatHistory, groupName } = req.body;
      console.log('Request Body:', req.body);

      if (userInput === "hello" || userInput === "start") thematics = [];

      // Extract Json Data based on groupName
      if (groupToFetch || !selectedJsonData) {
        groupToFetch = groupName || 'Money_Savey';
        const { selectedCase } = await startupKnowledgeJsonExtract(groupToFetch);
        selectedJsonData = selectedCase;
        console.log(selectedCase,groupName,"was i here");
      }

      // Fetch chat completion based on user input
      const chatCompletion = await getGroqChatCompletion(userInput, chatHistory, "nus", "",selectedJsonData);
      let responseContent = chatCompletion.choices[0].message.content;
      if (!responseContent) return res.status(400).json({ error: "Empty response from chat completion" });

      const { filteredResponseContent, suggestions } = suggestionsOptionsFilter(responseContent,rating);

      // Fetch feedback rating
      const feedbackRatingCompletion = await getGroqChatCompletion(userInput, chatHistory, "feedback", filteredResponseContent,selectedJsonData);
      let responseFeedbackContent = feedbackRatingCompletion.choices[0].message.content;
      if (!responseFeedbackContent) return res.status(400).json({ error: "Empty feedback response" });
      const feedbackResult = feedbackFilter(responseFeedbackContent);
      if (!feedbackResult) {
        console.error("Error parsing feedback JSON, returning default feedback.");
        return res.status(400).json({ error: "Invalid feedback JSON format" });
      }
      const { feedbackScore, feedbackSummary, feedbackMetrics } = feedbackResult;

      // Fetch rubrics rating
      const rubricRatingCompletion = await getGroqChatCompletion(userInput, chatHistory, "rubric", "",selectedJsonData);
      let responseRubricContent = rubricRatingCompletion.choices[0].message.content;
      if (!responseRubricContent) return res.status(400).json({ error: "Empty rubric response" });
      const rubricResult = rubricFilter(responseRubricContent);
      if (!rubricResult) {
        console.error("Error parsing rubric JSON, returning default feedback.");
        return res.status(400).json({ error: "Invalid rubric JSON format" });
      }
      const { rubricScore, rubricSummary, rubricMetrics } = rubricResult;
      console.log(rubricScore, rubricSummary, rubricMetrics,"response rubric")


      // Give response
      res.status(200).json({
        filteredResponseContent,
        suggestions,
        chatHistory: [
          ...chatHistory,
          { role: 'user', content: userInput },
          { role: 'assistant', content: responseContent },
        ],
        feedbackScore,
        feedbackSummary,
        feedbackMetrics,
        rubricScore,
        rubricSummary,
        rubricMetrics,
      });

      console.log("userInput:", userInput, "response:", filteredResponseContent);
    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: 'Failed to fetch chat completion' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};


// Function to fetch chat completion from Groq
const getGroqChatCompletion = async (userInput: string, chatHistory: any, prompt:any,reply:any,selectedCase:any) => {
  const validChatHistory = Array.isArray(chatHistory) ? chatHistory : [];
  // const {storyBookTitles,selectedStoryBook}= aiChildrenKnowledgeJsonFilter(userInput);
  // thematics.push(userInput)

  let selectedPrompt=""
  if (prompt=='nus'){
    selectedPrompt=startupPersonaPrompt(selectedCase)
  } else if (prompt=='feedback'){
    selectedPrompt=feedbackPrompt(userInput,reply,selectedCase.startup_idea)
  } else if (prompt='rubric'){
    selectedPrompt=marketRelevancePrompt(selectedCase.startup_idea)
  }
  console.log(selectedPrompt,"selectedPrompt")
  
  return groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: selectedPrompt,
        // content: aiChildrenPrompt(storyBookTitles,selectedStoryBook,thematics[1]+thematics[2]),
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
