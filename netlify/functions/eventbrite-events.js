const ORGANIZER_ID = "1061498667803";
const CACHE_TTL_MS = 60 * 60 * 1000;

let cache = { data: null, expiresAt: 0 };

exports.handler = async () => {
  const now = Date.now();

  if (cache.data && now < cache.expiresAt) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(cache.data),
    };
  }

  const token = process.env.EVENTBRITE_PRIVATE_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing EVENTBRITE_PRIVATE_TOKEN" }),
    };
  }

  try {
    const url = `https://www.eventbriteapi.com/v3/organizations/${ORGANIZER_ID}/events/?order_by=start_asc&expand=venue&page_size=50`;
    const res = await fetch(
      url,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      throw new Error(`Eventbrite responded with ${res.status}`);
    }

    const { events: rawEvents = [] } = await res.json();

    const now = new Date();
    const events = rawEvents
      .map((e) => ({
        id: e.id,
        name: e.name?.text ?? "",
        description: e.description?.text ?? "",
        start: e.start?.local ?? "",
        end: e.end?.local ?? "",
        url: e.url ?? "",
        venue: e.venue
          ? {
              name: e.venue.name ?? "",
              address: e.venue.address?.localized_address_display ?? "",
            }
          : null,
        logo: e.logo?.original?.url ?? e.logo?.url ?? null,
      }))
      .filter((e) => e.start && new Date(e.start) >= now);

    cache = { data: events, expiresAt: now + CACHE_TTL_MS };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(events),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
