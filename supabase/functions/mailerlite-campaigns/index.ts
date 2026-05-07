import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { type User } from "jsr:@supabase/supabase-js@2";
import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import { getUserSale } from "../_shared/getUserSale.ts";

const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY") ?? "";
const MAILERLITE_API_BASE = "https://connect.mailerlite.com/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function mlHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${MAILERLITE_API_KEY}`,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handler(req: Request, user: User): Promise<Response> {
  const sale = await getUserSale(user);
  if (!sale?.administrator) {
    return createErrorResponse(403, "Forbidden");
  }

  if (req.method === "GET") {
    const res = await fetch(
      `${MAILERLITE_API_BASE}/campaigns?filter[status]=draft`,
      { headers: mlHeaders() },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MailerLite list campaigns ${res.status}: ${text}`);
    }
    const json = await res.json();
    const campaigns = (json.data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id,
      name: c.name,
      subject: (c.emails as Array<{ subject?: string }>)?.[0]?.subject ?? null,
    }));
    return jsonResponse({ data: campaigns });
  }

  if (req.method === "POST") {
    let body: { campaignId?: string };
    try {
      body = await req.json();
    } catch {
      return createErrorResponse(400, "Invalid JSON");
    }
    const { campaignId } = body;
    if (!campaignId) {
      return createErrorResponse(400, "Missing campaignId");
    }
    const res = await fetch(
      `${MAILERLITE_API_BASE}/campaigns/${campaignId}/schedule`,
      {
        method: "POST",
        headers: mlHeaders(),
        body: JSON.stringify({ delivery: "instant" }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MailerLite schedule campaign ${res.status}: ${text}`);
    }
    return jsonResponse({ ok: true });
  }

  return createErrorResponse(405, "Method not allowed");
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return AuthMiddleware(req, (req) =>
    UserMiddleware(req, async (req, user) => {
      try {
        return await handler(req, user!);
      } catch (err) {
        console.error("mailerlite-campaigns error:", err);
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }),
  );
});
