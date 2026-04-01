
export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "HeyGen API key is missing in request header x-api-key." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = await fetch(
      "https://api.heygen.com/v1/streaming.create_token",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
        },
      },
    );
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: data?.message || data?.error || "Failed to create HeyGen streaming token.",
          details: data || null,
          status: res.status,
        }),
        {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const token = data?.data?.token;
    if (!token) {
      return new Response(
        JSON.stringify({
          error: "HeyGen token not found in response payload.",
          details: data || null,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(token, {
      status: 200,
    });
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
