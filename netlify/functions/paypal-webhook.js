exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
  const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
  const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yxebmtukofvfthkzaknc.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (PAYPAL_CLIENT_ID && PAYPAL_SECRET && PAYPAL_WEBHOOK_ID) {
    try {
      const tokenRes = await fetch('https://api.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      const { access_token: accessToken } = await tokenRes.json();

      const verifyRes = await fetch(
        'https://api.paypal.com/v1/notifications/verify-webhook-signature',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth_algo: event.headers['paypal-auth-algo'],
            cert_url: event.headers['paypal-cert-url'],
            transmission_id: event.headers['paypal-transmission-id'],
            transmission_sig: event.headers['paypal-transmission-sig'],
            transmission_time: event.headers['paypal-transmission-time'],
            webhook_id: PAYPAL_WEBHOOK_ID,
            webhook_event: JSON.parse(event.body),
          }),
        },
      );
      const { verification_status } = await verifyRes.json();
      if (verification_status !== 'SUCCESS') {
        console.error('PayPal signature verification failed:', verification_status);
        return { statusCode: 400, body: 'Invalid signature' };
      }
    } catch (err) {
      console.error('PayPal verification error:', err);
      return { statusCode: 500, body: 'Verification error' };
    }
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const eventType = payload.event_type;
  let email;

  if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    email = payload.resource?.subscriber?.email_address;
  } else if (eventType === 'PAYMENT.SALE.COMPLETED') {
    email = payload.resource?.payer?.email_address;
  } else {
    return { statusCode: 200, body: 'Ignored' };
  }

  if (!email || !SUPABASE_SERVICE_KEY) {
    console.error('Missing email or SUPABASE_SERVICE_KEY');
    return { statusCode: 200, body: 'No action taken' };
  }

  const supabaseHeaders = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  const emailFilter = encodeURIComponent(JSON.stringify([{ email }]));
  const searchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/contacts?email_jsonb=cs.${emailFilter}&select=id&limit=1`,
    { headers: supabaseHeaders },
  );

  const contacts = await searchRes.json();
  if (!Array.isArray(contacts) || contacts.length === 0) {
    console.error('No contact found for email:', email);
    return { statusCode: 200, body: 'Contact not found' };
  }

  const contactId = contacts[0].id;
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/contacts?id=eq.${contactId}`,
    {
      method: 'PATCH',
      headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ membership_tier: 'Premier', member_status: 'Active' }),
    },
  );

  if (!updateRes.ok) {
    console.error('Supabase update failed:', await updateRes.text());
    return { statusCode: 500, body: 'Update failed' };
  }

  console.log(`Activated Premier for contact ${contactId} (${email})`);
  return { statusCode: 200, body: 'OK' };
};
