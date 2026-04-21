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
            <td style="background-color:#1a1a1a;background:linear-gradient(135deg,#1a1a1a 0%,#2d0a0a 40%,#CC0000 100%);border-radius:8px 8px 0 0;padding:32px 24px;text-align:center;">
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

function buildWelcomeApproved(firstName: string): {
  subject: string;
  html: string;
} {
  const crmUrl = "https://kw-chispa-crm.netlify.app";
  const facebookUrl = "https://www.facebook.com/groups/kwchispa";

  return {
    subject:
      "Your KW CHISPA Account Has Been Approved! / ¡Tu cuenta de KW CHISPA ha sido aprobada!",
    html: buildHtml({
      preheader:
        "Your KW CHISPA Central account is now active. Welcome to the community!",
      englishBody: `
        <p style="margin:0 0 12px;">Welcome to KW CHISPA Central, <strong>${firstName}</strong>!</p>
        <p style="margin:0 0 12px;">Your account has been approved! You now have access to the KW CHISPA member directory.</p>
        <p style="margin:0 0 8px;">Here's what you can do:</p>
        <ul style="margin:0 0 16px;padding-left:20px;">
          <li style="margin-bottom:6px;"><strong>Find an Agent</strong> — Search for referral partners by city, state, country, language or Market Center</li>
          <li style="margin-bottom:6px;"><strong>Interactive Map</strong> — See KW CHISPA members across the world</li>
          <li style="margin-bottom:6px;"><strong>Your Profile</strong> — Keep your info updated so other agents can find you</li>
          <li style="margin-bottom:6px;"><strong>AI Chat Assistant</strong> — Search the directory using natural language in English or Spanish</li>
        </ul>
        <p style="margin:0 0 16px;">Your request to join the KW CHISPA Facebook group will also be approved. This is where we network and brainstorm daily. Come join us in the <a href="${facebookUrl}" style="color:#CC0000;text-decoration:none;">KW CHISPA Facebook group</a>!</p>
        <p style="margin:0 0 16px;">Questions or comments? Please drop us a note at <a href="mailto:info@kwchispa.com" style="color:#CC0000;text-decoration:none;">info@kwchispa.com</a> and someone will get back to you within the day. We look forward to being in business with you.</p>
        <p style="margin:0 0 24px;"><em>With Gratitude,</em><br/><em>Your KW CHISPA Leadership Council</em></p>
        <p style="margin:0;">
          <a href="${crmUrl}" style="display:inline-block;background-color:#CC0000;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px;font-size:14px;">
            Sign In to KW CHISPA Central &rarr;
          </a>
        </p>
      `,
      spanishBody: `
        <p style="margin:0 0 12px;">¡Bienvenido/a a KW CHISPA Central, <strong>${firstName}</strong>!</p>
        <p style="margin:0 0 12px;">Tu cuenta ha sido aprobada. Ya tienes acceso al directorio de miembros de KW CHISPA.</p>
        <p style="margin:0 0 8px;">Lo que puedes hacer:</p>
        <ul style="margin:0 0 16px;padding-left:20px;">
          <li style="margin-bottom:6px;"><strong>Buscar un Agente</strong> — Busca socios de referencia por ciudad, estado, idioma o Market Center</li>
          <li style="margin-bottom:6px;"><strong>Mapa Interactivo</strong> — Ve a los miembros de KW CHISPA en todo el país</li>
          <li style="margin-bottom:6px;"><strong>Tu Perfil</strong> — Mantén tu información actualizada para que otros agentes te encuentren</li>
          <li style="margin-bottom:6px;"><strong>Asistente de Chat IA</strong> — Busca en el directorio usando lenguaje natural en inglés o español</li>
        </ul>
        <p style="margin:0 0 16px;">Tu solicitud para unirte al grupo de Facebook de KW CHISPA también será aprobada. Allí nos conectamos y compartimos ideas a diario. ¡Únete a nosotras en el <a href="${facebookUrl}" style="color:#CC0000;text-decoration:none;">grupo de Facebook KW CHISPA</a>!</p>
        <p style="margin:0 0 16px;">¿Preguntas o comentarios? Por favor, envíenos un mensaje a <a href="mailto:info@kwchispa.com" style="color:#CC0000;text-decoration:none;">info@kwchispa.com</a> y alguien se pondrá en contacto con usted en el plazo de un día. Esperamos hacer negocios con usted.</p>
        <p style="margin:0 0 24px;"><em>Con gratitud,</em><br/><em>Su Consejo de Liderazgo de KW CHISPA</em></p>
        <p style="margin:0;">
          <a href="${crmUrl}" style="display:inline-block;background-color:#CC0000;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px;font-size:14px;">
            Iniciar sesión en KW CHISPA Central &rarr;
          </a>
        </p>
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

function buildPasswordChanged(firstName: string): {
  subject: string;
  html: string;
} {
  return {
    subject:
      "Your KW CHISPA Password Has Been Changed / Tu contraseña de KW CHISPA ha sido cambiada",
    html: buildHtml({
      preheader:
        "Your KW CHISPA Central password was recently changed.",
      englishBody: `
        <p style="margin:0 0 12px;">Hi <strong>${firstName}</strong>,</p>
        <p style="margin:0 0 12px;">Your KW CHISPA Central password has been successfully changed.</p>
        <p style="margin:0 0 12px;">If you made this change, no further action is needed.</p>
        <p style="margin:0 0 24px;">If you did <strong>NOT</strong> make this change, please contact us immediately at <a href="mailto:info@kwchispa.com" style="color:#CC0000;text-decoration:none;">info@kwchispa.com</a> to secure your account.</p>
        <p style="margin:0;"><em>With Gratitude,</em><br/><em>Your KW CHISPA Leadership Council</em></p>
      `,
      spanishBody: `
        <p style="margin:0 0 12px;">Hola <strong>${firstName}</strong>,</p>
        <p style="margin:0 0 12px;">Tu contraseña de KW CHISPA Central ha sido cambiada exitosamente.</p>
        <p style="margin:0 0 12px;">Si realizaste este cambio, no necesitas hacer nada más.</p>
        <p style="margin:0 0 24px;">Si <strong>NO</strong> realizaste este cambio, por favor contáctanos de inmediato a <a href="mailto:info@kwchispa.com" style="color:#CC0000;text-decoration:none;">info@kwchispa.com</a> para proteger tu cuenta.</p>
        <p style="margin:0;"><em>Con gratitud,</em><br/><em>Su Consejo de Liderazgo de KW CHISPA</em></p>
      `,
    }),
  };
}

function buildAccountDisabled(firstName: string): {
  subject: string;
  html: string;
} {
  return {
    subject:
      "KW CHISPA Account Update / Actualización de cuenta KW CHISPA",
    html: buildHtml({
      preheader:
        "An update has been made to your KW CHISPA Central account.",
      englishBody: `
        <p style="margin:0 0 12px;">Hi <strong>${firstName}</strong>,</p>
        <p style="margin:0 0 12px;">Your KW CHISPA Central account has been deactivated by an administrator.</p>
        <p style="margin:0 0 24px;">If you believe this was done in error, please contact us at <a href="mailto:info@kwchispa.com" style="color:#CC0000;text-decoration:none;">info@kwchispa.com</a> and we'll be happy to assist you.</p>
        <p style="margin:0;"><em>With Gratitude,</em><br/><em>Your KW CHISPA Leadership Council</em></p>
      `,
      spanishBody: `
        <p style="margin:0 0 12px;">Hola <strong>${firstName}</strong>,</p>
        <p style="margin:0 0 12px;">Tu cuenta de KW CHISPA Central ha sido desactivada por un administrador.</p>
        <p style="margin:0 0 24px;">Si crees que esto fue un error, por favor contáctanos a <a href="mailto:info@kwchispa.com" style="color:#CC0000;text-decoration:none;">info@kwchispa.com</a> y con gusto te ayudaremos.</p>
        <p style="margin:0;"><em>Con gratitud,</em><br/><em>Su Consejo de Liderazgo de KW CHISPA</em></p>
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
    } else if (type === "welcome_approved") {
      const { subject, html } = buildWelcomeApproved(data.first_name ?? "");
      await sendEmail(to, subject, html);
    } else if (type === "password_changed") {
      const { subject, html } = buildPasswordChanged(data.first_name ?? "");
      await sendEmail(to, subject, html);
    } else if (type === "account_disabled") {
      const { subject, html } = buildAccountDisabled(data.first_name ?? "");
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
