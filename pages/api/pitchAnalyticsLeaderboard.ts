import type { NextApiRequest, NextApiResponse } from 'next';
import type { PitchLeaderboardEntry } from '../../utils/analyticsExport';

type SupabaseRow = {
  id: string;
  created_at: string;
  selected_model: string | null;
  payload: Record<string, unknown> | null;
};

type ChatMessage = { role?: unknown; content?: unknown };

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asMetrics(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    const n = typeof val === 'number' ? val : parseFloat(String(val));
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function asFeedback(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    const s = str(val);
    if (s) out[k] = s;
  }
  return out;
}

function roleLabelFromModel(model: string | null): string {
  const m = (model || '').toLowerCase();
  if (m.includes('sharktank')) return 'Financial Advisor';
  if (m.includes('investor')) return 'Investor Coach';
  if (m.includes('mentor')) return 'Startup Mentor';
  return 'AI Investor';
}

function maybeName(text: string): string | null {
  const cleaned = text
    .replace(/["'“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?]+$/, '');
  if (!cleaned) return null;
  if (cleaned.length < 2 || cleaned.length > 42) return null;
  if (/^(startup|company|venture|app|platform|product|business)$/i.test(cleaned)) return null;
  if (/^(we|our|the|my|i|this)$/i.test(cleaned)) return null;
  return cleaned;
}

function extractStartupNameFromChat(v: unknown): string | null {
  if (!Array.isArray(v)) return null;
  const userTexts = (v as ChatMessage[])
    .filter((m) => String(m?.role || '').toLowerCase() === 'user')
    .map((m) => (typeof m?.content === 'string' ? m.content : ''))
    .filter(Boolean)
    .slice(0, 8);
  if (userTexts.length === 0) return null;

  const blob = userTexts.join('\n');
  const patterns = [
    /(?:startup|company|venture|platform|app|product)\s*(?:name|called|is called|named)?\s*[:\-]?\s*([A-Z][A-Za-z0-9&' -]{1,40})/i,
    /(?:we(?:'re| are)\s+(?:called|building)\s+)([A-Z][A-Za-z0-9&' -]{1,40})/i,
    /(?:my startup is|our startup is|our company is)\s+([A-Z][A-Za-z0-9&' -]{1,40})/i,
  ];
  for (const re of patterns) {
    const m = blob.match(re);
    const name = maybeName(m?.[1] || '');
    if (name) return name;
  }
  return null;
}

function inferStartupLabel(payload: Record<string, unknown>, selectedModel: string | null): string {
  const direct = str(payload.startupLabel || payload.startupName);
  if (direct) return direct;
  const fromChat = extractStartupNameFromChat(payload.chatHistory);
  if (fromChat) return fromChat;
  return roleLabelFromModel(selectedModel);
}

function parseSections(v: unknown): { heading: string; body: string }[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: { heading: string; body: string }[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const heading = str(o.heading);
    const body = str(o.body);
    if (heading && body) out.push({ heading, body });
  }
  return out.length ? out : undefined;
}

export default async function pitchAnalyticsLeaderboard(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseWriteKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseWriteKey) {
    return res.status(503).json({
      error: 'Leaderboard unavailable',
      detail: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      entries: [] as PitchLeaderboardEntry[],
    });
  }

  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    return res.status(500).json({ error: 'Invalid SUPABASE_URL', entries: [] });
  }

  const limitRaw = req.query.limit;
  const limit = Math.min(200, Math.max(10, parseInt(String(limitRaw ?? '120'), 10) || 120));

  try {
    const url = `${supabaseUrl}/rest/v1/pitch_analytics_reports?select=id,created_at,selected_model,payload&order=created_at.desc&limit=${limit}`;
    const listRes = await fetch(url, {
      headers: {
        apikey: supabaseWriteKey,
        Authorization: `Bearer ${supabaseWriteKey}`,
      },
    });

    const rows = (await listRes.json().catch(() => null)) as SupabaseRow[] | null;
    if (!listRes.ok || !Array.isArray(rows)) {
      console.error('pitchAnalyticsLeaderboard fetch failed:', rows);
      return res.status(listRes.status).json({
        error: 'Failed to load leaderboard',
        entries: [] as PitchLeaderboardEntry[],
      });
    }

    const entries: PitchLeaderboardEntry[] = [];

    for (const row of rows) {
      const p = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload) ? row.payload : {};
      const rubricOverallScore = num(p.rubricOverallScore);
      const sentimentScore = num(p.sentimentScore);

      entries.push({
        id: String(row.id),
        rank: 0,
        createdAt: row.created_at,
        selectedModel: row.selected_model,
        startupLabel: inferStartupLabel(p, row.selected_model),
        rubricOverallScore,
        sentimentScore,
        rubricSummary: str(p.rubricSummary),
        sentimentSummary: str(p.sentimentSummary),
        investorVerdict: str(p.investorVerdict),
        investorVerdictSections: parseSections(p.investorVerdictSections),
        rubricMetrics: asMetrics(p.rubricMetrics),
        rubricSpecificFeedback: asFeedback(p.rubricSpecificFeedback),
        competitorCounterplay: str(p.competitorCounterplay),
      });
    }

    entries.sort((a, b) => {
      // Sort by displayed values first (1 decimal) so ranking matches UI labels.
      const aRubricDisplay = round1(a.rubricOverallScore);
      const bRubricDisplay = round1(b.rubricOverallScore);
      if (bRubricDisplay !== aRubricDisplay) return bRubricDisplay - aRubricDisplay;

      const aSentimentDisplay = round1(a.sentimentScore);
      const bSentimentDisplay = round1(b.sentimentScore);
      if (bSentimentDisplay !== aSentimentDisplay) return bSentimentDisplay - aSentimentDisplay;

      // If displayed values tie, preserve deterministic order with raw precision.
      if (b.rubricOverallScore !== a.rubricOverallScore) return b.rubricOverallScore - a.rubricOverallScore;
      if (b.sentimentScore !== a.sentimentScore) return b.sentimentScore - a.sentimentScore;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    entries.forEach((e, i) => {
      e.rank = i + 1;
    });

    return res.status(200).json({ entries });
  } catch (e) {
    console.error('pitchAnalyticsLeaderboard', e);
    return res.status(500).json({ error: 'Internal Server Error', entries: [] as PitchLeaderboardEntry[] });
  }
}
