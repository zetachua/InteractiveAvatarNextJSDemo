import Groq from 'groq-sdk';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/** Limit prose length for UI and downstream LLM prompts. */
export function clampSentences(text: string, maxSentences: number): string {
  const t = String(text ?? '').trim();
  if (!t || maxSentences < 1) return t;
  const parts = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length <= maxSentences) return t;
  return parts.slice(0, maxSentences).join(' ').trim();
}

export function clampChars(text: string, maxChars: number): string {
  const t = String(text ?? '').trim();
  if (!t || maxChars < 8) return t;
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1).trimEnd()}…`;
}

/** Trim rubric/sentiment blobs before investor verdict — keep enough context for market data refs. */
export function trimVerdictContextInput(ctx: {
  rubricSummary: string;
  rubricSpecificFeedback?: Record<string, string>;
  sentimentSummary: string;
}): typeof ctx {
  const rubricSpecificFeedback = ctx.rubricSpecificFeedback
    ? Object.fromEntries(
        Object.entries(ctx.rubricSpecificFeedback).map(([k, v]) => [
          k,
          clampSentences(clampChars(v, 600), 4),
        ]),
      )
    : undefined;
  return {
    rubricSummary: clampSentences(clampChars(ctx.rubricSummary, 900), 5),
    rubricSpecificFeedback,
    sentimentSummary: clampSentences(clampChars(ctx.sentimentSummary, 500), 3),
  };
}

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

function sonarMaxTokens(): number {
  const raw = process.env.SONAR_MAX_TOKENS;
  const n = raw ? parseInt(raw, 10) : 8192;
  if (!Number.isFinite(n)) return 8192;
  return Math.min(16384, Math.max(1024, n));
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
            content: 'Please evaluate the pitch transcript based on the provided instructions. Return compact JSON only; keep each feedback field under 3 sentences.',
        },
      ],
      model,
      max_tokens: sonarMaxTokens(),
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

  /** Normalize Sonar/OpenAI message content (string or parts array). */
  export function messageContentToString(content: unknown): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && 'text' in part) {
            return String((part as { text?: string }).text ?? '');
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }
    return String(content ?? '');
  }

  function stripLlmWrappers(text: string): string {
    return text
      .replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1')
      .replace(/[\s\S]*?<\/think>/gi, '')
      .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
      .trim();
  }

  function repairJsonString(json: string): string {
    return json
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/,\s*([}\]])/g, '$1');
  }

  function extractBalancedJson(text: string, fromIndex = 0): string | null {
    const start = text.slice(fromIndex).search(/[{[]/);
    if (start === -1) return null;
    const absoluteStart = fromIndex + start;

    const open = text[absoluteStart];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = absoluteStart; i < text.length; i += 1) {
      const ch = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === open) depth += 1;
      if (ch === close) {
        depth -= 1;
        if (depth === 0) {
          return text.slice(absoluteStart, i + 1);
        }
      }
    }

    return null;
  }

  function collectJsonCandidates(text: string): string[] {
    const candidates: string[] = [];
    const seen = new Set<string>();

    const push = (value: string | null | undefined) => {
      const v = value?.trim();
      if (!v || seen.has(v)) return;
      seen.add(v);
      candidates.push(v);
    };

    const stripped = stripLlmWrappers(text);
    push(stripped);

    const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
    let fenceMatch: RegExpExecArray | null;
    while ((fenceMatch = fenceRegex.exec(text)) !== null) {
      push(fenceMatch[1]);
    }

    let searchFrom = 0;
    while (searchFrom < stripped.length) {
      const chunk = extractBalancedJson(stripped, searchFrom);
      if (!chunk) break;
      push(chunk);
      const nextIndex = stripped.indexOf(chunk, searchFrom);
      if (nextIndex === -1) break;
      searchFrom = nextIndex + chunk.length;
    }

    const start = stripped.indexOf('{');
    if (start !== -1) {
      push(stripped.slice(start));
    }

    return candidates;
  }

  /** Close unterminated strings/brackets when Sonar truncates mid-JSON. */
  function closeTruncatedJson(fragment: string): string {
    let inString = false;
    let escaped = false;
    const stack: ('}' | ']')[] = [];

    for (let i = 0; i < fragment.length; i += 1) {
      const ch = fragment[i];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if ((ch === '}' || ch === ']') && stack.length && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }

    let out = fragment;
    if (inString) out += '"';
    out = out.replace(/,\s*$/, '');
    while (stack.length) out += stack.pop();
    return out;
  }

  function trimIncompleteJsonTail(json: string): string {
    let s = json.trim();
    s = s.replace(/,?\s*"[^"]*"\s*:\s*"[^"\\]*(?:\\.[^"\\]*)*$/, '');
    s = s.replace(/,?\s*"[^"]*"\s*:\s*\{[^}]*$/, '');
    s = s.replace(/,?\s*"[^"]*"\s*:\s*$/, '');
    s = s.replace(/,?\s*"[^"]*"\s*$/, '');
    s = s.replace(/,\s*$/, '');
    return s.trim();
  }

  function salvageTruncatedJsonObject(text: string): Record<string, unknown> | null {
    const start = text.indexOf('{');
    if (start === -1) return null;

    let working = text.slice(start).trim();
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const candidate = repairJsonString(closeTruncatedJson(trimIncompleteJsonTail(working)));
      try {
        const parsed = JSON.parse(candidate) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          working = trimIncompleteJsonTail(working);
          continue;
        }
        const obj = parsed as Record<string, unknown>;
        const score = scoreJsonCandidate(obj);
        if (score >= 10) return obj;
      } catch {
        /* try a shorter tail */
      }
      const next = trimIncompleteJsonTail(working);
      if (next === working || next.length < 24) break;
      working = next;
    }
    return null;
  }

  function scoreJsonCandidate(parsed: unknown): number {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 0;
    const keys = Object.keys(parsed as Record<string, unknown>);
    const rubricKeys = [
      'elevatorPitch',
      'team',
      'marketOpportunity',
      'tractionAwards',
      'marketSize',
      'solutionValueProposition',
      'competitivePosition',
      'revenueModel',
      'competitorCounterplay',
      'summary',
      'sections',
      'investorVerdict',
    ];
    let score = keys.length;
    for (const k of rubricKeys) {
      if (keys.includes(k)) score += 10;
    }
    return score;
  }

  /** Parse JSON from LLM/Sonar text; returns object or throws. */
  export function parseJsonFromLlmContent(content: unknown): Record<string, unknown> {
    const text = messageContentToString(content);
    if (!text.trim()) {
      throw new Error('No valid JSON found in response (empty content)');
    }

    const candidates = collectJsonCandidates(text);
    let best: { score: number; value: Record<string, unknown> } | null = null;

    for (const candidate of candidates) {
      const repaired = repairJsonString(candidate);
      try {
        const parsed = JSON.parse(repaired) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
        const obj = parsed as Record<string, unknown>;
        const score = scoreJsonCandidate(obj);
        if (!best || score > best.score) {
          best = { score, value: obj };
        }
        if (score >= 30) break;
      } catch {
        /* try next candidate */
      }
    }

    if (best) return best.value;

    const salvaged = salvageTruncatedJsonObject(text);
    if (salvaged) {
      console.warn(
        'parseJsonFromLlmContent: recovered truncated Sonar JSON (partial fields may be missing)',
      );
      return salvaged;
    }

    console.error(
      'parseJsonFromLlmContent: no parseable JSON. Snippet:',
      text.slice(0, 800),
    );
    throw new Error('No valid JSON found in response');
  }

  export const cleanResponse = (content: unknown): string => {
    return JSON.stringify(parseJsonFromLlmContent(content));
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

  export type RubricMetricBlock = { score: number; feedback: string };

  /** Coerce Sonar rubric fields (string / assessment / nested recap) into { score, feedback }. */
  export function normalizeRubricMetricBlock(value: unknown): RubricMetricBlock {
    const fallback: RubricMetricBlock = { score: 0, feedback: 'Not provided.' };
    if (value == null) return fallback;
    if (typeof value === 'string') {
      const t = value.trim();
      return { score: 0, feedback: t || fallback.feedback };
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return { score: Math.min(10, Math.max(0, Math.round(value))), feedback: fallback.feedback };
    }
    if (typeof value !== 'object' || Array.isArray(value)) return fallback;

    const o = value as Record<string, unknown>;
    let score = 0;
    if (typeof o.score === 'number' && Number.isFinite(o.score)) score = o.score;
    else if (typeof o.score === 'string') {
      const n = parseFloat(o.score);
      if (Number.isFinite(n)) score = n;
    }
    score = Math.min(10, Math.max(0, Math.round(score)));

    if (typeof o.feedback === 'string' && o.feedback.trim()) {
      return { score, feedback: o.feedback.trim() };
    }
    if (typeof o.assessment === 'string' && o.assessment.trim()) {
      return { score, feedback: o.assessment.trim() };
    }
    if (typeof o.comment === 'string' && o.comment.trim()) {
      return { score, feedback: o.comment.trim() };
    }
    const merged = transformFeedback(o);
    return { score, feedback: merged.trim() || fallback.feedback };
  }

  export function useSplitRubricMetric2(): boolean {
    return process.env.RUBRIC_METRIC2_SPLIT !== '0';
  }

  export function useSplitRubricMetric1(): boolean {
    return process.env.RUBRIC_METRIC1_SPLIT !== '0';
  }

  function isRubricMetricBlock(value: unknown): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const o = value as Record<string, unknown>;
    return (
      typeof o.score === 'number' ||
      typeof o.score === 'string' ||
      typeof o.feedback === 'string' ||
      typeof o.assessment === 'string'
    );
  }

  /**
   * When truncated JSON is "repaired", sibling metrics can end up nested inside
   * elevatorPitch (e.g. elevatorPitch.team). Hoist the shallowest valid block per key.
   */
  export function flattenRubricPayload(
    data: Record<string, unknown>,
    metricKeys: readonly string[],
  ): Record<string, unknown> {
    const found: Record<string, { value: unknown; depth: number }> = {};

    const walk = (node: Record<string, unknown>, depth: number) => {
      for (const key of metricKeys) {
        if (key in node && isRubricMetricBlock(node[key])) {
          const prev = found[key];
          if (!prev || depth < prev.depth) {
            found[key] = { value: node[key], depth };
          }
        }
      }
      for (const v of Object.values(node)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          walk(v as Record<string, unknown>, depth + 1);
        }
      }
    };

    walk(data, 0);

    const out: Record<string, unknown> = { ...data };
    if (typeof data.summary === 'string') out.summary = data.summary;
    for (const key of metricKeys) {
      if (found[key]) out[key] = found[key].value;
    }
    return out;
  }