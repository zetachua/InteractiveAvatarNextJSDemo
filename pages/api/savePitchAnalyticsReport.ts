import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Supabase: create table (run in SQL editor or migration):
 *
 * create table if not exists public.pitch_analytics_reports (
 *   id uuid primary key default gen_random_uuid(),
 *   created_at timestamptz not null default now(),
 *   html_report text not null,
 *   payload jsonb,
 *   selected_model text
 * );
 *
 * Service role key bypasses RLS for server-side inserts.
 */

type Body = {
  html?: string;
  payload?: Record<string, unknown>;
  selectedModel?: string;
};

export default async function savePitchAnalyticsReport(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseWriteKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseWriteKey) {
    return res.status(500).json({
      error:
        "Supabase environment variables missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to persist reports.",
    });
  }

  if (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://")) {
    return res.status(500).json({ error: "Invalid SUPABASE_URL" });
  }

  if (supabaseWriteKey.startsWith("sb_publishable_")) {
    return res.status(500).json({
      error: "Use SUPABASE_SERVICE_ROLE_KEY (not the publishable key) for pitch_analytics_reports inserts.",
    });
  }

  try {
    const { html, payload, selectedModel } = req.body as Body;
    if (typeof html !== "string" || !html.trim()) {
      return res.status(400).json({ error: "html must be a non-empty string" });
    }

    const row = {
      html_report: html,
      payload: payload ?? null,
      selected_model: selectedModel?.trim() || null,
    };

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/pitch_analytics_reports`, {
      method: "POST",
      headers: {
        apikey: supabaseWriteKey,
        Authorization: `Bearer ${supabaseWriteKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify([row]),
    });

    const responseJson = await insertResponse.json().catch(() => null);
    if (!insertResponse.ok) {
      console.error("Supabase pitch_analytics_reports insert failed:", responseJson);
      return res.status(insertResponse.status).json({
        error: responseJson?.message || "Failed to save report to Supabase",
        details: responseJson || null,
      });
    }

    return res.status(200).json({ ok: true, data: responseJson });
  } catch (error) {
    console.error("savePitchAnalyticsReport error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
