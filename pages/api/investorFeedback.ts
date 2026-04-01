import type { NextApiRequest, NextApiResponse } from "next";

type FeedbackPayload = {
  emojiSatisfaction: "satisfied" | "neutral" | "dissatisfied";
  reason?: string;
  pitchUnderstandingScore: number;
  selectedModel?: string;
};

const validEmojis = new Set(["satisfied", "neutral", "dissatisfied"]);

export default async function investorFeedback(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL ;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseWriteKey = supabaseServiceRoleKey;

  if (!supabaseUrl || !supabaseWriteKey) {
    return res.status(500).json({
      error:
        "Supabase environment variables are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const isLikelyUrl = supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://");
  if (!isLikelyUrl) {
    return res.status(500).json({
      error:
        "Invalid SUPABASE_URL. It should look like https://<project-ref>.supabase.co (you likely pasted a key here).",
    });
  }

  // Prevent accidentally using publishable key as service key.
  if (supabaseWriteKey.startsWith("sb_publishable_")) {
    return res.status(500).json({
      error:
        "Invalid SUPABASE_SERVICE_ROLE_KEY. You used a publishable key. Please use the service role/secret key from Supabase Project Settings > API.",
    });
  }

  try {
    const { emojiSatisfaction, reason, pitchUnderstandingScore, selectedModel } = req.body as FeedbackPayload;

    if (!validEmojis.has(emojiSatisfaction)) {
      return res.status(400).json({ error: "Invalid emojiSatisfaction value" });
    }

    if (
      typeof pitchUnderstandingScore !== "number" ||
      pitchUnderstandingScore < 1 ||
      pitchUnderstandingScore > 5
    ) {
      return res.status(400).json({ error: "pitchUnderstandingScore must be a number between 1 and 5" });
    }

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/investor_feedback`, {
      method: "POST",
      headers: {
        apikey: supabaseWriteKey,
        Authorization: `Bearer ${supabaseWriteKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify([
        {
          emoji_satisfaction: emojiSatisfaction,
          reason: reason?.trim() || null,
          understanding_score: pitchUnderstandingScore,
          selected_model: selectedModel || null,
        },
      ]),
    });

    const responseJson = await insertResponse.json().catch(() => null);
    if (!insertResponse.ok) {
      console.error("Supabase insert failed:", responseJson);
      return res.status(insertResponse.status).json({
        error: responseJson?.message || "Failed to insert feedback into Supabase",
        details: responseJson || null,
      });
    }

    return res.status(200).json({ ok: true, data: responseJson });
  } catch (error) {
    console.error("investorFeedback API error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

