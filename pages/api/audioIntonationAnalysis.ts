import type { NextApiRequest, NextApiResponse } from "next";

const AUDIO_ANALYSIS_BASE_URL =
  process.env.AUDIO_ANALYSIS_BASE_URL?.trim() || "http://127.0.0.1:8000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const upstream = await fetch(`${AUDIO_ANALYSIS_BASE_URL}/intonationAnalysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (error) {
    console.error("audioIntonationAnalysis proxy failed:", error);
    return res.status(502).json({ error: "Audio analysis server unavailable" });
  }
}
