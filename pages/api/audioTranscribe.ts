import type { NextApiRequest, NextApiResponse } from "next";

const AUDIO_ANALYSIS_BASE_URL =
  process.env.AUDIO_ANALYSIS_BASE_URL?.trim() || "http://127.0.0.1:8000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const file = typeof req.body?.file === "string" ? req.body.file.trim() : "";
  if (!file) {
    return res.status(400).json({ error: "Missing file" });
  }

  try {
    const upstream = await fetch(
      `${AUDIO_ANALYSIS_BASE_URL}/transcribe?file=${encodeURIComponent(file)}`,
      { method: "POST" },
    );
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (error) {
    console.error("audioTranscribe proxy failed:", error);
    return res.status(502).json({ error: "Audio analysis server unavailable" });
  }
}
