import { NextApiRequest, NextApiResponse } from 'next';
import {
  pitchEvaluationPromptMetric2,
  pitchEvaluationPromptMetric2Shard,
  pitchEvaluationPromptMetric2SummaryShard,
} from './prompts';
import { metric2ResultInvestorFilter } from './completionFilterFunctions';
import {
  buildCitationItemsFromSonarResponse,
  getGroqChatCompletionForMetric,
  getSonarChatCompletionForMetric,
  messageContentToString,
  normalizeRubricMetricBlock,
  parseJsonFromLlmContent,
  useSplitRubricMetric2,
} from './pitchEvaluationResponseShared';

const METRIC2_KEYS = [
  'marketSize',
  'solutionValueProposition',
  'competitivePosition',
  'revenueModel',
] as const;

type Metric2Key = (typeof METRIC2_KEYS)[number];

const METRIC2_LABELS: Record<Metric2Key, string> = {
  marketSize: 'Market Size',
  solutionValueProposition: 'Solution & Value Proposition',
  competitivePosition: 'Competitive Positioning',
  revenueModel: 'Revenue/Business Model',
};

const pitchEvaluationResponseMetric2 = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { currentMarketStats, chatHistory } = req.body;
      const rubricResult = await fetchMetric2(currentMarketStats, chatHistory);
      const rubricResult2 = rubricResult?.rubricData;
      const citations = rubricResult?.citations;

      let rubricScore2, rubricSummary2, rubricMetrics2, rubricSpecificFeedback2, competitorCounterplay2;
      if (rubricResult2?.rubricScore !== undefined) {
        rubricScore2 = rubricResult2.rubricScore;
        rubricSummary2 = rubricResult2.rubricSummary;
        rubricMetrics2 = rubricResult2.rubricMetrics;
        rubricSpecificFeedback2 = rubricResult2.rubricSpecificFeedback;
        competitorCounterplay2 =
          typeof (rubricResult2 as { competitorCounterplay?: string }).competitorCounterplay === 'string'
            ? String((rubricResult2 as { competitorCounterplay: string }).competitorCounterplay)
            : '';
      } else {
        console.log('Invalid rubric data, keeping previous values.');
      }

      res.status(200).json({
        rubricScore2,
        rubricSummary2,
        rubricMetrics2,
        rubricSpecificFeedback2,
        competitorCounterplay2,
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
    console.warn('Sonar shard failed, trying Groq:', e);
    return getGroqChatCompletionForMetric(chatHistory, prompt);
  }
}

async function parseShard(
  completion: unknown,
  label: string,
): Promise<Record<string, unknown>> {
  const raw = messageContentToString(
    (completion as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message
      ?.content,
  );
  try {
    return parseJsonFromLlmContent(raw);
  } catch (e) {
    console.warn(`parseShard failed (${label}):`, e);
    return {};
  }
}

function buildCombinedMetric2Json(
  metric2Data: Record<string, unknown>,
): string {
  const marketSize = normalizeRubricMetricBlock(metric2Data.marketSize);
  const solutionValueProposition = normalizeRubricMetricBlock(metric2Data.solutionValueProposition);
  const competitivePosition = normalizeRubricMetricBlock(metric2Data.competitivePosition);
  const revenueModel = normalizeRubricMetricBlock(metric2Data.revenueModel);

  const scores = [
    marketSize.score,
    solutionValueProposition.score,
    competitivePosition.score,
    revenueModel.score,
  ];
  const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / 4);
  const summary =
    typeof metric2Data.summary === 'string' && metric2Data.summary.trim()
      ? metric2Data.summary.trim()
      : 'Summary not available.';
  const competitorCounterplay =
    typeof metric2Data.competitorCounterplay === 'string'
      ? metric2Data.competitorCounterplay.trim()
      : '';

  return JSON.stringify({
    marketSize,
    solutionValueProposition,
    competitivePosition,
    revenueModel,
    overallScore,
    summary,
    competitorCounterplay,
    rubricSpecificFeedback: {
      marketSize: marketSize.feedback,
      solutionValueProposition: solutionValueProposition.feedback,
      competitivePosition: competitivePosition.feedback,
      revenueModel: revenueModel.feedback,
    },
  });
}

/** 5 small parallel Sonar/Groq calls — avoids one huge JSON blob. */
async function fetchMetric2Split(currentMarketStats: string, chatHistory: unknown[]) {
  const summaryPrompt = pitchEvaluationPromptMetric2SummaryShard(currentMarketStats, chatHistory);
  const shardPrompts = METRIC2_KEYS.map((key) =>
    pitchEvaluationPromptMetric2Shard(key, METRIC2_LABELS[key], currentMarketStats, chatHistory),
  );

  const [summaryCompletion, ...metricCompletions] = await Promise.all([
    completeWithPrompt(chatHistory, summaryPrompt),
    ...shardPrompts.map((p) => completeWithPrompt(chatHistory, p)),
  ]);

  const merged: Record<string, unknown> = {};
  const summaryParsed = await parseShard(summaryCompletion, 'summary');
  if (typeof summaryParsed.summary === 'string') merged.summary = summaryParsed.summary;
  if (typeof summaryParsed.competitorCounterplay === 'string') {
    merged.competitorCounterplay = summaryParsed.competitorCounterplay;
  }

  for (let i = 0; i < METRIC2_KEYS.length; i += 1) {
    const key = METRIC2_KEYS[i];
    const parsed = await parseShard(metricCompletions[i], key);
    if (parsed[key] != null) merged[key] = parsed[key];
    else if (Object.keys(parsed).length === 1) {
      const onlyKey = Object.keys(parsed)[0];
      merged[key] = parsed[onlyKey];
    }
  }

  const content = buildCombinedMetric2Json(merged);
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
  const citationItems = allCompletions.flatMap((c) => buildCitationItemsFromSonarResponse(c));
  const dedupedCitationItems = Array.from(
    new Map(citationItems.map((item) => [item.url, item])).values(),
  );

  return { content, citations, citationItems: dedupedCitationItems };
}

async function fetchMetric2Monolithic(currentMarketStats: string, chatHistory: unknown[]) {
  let metric2Result = await getSonarChatCompletionForMetric(
    chatHistory,
    pitchEvaluationPromptMetric2(currentMarketStats, chatHistory),
  );
  console.log(metric2Result, 'direct metric2 completion');

  let cleaned = cleanSonarOutputMetric2(metric2Result);
  if (cleaned.includes('Sonar parsing error')) {
    console.warn('metric2: monolithic Sonar parse failed, retrying once…');
    metric2Result = await getSonarChatCompletionForMetric(
      chatHistory,
      pitchEvaluationPromptMetric2(currentMarketStats, chatHistory),
    );
    cleaned = cleanSonarOutputMetric2(metric2Result);
  }
  if (cleaned.includes('Sonar parsing error')) {
    console.warn('metric2: monolithic failed twice, falling back to split shards…');
    return fetchMetric2Split(currentMarketStats, chatHistory);
  }

  return {
    content: cleaned,
    citations: metric2Result?.citations || [],
    citationItems: buildCitationItemsFromSonarResponse(metric2Result),
  };
}

const fetchMetric2 = async (currentMarketStats: string, chatHistory: unknown[]) => {
  try {
    const { content, citations, citationItems } = useSplitRubricMetric2()
      ? await fetchMetric2Split(currentMarketStats, chatHistory)
      : await fetchMetric2Monolithic(currentMarketStats, chatHistory);

    if (!content || content.includes('Sonar parsing error')) {
      console.log('Invalid rubric JSON format, returning null');
      return null;
    }

    const filteredResponse = metric2ResultInvestorFilter(content);
    if (!filteredResponse) {
      console.log('Invalid rubric JSON format, returning null');
      return null;
    }

    const result = {
      rubricData: filteredResponse,
      citations,
      citationItems,
    };
    console.log('metric2 final result', result);
    return result;
  } catch (error) {
    console.error('Error in fetchRubric:', error);
    return null;
  }
};

const cleanSonarOutputMetric2 = (metric2: unknown): string => {
  try {
    if (!metric2) {
      throw new Error('One or more metrics have invalid JSON.');
    }
    console.log('testFn metric2 begin');

    const rawContent = messageContentToString(
      (metric2 as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message
        ?.content,
    );
    const metric2Data = parseJsonFromLlmContent(rawContent) as Record<string, unknown>;
    console.log(metric2Data, 'testFn3 metric2: parse successful');

    return buildCombinedMetric2Json(metric2Data);
  } catch (error) {
    console.error('Error merging Sonar outputs:', error);
    return JSON.stringify({
      marketSize: { score: 0, feedback: 'Unable to evaluate due to Sonar parsing error.' },
      solutionValueProposition: { score: 0, feedback: 'Unable to evaluate due to Sonar parsing error.' },
      competitivePosition: { score: 0, feedback: ' Unable to evaluate due to Sonar parsing error.' },
      revenueModel: { score: 0, feedback: ' Unable to evaluate due to Sonar parsing error.' },
      overallScore: 0,
      summary:
        '[Market Size, Solution Value Proposition, Competitive Position] Failed to evaluate pitch due to parsing errors in Sonar responses.',
      competitorCounterplay: '',
      rubricSpecificFeedback: {
        marketSize: 'Unable to evaluate due to Sonar parsing error.',
        solutionValueProposition: 'Unable to evaluate due to Sonar parsing error.',
        competitivePosition: 'Unable to evaluate due to Sonar parsing error.',
        revenueModel: 'Unable to evaluate due to Sonar parsing error.',
      },
    });
  }
};

export default pitchEvaluationResponseMetric2;
