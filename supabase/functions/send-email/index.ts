import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";

const POSTMARK_API_TOKEN = Deno.env.get("POSTMARK_API_TOKEN") ?? "";
const WEBHOOK_SECRET = Deno.env.get("SEND_EMAIL_WEBHOOK_SECRET") ?? "";
const FROM_EMAIL = "info@kwchispa.com";
const LOGO_URL = "https://kw-chispa-crm.netlify.app/logo-white.png";

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHtml(params: {
  preheader: string;
  englishBody: string;
  spanishBody: string;
}): string {
  const { preheader, englishBody, spanishBody } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KW CHISPA</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:24px 16px;">

        <!-- Email card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d0a0a 40%,#CC0000 100%);border-radius:8px 8px 0 0;padding:32px 24px;text-align:center;">
              <img src="${LOGO_URL}" alt="KW CHISPA" width="200" style="display:inline-block;max-width:200px;height:auto;" />
            </td>
          </tr>

          <!-- Red accent bar -->
          <tr>
            <td style="background-color:#CC0000;height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 32px 24px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- English section -->
                <tr>
                  <td style="color:#1a1a1a;font-size:15px;line-height:1.6;">
                    ${englishBody}
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding:24px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-top:1px solid #e0e0e0;font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Spanish section -->
                <tr>
                  <td style="color:#1a1a1a;font-size:15px;line-height:1.6;">
                    ${spanishBody}
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#1a1a1a;border-radius:0 0 8px 8px;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#888888;font-size:12px;line-height:1.6;">
                &copy; 2026 KW CHISPA &middot; Coalition of Hispanics for Progressive Action<br/>
                <a href="https://kwchispa.com" style="color:#CC0000;text-decoration:none;">kwchispa.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Email builders ───────────────────────────────────────────────────────────

function buildSignupConfirmation(firstName: string): {
  subject: string;
  html: string;
} {
  return {
    subject:
      "Welcome to KW CHISPA Central! / ¡Bienvenido/a a KW CHISPA Central!",
    html: buildHtml({
      preheader:
        "Your KW CHISPA application has been received and is pending review.",
      englishBody: `
        <p style="margin:0 0 12px;">Hi <strong>${firstName}</strong>,</p>
        <p style="margin:0 0 12px;">Thank you for signing up for <strong>KW CHISPA Central</strong>.</p>
        <p style="margin:0 0 12px;">Your application has been received and is pending review by our admin team. We'll notify you by email once your account has been approved.</p>
        <p style="margin:0;">Thank you for your patience!</p>
      `,
      spanishBody: `
        <p style="margin:0 0 12px;">Hola <strong>${firstName}</strong>,</p>
        <p style="margin:0 0 12px;">Gracias por registrarte en <strong>KW CHISPA Central</strong>.</p>
        <p style="margin:0 0 12px;">Tu solicitud ha sido recibida y está pendiente de revisión por parte de nuestro equipo de administración. Te notificaremos por correo electrónico una vez que tu cuenta haya sido aprobada.</p>
        <p style="margin:0;">¡Gracias por tu paciencia!</p>
      `,
    }),
  };
}

function buildAdminNotification(data: {
  firstName: string;
  lastName: string;
  email: string;
  cellNumber: string;
  marketCenterName: string;
  agentRole: string;
}): { subject: string; html: string } {
  const { firstName, lastName, email, cellNumber, marketCenterName, agentRole } = data;
  const crmUrl = "https://kw-chispa-crm.netlify.app";

  const rows = [
    ["Name", `${firstName} ${lastName}`],
    ["Email", email],
    ["Cell", cellNumber || "—"],
    ["Market Center", marketCenterName || "—"],
    ["Agent Role", agentRole || "—"],
  ]
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:6px 12px 6px 0;color:#555555;font-size:14px;white-space:nowrap;vertical-align:top;">
            <strong>${label}:</strong>
          </td>
          <td style="padding:6px 0;color:#1a1a1a;font-size:14px;vertical-align:top;">${value}</td>
        </tr>`,
    )
    .join("");

  return {
    subject: `New KW CHISPA Member Signup: ${firstName} ${lastName}`,
    html: buildHtml({
      preheader: `${firstName} ${lastName} signed up and needs approval.`,
      englishBody: `
        <p style="margin:0 0 16px;font-size:16px;"><strong>A new member has signed up and needs approval.</strong></p>
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">${rows}</table>
        <p style="margin:0;">
          <a href="${crmUrl}" style="display:inline-block;background-color:#CC0000;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px;font-size:14px;">
            Review in CRM &rarr;
          </a>
        </p>
      `,
      spanishBody: `
        <p style="margin:0 0 12px;color:#555555;font-size:13px;"><em>Un nuevo miembro se ha registrado y necesita aprobación. Ver detalles arriba.</em></p>
      `,
    }),
  };
}

// ─── Postmark sender ──────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": POSTMARK_API_TOKEN,
    },
    body: JSON.stringify({
      From: FROM_EMAIL,
      To: to,
      Subject: subject,
      HtmlBody: html,
      MessageStream: "outbound",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Postmark error ${res.status}: ${text}`);
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Verify webhook secret
  const incomingSecret = req.headers.get("x-webhook-secret");
  if (!WEBHOOK_SECRET || incomingSecret !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    type: string;
    to: string;
    data: Record<string, string>;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { type, to, data } = body;

  try {
    if (type === "signup_confirmation") {
      const { subject, html } = buildSignupConfirmation(data.first_name ?? "");
      await sendEmail(to, subject, html);
    } else if (type === "signup_admin_notification") {
      const { subject, html } = buildAdminNotification({
        firstName: data.first_name ?? "",
        lastName: data.last_name ?? "",
        email: data.email ?? "",
        cellNumber: data.cell_number ?? "",
        marketCenterName: data.market_center_name ?? "",
        agentRole: data.agent_role ?? "",
      });
      await sendEmail(to, subject, html);
    } else {
      return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
