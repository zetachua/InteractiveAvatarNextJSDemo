import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Rubric2InvestorMetricData, Rubric2InvestorSpecificData, RubricCitationItem } from './KnowledgeClasses';
import Section from './Section';
import { splitSessionAndFrameworkCitations } from '@/utils/analyticsExport';

const RUBRIC_METRIC_LABELS: Record<string, string> = {
  elevatorPitch: 'Elevator Pitch',
  team: 'Team',
  marketOpportunity: 'Market Opportunity',
  marketSize: 'Market Size',
  solutionValueProposition: 'Solution & Value Proposition',
  competitivePosition: 'Competitive Position',
  tractionAwards: 'Traction & Awards',
  revenueModel: 'Revenue Model',
};

function titleFromUrl(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    return h || url;
  } catch {
    return 'Source';
  }
}

function getRubricPieColor(score: number) {
  if (score <= 5) {
    const t = score / 5;
    // Softer coral/rose (less harsh than pure rgb(R,0,0)); slightly brighter toward mid scores
    const r = Math.round(255);
    const g = Math.round(175 - 5 * t);
    const b = Math.round(175 - 5 * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const intensity = (score - 5) / 5;
  const greenValue = Math.floor(100 + 155 * intensity);
  return `rgb(0, ${greenValue}, 0)`;
}

interface RubricInvestorPieChartProps2 {
  resetAllStates?: () => void;
  summary?: string;
  totalRounds: number;
  specificFeedback?: Rubric2InvestorSpecificData;
  data?: Rubric2InvestorMetricData;
  overallScore?: number;
  /** @deprecated prefer citationItems */
  citations?: string;
  citationItems?: RubricCitationItem[];
  /** Metric-2 rival-founder counterplay (Sonar). */
  competitorCounterplay?: string;
}

const RubricInvestorPiechart2: React.FC<RubricInvestorPieChartProps2> = ({
  data,
  citations,
  citationItems,
  overallScore,
  totalRounds: _totalRounds,
  summary,
  specificFeedback,
  competitorCounterplay,
}) => {
  const rubricMetrics: Rubric2InvestorMetricData = data ?? ({} as Rubric2InvestorMetricData);
  const rubricSummary: string = summary ?? '';
  const rubricSpecificFeedback: Rubric2InvestorSpecificData = specificFeedback ?? ({} as Rubric2InvestorSpecificData);
  const rubricOverallScore: number = overallScore ?? 0;
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  const sortedFeedbackRows = useMemo(() => {
    const entries = Object.entries(rubricSpecificFeedback || {}).filter(([, fb]) => fb);
    return entries
      .map(([key, feedback]) => {
        const score = rubricMetrics[key as keyof Rubric2InvestorMetricData];
        const n = typeof score === 'number' && !Number.isNaN(score) ? score : 0;
        return {
          key,
          feedback: feedback as string,
          score: n,
          label: RUBRIC_METRIC_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim(),
          accent: getRubricPieColor(n),
        };
      })
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.key.localeCompare(b.key);
      });
  }, [rubricSpecificFeedback, rubricMetrics]);

  const chartData = Object.entries(rubricMetrics).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value as number,
  }));

  const roundedOverallScore =
    rubricOverallScore !== undefined ? Math.ceil((rubricOverallScore + Number.EPSILON) * 10) / 10 : 0;

  const resolvedCitations = useMemo((): RubricCitationItem[] => {
    if (citationItems?.length) return citationItems;
    if (!citations?.trim()) return [];
    return citations
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((url) => ({ title: titleFromUrl(url), url }));
  }, [citationItems, citations]);

  const { session: citeSession, frameworkSupplementary, combined: combinedCitations } = useMemo(
    () => splitSessionAndFrameworkCitations(resolvedCitations),
    [resolvedCitations],
  );

  function renderCitationBlock(title: string, items: RubricCitationItem[], offset: number) {
    if (items.length === 0) return null;
    return (
      <>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d4d4d8', marginTop: offset > 0 ? '0.65rem' : 0, marginBottom: '0.35rem' }}>
          {title}
        </div>
        {items.map((item, index) => (
          <div
            key={`${item.url}-${offset}-${index}`}
            style={{
              padding: '0.5rem 0.6rem',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ fontWeight: 600, color: '#f4f4f5', lineHeight: 1.35, marginBottom: '0.25rem' }}>
              {offset + index + 1}. {item.title}
            </div>
            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#9bb5ff', wordBreak: 'break-all', lineHeight: 1.4 }}>
              {item.url}
            </a>
          </div>
        ))}
      </>
    );
  }

  const summaryPoints = useMemo(() => {
    const flat = rubricSummary.replace(/\r\n/g, '\n').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!flat) return [];
    const chunks = flat.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of chunks) {
      const key = c.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }, [rubricSummary]);
  const visibleSummaryPoints = showFullSummary ? summaryPoints : summaryPoints.slice(0, 4);

  return (
    <div
      style={{
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        position: 'relative',
        height: '100%',
        zIndex: '1001',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: '0.95rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.1)',
            position: 'relative',
            padding: '1rem',
            borderRadius: '20px',
            textAlign: 'center',
            width: '100%',
            fontSize: '1rem',
          }}
        >
          <b> AI Analysis</b>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.45, padding: '0.3rem', textAlign: 'left' }}>
            <ul style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.75rem 0.95rem', margin: 0, textAlign: 'left' }}>
              {visibleSummaryPoints.map((point, index) => (
                <li key={`${point}-${index}`} style={{ marginBottom: '0.55rem' }}>
                  {point}
                  {point.endsWith('.') ? '' : '.'}
                </li>
              ))}
            </ul>
            {summaryPoints.length > 4 && (
              <button
                type="button"
                onClick={() => setShowFullSummary(!showFullSummary)}
                style={{ marginTop: '0.45rem', border: 'none', background: 'transparent', color: '#9bb5ff', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                {showFullSummary ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCitations(!showCitations)}
            style={{ marginTop: '0.25rem', border: 'none', background: 'transparent', color: '#9bb5ff', fontSize: '0.82rem', cursor: 'pointer' }}
          >
            {showCitations ? 'Hide citations' : `Show citations (${combinedCitations.length})`}
          </button>
          {showCitations && (
            <div
              style={{
                display: 'flex',
                maxHeight: '320px',
                marginTop: '0.5rem',
                overflow: 'auto',
                flexDirection: 'column',
                gap: '0.55rem',
                fontSize: '0.85rem',
                padding: '0.65rem',
                textAlign: 'left',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '12px',
              }}
            >
              <b style={{ marginBottom: '0.15rem' }}>References</b>
              {citeSession.length === 0 ? (
                <span style={{ opacity: 0.85 }}>No session web sources returned for this run (framework links below still apply).</span>
              ) : null}
              {renderCitationBlock('Sources from this session (Perplexity / web)', citeSession, 0)}
              {renderCitationBlock(
                'Pitch evaluation frameworks (reference)',
                frameworkSupplementary,
                citeSession.length,
              )}
            </div>
          )}
        </div>
        <div style={{ position: 'relative', marginTop: '2rem' }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.95rem',
              padding: '0.2rem 0.8rem',
              borderRadius: '12px',
              color: '#000',
              backgroundColor: '#fff',
              position: 'absolute',
              top: '8px',
              left: '14px',
              zIndex: 2,
            }}
          >
            {roundedOverallScore}/10
          </div>
          <PieChart width={450} height={350}>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getRubricPieColor(entry.value)} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      </div>
      <div style={{ padding: '1rem' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            width: '100%',
          }}
        >
          {sortedFeedbackRows.map(({ key, label, feedback, accent }) => (
            <Section key={key} title={`${label} (${rubricMetrics[key as keyof Rubric2InvestorMetricData] ?? 0}/10)`} feedback={feedback} headerAccentColor={accent} />
          ))}
          {competitorCounterplay?.trim() ? (
            <Section
              title="Competitor Counterplay"
              feedback={competitorCounterplay.trim()}
              headerAccentColor="rgba(255, 193, 7, 0.95)"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RubricInvestorPiechart2;
