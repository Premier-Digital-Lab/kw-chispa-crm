exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }),
    };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SB_PUBLISHABLE_KEY;

  // Extract user JWT forwarded from the frontend
  const authHeader =
    event.headers["authorization"] || event.headers["Authorization"];
  const userJwt = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!userJwt) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Supabase is not configured on the server.",
      }),
    };
  }

  // Verify the JWT with Supabase's auth endpoint — never trust a locally decoded token
  try {
    const verifyResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${userJwt}`,
        apikey: supabaseAnonKey,
      },
    });
    if (!verifyResp.ok) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }
    const verifiedUser = await verifyResp.json();
    if (!verifiedUser?.id) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }
  } catch (e) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let prompt;
  try {
    ({ prompt } = JSON.parse(event.body || "{}"));
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "prompt is required" }),
    };
  }

  const systemPrompt =
    "You are a social media content specialist for KW CHISPA, a bilingual Keller Williams affinity group " +
    "serving Hispanic/Latino real estate agents across the US and internationally.\n\n" +
    "Your job is to generate engaging social media posts (suitable for Instagram, Facebook, or LinkedIn) " +
    "for the topic the user provides. Always produce TWO versions:\n" +
    "1. An English post\n" +
    "2. A Spanish post\n\n" +
    "Guidelines:\n" +
    "- Keep posts between 100-200 words each\n" +
    "- Use a warm, professional, and community-focused tone that reflects KW CHISPA's values\n" +
    "- Include 3-5 relevant hashtags in each post (mix English and Spanish hashtags when appropriate)\n" +
    "- Make the Spanish post a culturally adapted version, not just a literal translation\n" +
    "- Do NOT include placeholder text like [Your Name] or [Call to Action] — write complete posts\n\n" +
    "Respond ONLY with a JSON object in this exact format (no markdown fences, no extra text):\n" +
    '{"english": "the english post text here", "spanish": "the spanish post text here"}';

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Generate a social media post about: ${prompt.trim()}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "AI service error" }),
      };
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text ?? "";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Fallback: try to extract JSON from the text in case there's extra content
      const jsonMatch = rawText.match(
        /\{[\s\S]*"english"[\s\S]*"spanish"[\s\S]*\}/,
      );
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error("Could not parse AI response as JSON:", rawText);
        return {
          statusCode: 502,
          body: JSON.stringify({ error: "Invalid AI response format" }),
        };
      }
    }

    if (!parsed.english || !parsed.spanish) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Incomplete AI response" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        english: parsed.english,
        spanish: parsed.spanish,
      }),
    };
  } catch (err) {
    console.error("Content generator error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
