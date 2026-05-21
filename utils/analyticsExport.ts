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

function buildVoiceAnalysisHtml(assessment: { pronunciation: unknown; intonation: unknown; fluency: unknown }): string {
  const sections: string[] = [];

  // Fluency
  const fl = assessment.fluency;
  if (fl && typeof fl === 'object') {
    const f = fl as Record<string, unknown>;
    const score = typeof f.score === 'number' ? f.score : null;
    const pauseScore = typeof f.pause_score === 'number' ? f.pause_score : null;
    const articulationRate = typeof f.articulation_rate_wpm === 'number' ? f.articulation_rate_wpm : null;
    const words = Array.isArray(f.words) ? (f.words as Record<string, unknown>[]) : [];

    const pauses = words.filter(w => w.text === '**pause**');
    const goodPauses = pauses.filter(w => w.classification === 'good');
    const badPauses = pauses.filter(w => w.classification === 'bad');
    const fillers = words.filter(w => w.filler === true);
    const hesitations = words.filter(w => w.hesitation === true);
    const fillerTexts = Array.from(new Set(fillers.map(w => String(w.text ?? '').toLowerCase()))).slice(0, 6);

    let pauseDetail = '';
    if (badPauses.length > 0) {
      const examples = badPauses.slice(0, 3).map(p => {
        const gap = typeof p.gap === 'number' ? `${p.gap}s` : '';
        const reason = typeof p.reason === 'string' ? p.reason : 'disruptive pause';
        return gap ? `${gap} — ${reason}` : reason;
      }).join('; ');
      pauseDetail = `Disruptive pauses: ${examples}.`;
    } else if (goodPauses.length > 0) {
      pauseDetail = 'All detected pauses appear well-timed.';
    }

    const rateLabel = articulationRate !== null
      ? (articulationRate < 110 ? `${articulationRate} wpm — too slow (aim for 120–160 wpm)`
        : articulationRate > 200 ? `${articulationRate} wpm — too fast (aim for 120–160 wpm)`
        : `${articulationRate} wpm — good pace`)
      : null;

    const rows = [
      score !== null ? `<tr><td>Fluency score</td><td>${score}/100</td></tr>` : '',
      pauseScore !== null ? `<tr><td>Pause quality score</td><td>${pauseScore}/100</td></tr>` : '',
      rateLabel ? `<tr><td>Articulation rate</td><td>${esc(rateLabel)}</td></tr>` : '',
      `<tr><td>Pauses detected</td><td>${esc(`${pauses.length} total — ${goodPauses.length} well-timed, ${badPauses.length} disruptive`)}</td></tr>`,
      pauseDetail ? `<tr><td>Pause highlights</td><td>${esc(pauseDetail)}</td></tr>` : '',
      `<tr><td>Filler words</td><td>${esc(fillers.length > 0 ? `${fillers.length} detected (e.g. ${fillerTexts.join(', ')})` : 'None detected — good')}</td></tr>`,
      hesitations.length > 0 ? `<tr><td>Hesitations</td><td>${esc(`${hesitations.length} prolonged word hold(s) — may signal uncertainty`)}</td></tr>` : '',
    ].filter(Boolean).join('');

    sections.push(`<h3>Fluency</h3><table><tbody>${rows}</tbody></table>`);
  }

  // Pronunciation
  const pr = assessment.pronunciation;
  if (pr && typeof pr === 'object') {
    const p = pr as Record<string, unknown>;
    const score = typeof p.score === 'number' ? p.score : null;
    const words = Array.isArray(p.words) ? (p.words as Record<string, unknown>[]) : [];
    const lowScoreWords = words
      .filter(w => typeof w.score === 'number' && (w.score as number) < 70)
      .sort((a, b) => (a.score as number) - (b.score as number))
      .slice(0, 5);

    const scoreLabel = score !== null
      ? (score >= 90 ? `${score}/100 — excellent` : score >= 75 ? `${score}/100 — good` : score >= 60 ? `${score}/100 — needs practice` : `${score}/100 — needs significant work`)
      : null;

    const rows = [
      scoreLabel ? `<tr><td>Pronunciation accuracy</td><td>${esc(scoreLabel)}</td></tr>` : '',
      `<tr><td>Words needing work</td><td>${esc(lowScoreWords.length > 0 ? lowScoreWords.map(w => `${String(w.text ?? '')} (${String(w.score ?? '')}%)`).join(', ') : 'All words pronounced clearly')}</td></tr>`,
    ].filter(Boolean).join('');

    sections.push(`<h3>Pronunciation</h3><table><tbody>${rows}</tbody></table>`);
  }

  // Intonation
  const it = assessment.intonation;
  if (it && typeof it === 'object') {
    const i = it as Record<string, unknown>;
    const score = typeof i.score === 'number' ? i.score : null;
    const words = Array.isArray(i.words) ? (i.words as Record<string, unknown>[]) : [];
    const expectedWords = words.filter(w => w.expected === true);
    const correctlyEmphasized = words.filter(w => w.expected === true && w.actual === true);
    const emphasisPct = expectedWords.length > 0 ? Math.round((correctlyEmphasized.length / expectedWords.length) * 100) : null;
    const missedWords = words.filter(w => w.expected === true && w.actual === false).slice(0, 5).map(w => String(w.text ?? ''));

    const emphasisLabel = emphasisPct !== null
      ? `${correctlyEmphasized.length}/${expectedWords.length} key words emphasized (${emphasisPct}%)${emphasisPct < 50 ? ' — work on stressing important nouns and verbs' : emphasisPct < 75 ? ' — decent but room to improve' : ' — strong'}`
      : null;

    const rows = [
      score !== null ? `<tr><td>Intonation score</td><td>${score}/100</td></tr>` : '',
      emphasisLabel ? `<tr><td>Emphasis accuracy</td><td>${esc(emphasisLabel)}</td></tr>` : '',
      missedWords.length > 0 ? `<tr><td>Under-emphasized words</td><td>${esc(missedWords.join(', '))} — try stressing these</td></tr>` : '',
    ].filter(Boolean).join('');

    sections.push(`<h3>Intonation & Emphasis</h3><table><tbody>${rows}</tbody></table>`);
  }

  return sections.join('');
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
      return `<h3>${esc(label)}</h3><p style="white-space:pre-wrap;background:#fafafa;border-left:3px solid #3b82f6;padding:0.5rem 0.75rem;border-radius:4px">${esc(String(text))}</p>`;
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
  ${citeSession.length > 0
    ? `<details open style="margin-bottom:1rem"><summary style="cursor:pointer;font-weight:600;color:#1d4ed8">Market data sources that informed this analysis (${citeSession.length})</summary><ol style="margin:0.5rem 0 0;padding-left:1.4rem">${citeList(citeSession)}</ol></details>`
    : '<p style="font-size:0.85rem;color:#888">No live market data sources retrieved for this session.</p>'}
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

  ${hasVoice ? `<h2>Voice &amp; Delivery Assessment</h2>${buildVoiceAnalysisHtml(payload.assessment)}` : ''}

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
