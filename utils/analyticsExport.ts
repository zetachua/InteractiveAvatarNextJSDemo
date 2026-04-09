import type {
  ChatHistory,
  FeedbackMetricData,
  FeedbackSpecificMetrics,
  Rubric2InvestorMetricData,
  Rubric2InvestorSpecificData,
  RubricCitationItem,
} from '@/components/KnowledgeClasses';
import { PITCH_FRAMEWORK_REFERENCE_CITATIONS } from '@/pages/api/configConstants';

/** Session web hits first; then supplementary pitch-evaluation framework links (deduped by URL). */
export function splitSessionAndFrameworkCitations(sessionCitations: RubricCitationItem[]): {
  session: RubricCitationItem[];
  frameworkSupplementary: RubricCitationItem[];
  combined: RubricCitationItem[];
} {
  const session = Array.isArray(sessionCitations) ? sessionCitations : [];
  const seen = new Set(session.map((c) => c.url.trim().toLowerCase()));
  const frameworkSupplementary: RubricCitationItem[] = PITCH_FRAMEWORK_REFERENCE_CITATIONS.filter(
    (c) => !seen.has(c.url.trim().toLowerCase()),
  ).map((c) => ({ title: c.title, url: c.url }));
  return {
    session,
    frameworkSupplementary,
    combined: [...session, ...frameworkSupplementary],
  };
}

export const RUBRIC_LABELS: Record<string, string> = {
  elevatorPitch: 'Elevator Pitch',
  team: 'Team',
  marketOpportunity: 'Market Opportunity',
  marketSize: 'Market Size',
  solutionValueProposition: 'Solution & Value Proposition',
  competitivePosition: 'Competitive Position',
  tractionAwards: 'Traction & Awards',
  revenueModel: 'Revenue Model',
};

/** Merge metric1 + metric2 overall summaries: normalize, split sentences, drop duplicates and near-duplicates. */
export function mergeRubricSummaries(parts: (string | undefined | null)[]): string {
  const blocks = parts.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  if (blocks.length === 0) return '';
  if (blocks.length === 1) return blocks[0].trim();

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

  function roughlyDuplicate(a: string, b: string): boolean {
    const na = norm(a);
    const nb = norm(b);
    if (na === nb) return true;
    const short = na.length <= nb.length ? na : nb;
    const long = na.length > nb.length ? na : nb;
    if (short.length < 24) return false;
    const prefixLen = Math.min(72, short.length);
    return long.includes(short.slice(0, prefixLen));
  }

  const sentences: string[] = [];
  const kept: string[] = [];

  for (const block of blocks) {
    const flat = block.replace(/\r\n/g, '\n').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    const splits = flat.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    for (const sent of splits) {
      const withPeriod = /[.!?]$/.test(sent) ? sent : `${sent}.`;
      if (kept.some((k) => roughlyDuplicate(withPeriod, k))) continue;
      kept.push(withPeriod);
      sentences.push(withPeriod);
    }
  }

  return sentences.join(' ');
}

export type InvestorVerdictSection = { heading: string; body: string };

/** Row returned by `/api/pitchAnalyticsLeaderboard` (text analytics only; no voice / chat). */
export type PitchLeaderboardEntry = {
  id: string;
  rank: number;
  createdAt: string;
  selectedModel: string | null;
  startupLabel?: string;
  rubricOverallScore: number;
  sentimentScore: number;
  rubricSummary: string;
  sentimentSummary: string;
  investorVerdict: string;
  investorVerdictSections?: InvestorVerdictSection[];
  rubricMetrics: Record<string, number>;
  rubricSpecificFeedback: Record<string, string>;
  competitorCounterplay: string;
};

export type AnalyticsExportPayload = {
  rubricSummary: string;
  rubricOverallScore: number;
  rubricMetrics: Rubric2InvestorMetricData | null;
  rubricSpecificFeedback: Rubric2InvestorSpecificData;
  citations: RubricCitationItem[];
  competitorCounterplay?: string;
  investorVerdict?: string;
  investorVerdictSections?: InvestorVerdictSection[];
  sentimentScore: number;
  sentimentMetrics: FeedbackMetricData;
  sentimentSummary: string;
  sentimentSpecificFeedback: FeedbackSpecificMetrics;
  chatHistory: ChatHistory[];
  assessment: {
    pronunciation: unknown;
    intonation: unknown;
    fluency: unknown;
  };
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildAnalyticsReportHtml(payload: AnalyticsExportPayload, title = 'Pitch analytics report'): string {
  const when = new Date().toISOString();
  const metrics = payload.rubricMetrics ?? ({} as Rubric2InvestorMetricData);
  const metricRows = Object.entries(metrics)
    .map(([k, v]) => {
      const label = RUBRIC_LABELS[k] ?? k;
      return `<tr><td>${esc(label)}</td><td style="text-align:center">${typeof v === 'number' ? v : '—'}/10</td></tr>`;
    })
    .join('');

  const feedbackBlocks = Object.entries(payload.rubricSpecificFeedback || {})
    .filter(([, text]) => text && String(text).trim())
    .map(([k, text]) => {
      const label = RUBRIC_LABELS[k] ?? k;
      return `<h3>${esc(label)}</h3><p style="white-space:pre-wrap">${esc(String(text))}</p>`;
    })
    .join('');

  const { session: citeSession, frameworkSupplementary: citeFramework } = splitSessionAndFrameworkCitations(
    payload.citations || [],
  );
  const citeList = (items: RubricCitationItem[]) =>
    items
      .map((c) => `<li><strong>${esc(c.title)}</strong><br/><a href="${esc(c.url)}">${esc(c.url)}</a></li>`)
      .join('');
  const citesSessionBlock =
    citeSession.length > 0
      ? `<h3>Sources from this session (Perplexity / web)</h3><ol>${citeList(citeSession)}</ol>`
      : '<h3>Sources from this session (Perplexity / web)</h3><p>—</p>';
  const citesFrameworkBlock =
    citeFramework.length > 0
      ? `<h3>Pitch evaluation frameworks (reference)</h3><ol>${citeList(citeFramework)}</ol>`
      : '';

  const sm = payload.sentimentMetrics;
  const sentimentRows = `
    <tr><td>Clarity</td><td>${sm.clarity ?? '—'}</td></tr>
    <tr><td>Relevance</td><td>${sm.relevance ?? '—'}</td></tr>
    <tr><td>Depth</td><td>${sm.depth ?? '—'}</td></tr>
    <tr><td>Neutrality</td><td>${sm.neutrality ?? '—'}</td></tr>
    <tr><td>Engagement</td><td>${sm.engagement ?? '—'}</td></tr>
  `;

  const chatSection = payload.chatHistory
    .map((m) => `<div class="chat"><strong>${esc(m.role)}</strong><p style="white-space:pre-wrap">${esc(String(m.content))}</p></div>`)
    .join('');

  const hasVoice =
    payload.assessment?.pronunciation != null ||
    payload.assessment?.intonation != null ||
    payload.assessment?.fluency != null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${esc(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #111; line-height: 1.5; }
    h1 { font-size: 1.35rem; }
    h2 { font-size: 1.1rem; margin-top: 1.75rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
    h3 { font-size: 0.95rem; margin: 1rem 0 0.35rem; color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.45rem 0.6rem; text-align: left; }
    th { background: #f4f4f4; }
    .meta { color: #666; font-size: 0.85rem; margin-bottom: 1.5rem; }
    .chat { background: #f9f9f9; border-radius: 8px; padding: 0.65rem 0.85rem; margin-bottom: 0.5rem; }
    ul { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <p class="meta">Generated ${esc(when)}</p>

  <h2>Perplexity-style rubric — overall</h2>
  <p><strong>Overall score:</strong> ${payload.rubricOverallScore ?? '—'}/10</p>
  <p style="white-space:pre-wrap">${esc(payload.rubricSummary || '—')}</p>

  <h2>Rubric scores</h2>
  <table><thead><tr><th>Area</th><th>Score</th></tr></thead><tbody>${metricRows}</tbody></table>

  <h2>Rubric — detailed feedback</h2>
  ${feedbackBlocks || '<p>—</p>'}

  <h2>Competitor Counterplay</h2>
  <p style="white-space:pre-wrap">${esc((payload.competitorCounterplay || '').trim() || '—')}</p>

  <h2>Investor Verdict</h2>
  ${
    payload.investorVerdictSections && payload.investorVerdictSections.length > 0
      ? payload.investorVerdictSections
          .map(
            (s) =>
              `<h3 style="margin:0.75rem 0 0.35rem;font-size:1.05rem">${esc(s.heading)}</h3><p style="white-space:pre-wrap;margin:0 0 0.5rem">${esc(s.body)}</p>`,
          )
          .join('')
      : `<p style="white-space:pre-wrap">${esc((payload.investorVerdict || '').trim() || '—')}</p>`
  }

  <h2>References</h2>
  ${citesSessionBlock}
  ${citesFrameworkBlock}

  <h2>Sentiment (pitch delivery)</h2>
  <p><strong>Overall:</strong> ${payload.sentimentScore ?? '—'}</p>
  <table><tbody>${sentimentRows}</tbody></table>
  <p style="white-space:pre-wrap">${esc(payload.sentimentSummary || '—')}</p>
  <p><strong>Specifics:</strong></p>
  <pre style="white-space:pre-wrap;font-size:0.9rem;background:#f5f5f5;padding:0.75rem;border-radius:8px">${esc(JSON.stringify(payload.sentimentSpecificFeedback, null, 2))}</pre>

  ${hasVoice ? `<h2>Voice assessment (raw)</h2><pre style="white-space:pre-wrap;font-size:0.8rem;background:#f5f5f5;padding:0.75rem;border-radius:8px">${esc(JSON.stringify(payload.assessment, null, 2))}</pre>` : ''}

  <h2>Chat history</h2>
  ${chatSection || '<p>—</p>'}
</body>
</html>`;
}

export function downloadHtmlFile(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
