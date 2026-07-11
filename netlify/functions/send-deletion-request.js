const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: "Method Not Allowed",
    };
  }

  const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY;
  const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || "info@kwchispa.com";

  if (!POSTMARK_API_KEY) {
    console.error("POSTMARK_API_KEY is not set");
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server misconfigured" }),
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
    console.error("No Authorization header provided");
    return {
      statusCode: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [
      !supabaseUrl && "VITE_SUPABASE_URL",
      !supabaseAnonKey && "VITE_SUPABASE_ANON_KEY/VITE_SB_PUBLISHABLE_KEY",
    ].filter(Boolean);
    console.error("Missing Supabase env vars:", missing.join(", "));
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
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
      const text = await verifyResp.text();
      console.error("Supabase auth check failed:", verifyResp.status, text);
      return {
        statusCode: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }
    const verifiedUser = await verifyResp.json();
    if (!verifiedUser?.id) {
      console.error("Verified user response missing id");
      return {
        statusCode: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }
  } catch (e) {
    console.error("Supabase auth check threw:", e.message);
    return {
      statusCode: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    console.error("Invalid JSON in request body");
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { firstName, lastName, email, id } = body;
  if (!firstName || !lastName || !email || !id) {
    console.error("Missing required fields");
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  const MAX_FIELD_LENGTH = 200;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    String(firstName).length > MAX_FIELD_LENGTH ||
    String(lastName).length > MAX_FIELD_LENGTH ||
    String(email).length > MAX_FIELD_LENGTH ||
    String(id).length > MAX_FIELD_LENGTH
  ) {
    console.error("Field too long");
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Field too long" }),
    };
  }

  if (!EMAIL_REGEX.test(email)) {
    console.error("Invalid email format");
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid email format" }),
    };
  }

  const fullName = `${firstName} ${lastName}`;
  const subject = `Data Deletion Request — ${fullName}`;
  const textBody =
    `${fullName} (${email}) has submitted a request to delete their KW CHISPA Central account and personal data. ` +
    `Member ID: ${id}. Please process this request within 30 days per the KW CHISPA Privacy Policy.`;

  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_API_KEY,
      },
      body: JSON.stringify({
        From: FROM_EMAIL,
        To: "info@kwchispa.com",
        Subject: subject,
        TextBody: textBody,
        MessageStream: "outbound",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Postmark error:", res.status, text);
      return {
        statusCode: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to send email" }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("send-deletion-request error:", err);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
