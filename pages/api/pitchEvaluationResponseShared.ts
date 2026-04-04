import Groq from 'groq-sdk';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/** Cap messages sent to LLMs (lower = faster, less context). Env: CHAT_HISTORY_MAX_MESSAGES, default 24. */
function chatHistoryMaxMessages(): number {
  const raw = process.env.CHAT_HISTORY_MAX_MESSAGES;
  const n = raw ? parseInt(raw, 10) : 24;
  if (!Number.isFinite(n)) return 24;
  return Math.min(100, Math.max(4, n));
}

/** Keep the most recent turns so prompts stay small (latency + cost). */
export function truncateChatMessagesForLlm(chatHistory: unknown): any[] {
  if (!Array.isArray(chatHistory)) return [];
  const max = chatHistoryMaxMessages();
  if (chatHistory.length <= max) return chatHistory;
  return chatHistory.slice(-max);
}

const sonar = {
  chat: {
    completions: {
      create: async (params: any) => {
        const { stream = false, ...restParams } = params;
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SONAR_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'sonar', // Updated to match the template
            ...restParams
          })
        });

        if (stream) {
          return response.body; // Return stream for processing
        }
        return await response.json();
      }
    }
  }
};

const sharktankMetaLLM = {
  chat: {
    completions: {
      create: async (params: any) => {
        const { stream = false, ...restParams } = params;

        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sharktank-model', // Replace with your model name
            messages: restParams.messages,
            stream,
          }),
        });

        if (stream) {
          return response.body; // You'll need to handle the stream where this is used
        }

        const result = await response.json();
        return result;
      }
    }
  }
};


const sharktankMetaLLM2 = {
  chat: {
    completions: {
      create: async (params: any) => {
        const { stream = false, ...restParams } = params;

        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sharktank2', // Replace with your model name
            messages: restParams.messages,
            stream,
          }),
        });

        if (stream) {
          return response.body; // You'll need to handle the stream where this is used
        }

        const result = await response.json();
        return result;
      }
    }
  }
};


// Function to request a chat completion using the local LLM
export const getLocalChatCompletion = async (chatHistory:any[], prompt: string, model:string) => {
  const validChatHistory = truncateChatMessagesForLlm(chatHistory);

  let response;
  if (model==="sharktank-model"){
      response = await sharktankMetaLLM.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        ...validChatHistory,
        {
          role: 'user',
          content: 'Please evaluate the pitch transcript based on the provided instructions.',
        },
      ],
      model: 'sharktank-model', // Optional for local API, but useful for logs
    });
  }
  else{
      response = await sharktankMetaLLM2.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        ...validChatHistory,
        {
          role: 'user',
          content: 'Please evaluate the pitch transcript based on the provided instructions.',
        },
      ],
      model: 'sharktank2', // Optional for local API, but useful for logs
    });
  }

  return response;
};


export type SonarCitationItem = { title: string; url: string };

function titleFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname || url;
  } catch {
    return 'Source';
  }
}

/**
 * Drop Sonar citations that are mostly generic “how to pitch / present” or screenwriting noise.
 * Company sites, news, industry, gov, databases, etc. stay allowed unless they match these patterns.
 */
export function isPresentationHowToOrIrrelevantPitchCitationUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = `${u.pathname}${u.search}`.toLowerCase();

    const hostBlocks = [
      'toastmasters',
      'screenwrit',
      'screenplay',
      'simplyscripts',
      'writersdigest',
      'slidemodel.com',
      'slidesgo.com',
      'presentationzen.com',
    ];
    if (hostBlocks.some((s) => (s.includes('.') ? h === s || h.endsWith(`.${s}`) : h.includes(s)))) {
      return true;
    }

    // Path-based: generic pitch/speaking advice slugs on any domain
    if (
      /\/(how[-_]to[-_])?pitch\b|elevator[-_]pitch|pitch[-_]deck[-_]template|public[-_]speaking|presentation[-_]skills|powerpoint[-_]tips|slide[-_]design/i.test(
        path,
      )
    ) {
      return true;
    }

    if (h.endsWith('wikihow.com') && /pitch|elevator|public-speaking|slide|presentation|powerpoint/i.test(path)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/** @deprecated use !isPresentationHowToOrIrrelevantPitchCitationUrl for clarity */
export function isAllowedRubricCitationUrl(url: string): boolean {
  return !isPresentationHowToOrIrrelevantPitchCitationUrl(url);
}

/** Map Perplexity completion payload to titled links for the UI (prefers search_results over citations). */
export function buildCitationItemsFromSonarResponse(apiResult: unknown): SonarCitationItem[] {
  if (!apiResult || typeof apiResult !== 'object') return [];
  const r = apiResult as Record<string, unknown>;
  const filterItems = (items: SonarCitationItem[]) =>
    items.filter((i) => !isPresentationHowToOrIrrelevantPitchCitationUrl(i.url));

  const searchResults = r.search_results;
  if (Array.isArray(searchResults) && searchResults.length > 0) {
    const out: SonarCitationItem[] = [];
    for (const item of searchResults) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const url = typeof o.url === 'string' ? o.url.trim() : '';
      if (!url) continue;
      const rawTitle = typeof o.title === 'string' ? o.title.trim() : '';
      const title = rawTitle || titleFromUrl(url);
      out.push({ title, url });
    }
    return filterItems(out);
  }
  const citations = r.citations;
  if (!Array.isArray(citations)) return [];
  return filterItems(
    citations
      .filter((u): u is string => typeof u === 'string' && u.length > 0)
      .map((url) => ({ title: titleFromUrl(url.trim()), url: url.trim() })),
  );
}

export const getSonarChatCompletionForMetric = async (chatHistory: any, prompt: string) => {
    const validChatHistory = truncateChatMessagesForLlm(chatHistory);
    const model = process.env.PERPLEXITY_SONAR_MODEL?.trim() || 'sonar';
    return sonar.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        ...validChatHistory,
        {
            role: 'user',
            content: 'Please evaluate the pitch transcript based on the provided instructions.',
        },
      ],
      model,
    });
  };



export const getGroqChatCompletionForMetric = async (chatHistory: any, prompt: string) => {
    const validChatHistory = truncateChatMessagesForLlm(chatHistory);
    return groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          ...validChatHistory,
          {
            role: 'user',
            content: 'Please evaluate the pitch transcript based on the provided instructions.',
          },
        ],
        model:'llama-3.3-70b-versatile', 
      });
  };

  export const cleanResponse = (content: string): string => {
    let cleaned = content
    .replace(/```json|```/g, '')           // Remove code block markers
    .replace(/<think>[\s\S]*?<\/think>/g, '')  // Remove <think>...</think> tags
    .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }
    return jsonMatch[0];
  };

  export const transformFeedback = (feedback: any): string => {
    if (typeof feedback === 'string') return feedback;
  
    // Default values in case fields are missing
    const recap = feedback?.recap || "";
    const feedbackText = feedback?.feedback || "";
    const comparison = feedback?.comparison || "";
    const suggestion = feedback?.suggestion || "";

    console.log(`${recap}. ${comparison}. ${feedbackText}. ${suggestion}`,"testFn2: transformFeedback successful")

    // Concatenate all relevant fields
    return `${recap}. ${comparison}. ${feedbackText}. ${suggestion}`;
  };