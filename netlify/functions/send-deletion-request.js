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
    return { statusCode: 405, headers: CORS_HEADERS, body: "Method Not Allowed" };
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

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { firstName, lastName, email, id } = body;
  if (!firstName || !lastName || !email || !id) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing required fields" }),
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
