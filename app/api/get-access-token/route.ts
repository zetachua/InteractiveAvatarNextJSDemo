export async function POST(req: Request) {
  try {
    const requestApiKey = req.headers.get("x-api-key");
    const apiKey = requestApiKey || process.env.LIVEAVATAR_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LiveAvatar API key missing. Provide x-api-key or set LIVEAVATAR_API_KEY." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "X-API-KEY": apiKey, // ✅ was process.env.LIVEAVATAR_API_KEY — use resolved apiKey instead
      },
      // FULL mode: LiveKit `avatar.speak_text` on topic `agent-control` is supported (see LiveAvatar docs).
      // LITE mode is video-only from your stack: you must send PCM audio via WebSocket `agent.speak`, not plain text.
      body: JSON.stringify({
        mode: "FULL",
        avatar_id: "65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0",
        is_sandbox: false,
        avatar_persona: {
          voice_id: "62bbb4b2-bb26-4727-bc87-cfb2bd4e0cc8",
          language: "en",
        },
        interactivity_type: "CONVERSATIONAL",
        ...(process.env.LIVEAVATAR_MAX_SESSION_SECONDS
          ? { max_session_duration: Math.min(3600, parseInt(process.env.LIVEAVATAR_MAX_SESSION_SECONDS, 10) || 600) }
          : {}),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: data?.message || data?.error || "Failed to create LiveAvatar session token.",
          details: data || null,
          status: res.status,
        }),
        {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const sessionToken = data?.data?.session_token; // ✅ correct path based on actual API response
    const sessionId = data?.data?.session_id;       // ✅ correct path

    if (!sessionToken) {
      return new Response(
        JSON.stringify({
          error: "LiveAvatar session token not found in response payload.",
          details: data || null,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ sessionToken, sessionId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error retrieving access token:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to retrieve access token",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}