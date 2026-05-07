import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("MAILERLITE_WEBHOOK_SECRET") ?? "";

const MAILERLITE_API_BASE = "https://connect.mailerlite.com/api";

const GROUP_FREE = "186777028151739915";
const GROUP_PREMIER = "186777047859725916";
const GROUP_DOWNGRADED = "186777062269256957";

type EmailEntry = { email: string };

type ContactRecord = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email_jsonb: EmailEntry[] | null;
  member_status: string | null;
  membership_tier: string | null;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: ContactRecord | null;
  old_record: ContactRecord | null;
};

function getPrimaryEmail(contact: ContactRecord | null): string | null {
  return contact?.email_jsonb?.[0]?.email ?? null;
}

function mlHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
  };
}

function groupForTier(tier: string | null): string | null {
  if (tier === "Premier") return GROUP_PREMIER;
  if (tier === "Free") return GROUP_FREE;
  return null;
}

async function upsertSubscriber(
  email: string,
  firstName: string,
  lastName: string,
  groupId?: string | null,
): Promise<string | null> {
  const body: Record<string, unknown> = {
    email,
    fields: { name: firstName, last_name: lastName },
  };
  if (groupId) body.groups = [groupId];
  const res = await fetch(`${MAILERLITE_API_BASE}/subscribers`, {
    method: "POST",
    headers: mlHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MailerLite upsert subscriber ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json?.data?.id ?? null;
}

async function findSubscriberByEmail(email: string): Promise<string | null> {
  const res = await fetch(
    `${MAILERLITE_API_BASE}/subscribers?filter[email]=${encodeURIComponent(email)}`,
    { headers: mlHeaders() },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data?.[0]?.id ?? null;
}

async function addToGroup(subscriberId: string, groupId: string): Promise<void> {
  const res = await fetch(
    `${MAILERLITE_API_BASE}/subscribers/${subscriberId}/groups/${groupId}`,
    { method: "PUT", headers: mlHeaders() },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MailerLite add to group ${res.status}: ${text}`);
  }
}

async function removeFromGroup(subscriberId: string, groupId: string): Promise<void> {
  const res = await fetch(
    `${MAILERLITE_API_BASE}/subscribers/${subscriberId}/groups/${groupId}`,
    { method: "DELETE", headers: mlHeaders() },
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`MailerLite remove from group ${res.status}: ${text}`);
  }
}

async function deleteSubscriber(subscriberId: string): Promise<void> {
  const res = await fetch(
    `${MAILERLITE_API_BASE}/subscribers/${subscriberId}`,
    { method: "DELETE", headers: mlHeaders() },
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`MailerLite delete subscriber ${res.status}: ${text}`);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const incomingSecret = req.headers.get("x-webhook-secret");
  if (!WEBHOOK_SECRET || incomingSecret !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { type, record, old_record } = payload;

    if (type === "DELETE") {
      const email = getPrimaryEmail(old_record);
      if (email) {
        const id = await findSubscriberByEmail(email);
        if (id) await deleteSubscriber(id);
      }
      return ok();
    }

    const newStatus = record?.member_status;
    const oldStatus = old_record?.member_status;
    const newTier = record?.membership_tier;
    const oldTier = old_record?.membership_tier;
    const email = getPrimaryEmail(record);

    if (!email) return ok("no email");

    if (newStatus === "Inactive" && oldStatus !== "Inactive") {
      const id = await findSubscriberByEmail(email);
      if (id) await deleteSubscriber(id);
      return ok();
    }

    if (newStatus === "Active" && oldStatus !== "Active") {
      await upsertSubscriber(
        email,
        record?.first_name ?? "",
        record?.last_name ?? "",
        groupForTier(newTier),
      );
      return ok();
    }

    if (newStatus === "Active" && newTier !== oldTier) {
      const id = await findSubscriberByEmail(email);
      if (id) {
        if (oldTier === "Free" && newTier === "Premier") {
          await removeFromGroup(id, GROUP_FREE);
          await addToGroup(id, GROUP_PREMIER);
        } else if (oldTier === "Premier" && newTier === "Free") {
          await removeFromGroup(id, GROUP_PREMIER);
          await addToGroup(id, GROUP_DOWNGRADED);
        }
      }
      return ok();
    }

    return ok("no action needed");
  } catch (err) {
    console.error("mailerlite-sync error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function ok(reason?: string): Response {
  return new Response(
    JSON.stringify({ ok: true, ...(reason ? { skipped: reason } : {}) }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
