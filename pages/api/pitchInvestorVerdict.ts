import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { investorVerdictPrompt, type InvestorVerdictContext } from './prompts';
import { cleanResponse } from './pitchEvaluationResponseShared';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export default async function pitchInvestorVerdict(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  try {
    const body = req.body as Record<string, unknown>;
    const rubricMetrics = asRecord(body.rubricMetrics);
    const sentimentMetrics = asRecord(body.sentimentMetrics);
    const rubricFb = body.rubricSpecificFeedback;
    const ctx: InvestorVerdictContext = {
      rubricOverallScore: Number(body.rubricOverallScore) || 0,
      rubricSummary: String(body.rubricSummary ?? ''),
      rubricMetrics,
      rubricSpecificFeedback:
        rubricFb && typeof rubricFb === 'object' && !Array.isArray(rubricFb)
          ? (Object.fromEntries(
              Object.entries(rubricFb as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]),
            ) as Record<string, string>)
          : undefined,
      sentimentOverallScore: Number(body.sentimentOverallScore) || 0,
      sentimentSummary: String(body.sentimentSummary ?? ''),
      sentimentMetrics,
    };

    const prompt = investorVerdictPrompt(ctx);
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Produce the JSON object now.' },
      ],
      model: process.env.GROQ_INVESTOR_VERDICT_MODEL || 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty completion');

    const parsed = JSON.parse(cleanResponse(raw)) as { sections?: unknown; investorVerdict?: string };

    type VerdictSection = { heading: string; body: string };
    const sections: VerdictSection[] = [];
    if (Array.isArray(parsed.sections)) {
      for (const item of parsed.sections) {
        if (!item || typeof item !== 'object') continue;
        const o = item as Record<string, unknown>;
        const heading = typeof o.heading === 'string' ? o.heading.trim() : '';
        const body = typeof o.body === 'string' ? o.body.trim() : '';
        if (heading && body) sections.push({ heading, body });
      }
    }

    let investorVerdict = '';
    if (sections.length > 0) {
      investorVerdict = sections.map((s) => `${s.heading}. ${s.body}`).join('\n\n');
    } else if (typeof parsed.investorVerdict === 'string') {
      investorVerdict = parsed.investorVerdict.trim();
    }

    return res.status(200).json({
      investorVerdict,
      investorVerdictSections: sections.length > 0 ? sections : undefined,
    });
  } catch (e) {
    console.error('pitchInvestorVerdict', e);
    return res.status(500).json({ error: 'Failed to generate investor verdict' });
  }
}
