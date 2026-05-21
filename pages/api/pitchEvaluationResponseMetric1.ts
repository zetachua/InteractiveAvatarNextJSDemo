import { NextApiRequest, NextApiResponse } from 'next';
import {
  pitchEvaluationPromptMetric1,
  pitchEvaluationPromptMetric1Shard,
  pitchEvaluationPromptMetric1SummaryShard,
} from './prompts';
import { metric1ResultInvestorFilter } from './completionFilterFunctions';
import {
  buildCitationItemsFromSonarResponse,
  flattenRubricPayload,
  getGroqChatCompletionForMetric,
  getSonarChatCompletionForMetric,
  messageContentToString,
  clampChars,
  clampSentences,
  normalizeRubricMetricBlock,
  parseJsonFromLlmContent,
  useSplitRubricMetric1,
} from './pitchEvaluationResponseShared';

const METRIC1_KEYS = ['elevatorPitch', 'team', 'marketOpportunity', 'tractionAwards'] as const;

type Metric1Key = (typeof METRIC1_KEYS)[number];

const METRIC1_LABELS: Record<Metric1Key, string> = {
  elevatorPitch: 'Elevator Pitch',
  team: 'Team',
  marketOpportunity: 'Market Opportunity',
  tractionAwards: 'Traction/Awards',
};

const pitchEvaluationResponseMetric1 = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { currentMarketStats, chatHistory } = req.body;
      const rubricResult = await fetchMetric1(currentMarketStats, chatHistory);
      const rubricResult2 = rubricResult?.rubricData;
      const citations = rubricResult?.citations;

      let rubricScore2, rubricSummary2, rubricMetrics2, rubricSpecificFeedback2;
      if (rubricResult2?.rubricScore !== undefined) {
        rubricScore2 = rubricResult2.rubricScore;
        rubricSummary2 = rubricResult2.rubricSummary;
        rubricMetrics2 = rubricResult2.rubricMetrics;
        rubricSpecificFeedback2 = rubricResult2.rubricSpecificFeedback;
      } else {
        console.log('Invalid rubric data, keeping previous values.');
      }

      res.status(200).json({
        rubricScore2,
        rubricSummary2,
        rubricMetrics2,
        rubricSpecificFeedback2,
        citations,
        citationItems: rubricResult?.citationItems ?? [],
      });
    } catch (error) {
      console.error('Error fetching chat completion:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

async function completeWithPrompt(chatHistory: unknown[], prompt: string) {
  try {
    return await getSonarChatCompletionForMetric(chatHistory, prompt);
  } catch (e) {
    console.warn('Sonar metric1 shard failed, trying Groq:', e);
    return getGroqChatCompletionForMetric(chatHistory, prompt);
  }
}

async function parseShard(completion: unknown, label: string): Promise<Record<string, unknown>> {
  const raw = messageContentToString(
    (completion as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message
      ?.content,
  );
  try {
    return parseJsonFromLlmContent(raw);
  } catch {
    // Sonar returned prose instead of JSON — wrap as feedback so market data isn't lost
    const prose = raw.replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').trim();
    if (prose && label !== 'summary') {
      console.log(`metric1 parseShard(${label}): prose fallback (${prose.length} chars)`);
      const scoreMatch = prose.match(/\b([1-9]|10)\s*\/\s*10\b|\bscore[:\s]+([1-9]|10)\b/i);
      const extractedScore = scoreMatch ? parseInt(scoreMatch[1] ?? scoreMatch[2], 10) : 0;
      return { [label]: { score: extractedScore, feedback: prose.slice(0, 1200) } };
    }
    return {};
  }
}

function buildCombinedMetric1Json(metric1Data: Record<string, unknown>): string {
  const flat = flattenRubricPayload(metric1Data, METRIC1_KEYS);

  const clampMetric = (v: unknown) => {
    const m = normalizeRubricMetricBlock(v);
    return { score: m.score, feedback: m.feedback };
  };
  const elevatorPitch = clampMetric(flat.elevatorPitch);
  const team = clampMetric(flat.team);
  const marketOpportunity = clampMetric(flat.marketOpportunity);
  const tractionAwards = clampMetric(flat.tractionAwards);

  const scores = [elevatorPitch.score, team.score, marketOpportunity.score, tractionAwards.score];
  const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / 4);
  const summary =
    typeof flat.summary === 'string' && flat.summary.trim()
      ? flat.summary.trim()
      : 'Summary not available.';

  return JSON.stringify({
    elevatorPitch,
    team,
    marketOpportunity,
    tractionAwards,
    overallScore,
    summary,
    rubricSpecificFeedback: {
      elevatorPitch: elevatorPitch.feedback,
      team: team.feedback,
      marketOpportunity: marketOpportunity.feedback,
      tractionAwards: tractionAwards.feedback,
    },
  });
}

async function fetchMetric1Split(currentMarketStats: string, chatHistory: unknown[]) {
  const summaryPrompt = pitchEvaluationPromptMetric1SummaryShard(currentMarketStats, chatHistory);
  const shardPrompts = METRIC1_KEYS.map((key) =>
    pitchEvaluationPromptMetric1Shard(key, METRIC1_LABELS[key], currentMarketStats, chatHistory),
  );

  const [summaryCompletion, ...metricCompletions] = await Promise.all([
    completeWithPrompt(chatHistory, summaryPrompt),
    ...shardPrompts.map((p) => completeWithPrompt(chatHistory, p)),
  ]);

  const merged: Record<string, unknown> = {};
  const summaryParsed = await parseShard(summaryCompletion, 'summary');
  if (typeof summaryParsed.summary === 'string') merged.summary = summaryParsed.summary;

  for (let i = 0; i < METRIC1_KEYS.length; i += 1) {
    const key = METRIC1_KEYS[i];
    const parsed = await parseShard(metricCompletions[i], key);
    if (parsed[key] != null) merged[key] = parsed[key];
    else if (Object.keys(parsed).length === 1) {
      const onlyKey = Object.keys(parsed)[0];
      merged[key] = parsed[onlyKey];
    }
  }

  const content = buildCombinedMetric1Json(merged);
  const allCompletions = [summaryCompletion, ...metricCompletions];
  const citations = Array.from(
    new Set(
      allCompletions.flatMap((c) =>
        Array.isArray((c as { citations?: string[] })?.citations)
          ? ((c as { citations: string[] }).citations as string[])
          : [],
      ),
    ),
  );
  const citationItems = Array.from(
    new Map(
      allCompletions
        .flatMap((c) => buildCitationItemsFromSonarResponse(c))
        .map((item) => [item.url, item]),
    ).values(),
  );

  return { content, citations, citationItems };
}

async function fetchMetric1Monolithic(currentMarketStats: string, chatHistory: unknown[]) {
  let metric1Result = await getSonarChatCompletionForMetric(
    chatHistory,
    pitchEvaluationPromptMetric1(currentMarketStats, chatHistory),
  );
  console.log(metric1Result, 'direct metric1 completion');

  let cleaned = cleanSonarOutputMetric1(metric1Result);
  if (cleaned.includes('Sonar parsing error')) {
    console.warn('metric1: monolithic parse failed, retrying once…');
    metric1Result = await getSonarChatCompletionForMetric(
      chatHistory,
      pitchEvaluationPromptMetric1(currentMarketStats, chatHistory),
    );
    cleaned = cleanSonarOutputMetric1(metric1Result);
  }
  if (cleaned.includes('Sonar parsing error')) {
    console.warn('metric1: monolithic failed twice, falling back to split shards…');
    return fetchMetric1Split(currentMarketStats, chatHistory);
  }

  return {
    content: cleaned,
    citations: metric1Result?.citations || [],
    citationItems: buildCitationItemsFromSonarResponse(metric1Result),
  };
}

const fetchMetric1 = async (currentMarketStats: string, chatHistory: unknown[]) => {
  try {
    const { content, citations, citationItems } = useSplitRubricMetric1()
      ? await fetchMetric1Split(currentMarketStats, chatHistory)
      : await fetchMetric1Monolithic(currentMarketStats, chatHistory);

    if (!content || content.includes('Sonar parsing error')) {
      return null;
    }

    const filteredResponse = metric1ResultInvestorFilter(content);
    if (!filteredResponse) {
      console.log('Invalid rubric JSON format, returning null');
      return null;
    }

    return {
      rubricData: filteredResponse,
      citations,
      citationItems,
    };
  } catch (error) {
    console.error('Error in fetchRubric:', error);
    return null;
  }
};

const cleanSonarOutputMetric1 = (metric1: unknown): string => {
  try {
    if (!metric1) {
      throw new Error('One or more metrics have invalid JSON.');
    }
    console.log('testFn metric1 begin');

    const rawContent = messageContentToString(
      (metric1 as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message
        ?.content,
    );
    const metric1Data = parseJsonFromLlmContent(rawContent) as Record<string, unknown>;
    console.log(metric1Data, 'testFn3 metric1: parse successful');

    return buildCombinedMetric1Json(metric1Data);
  } catch (error) {
    console.error('Error merging Sonar outputs:', error);
    return JSON.stringify({
      elevatorPitch: { score: 0, feedback: 'Not provided. Unable to evaluate due to Sonar parsing error.' },
      team: { score: 0, feedback: 'Not provided. Unable to evaluate due to Sonar parsing error.' },
      marketOpportunity: { score: 0, feedback: 'Not provided. Unable to evaluate due to Sonar parsing error.' },
      tractionAwards: { score: 0, feedback: 'Not provided. Unable to evaluate due to Sonar parsing error.' },
      overallScore: 0,
      summary: '[Elevator Pitch, Team, Market Opportunity] Failed to evaluate pitch due to parsing errors in Sonar responses.',
      rubricSpecificFeedback: {
        elevatorPitch: 'Not provided. Unable to evaluate due to Sonar parsing error.',
        team: 'Not provided. Unable to evaluate due to Sonar parsing error.',
        marketOpportunity: 'Not provided. Unable to evaluate due to Sonar parsing error.',
        tractionAwards: 'Not provided. Unable to evaluate due to Sonar parsing error.',
      },
    });
  }
};

export default pitchEvaluationResponseMetric1;
