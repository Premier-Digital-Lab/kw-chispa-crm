exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Missing ANTHROPIC_API_KEY" }),
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
    return { statusCode: 401, body: JSON.stringify({ reply: "Unauthorized" }) };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        reply: "Supabase is not configured on the server.",
      }),
    };
  }

  // Verify the JWT with Supabase's auth endpoint — never trust a locally decoded token
  let authUserId;
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
        body: JSON.stringify({ reply: "Unauthorized" }),
      };
    }
    const verifiedUser = await verifyResp.json();
    authUserId = verifiedUser?.id;
    if (!authUserId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ reply: "Unauthorized" }),
      };
    }
  } catch (e) {
    return { statusCode: 401, body: JSON.stringify({ reply: "Unauthorized" }) };
  }

  // Look up membership tier for the authenticated user
  let membershipTier = "Free";
  try {
    let salesId = null;
    let tierData = null;

    // Step 1: resolve auth UUID → numeric sales id
    const salesResp = await fetch(
      `${process.env.VITE_SUPABASE_URL}/rest/v1/sales?select=id&user_id=eq.${authUserId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_KEY,
        },
      },
    );
    if (salesResp.ok) {
      const salesData = await salesResp.json();
      salesId = salesData?.[0]?.id ?? null;
    }

    // Step 2: look up membership_tier by numeric sales id
    if (salesId !== null) {
      const tierResp = await fetch(
        `${process.env.VITE_SUPABASE_URL}/rest/v1/contacts?select=membership_tier&sales_id=eq.${salesId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            apikey: process.env.SUPABASE_SERVICE_KEY,
          },
        },
      );
      if (tierResp.ok) {
        tierData = await tierResp.json();
        if (tierData?.some((r) => r.membership_tier === "Premier")) {
          membershipTier = "Premier";
        } else if (tierData?.[0]?.membership_tier) {
          membershipTier = tierData[0].membership_tier;
        }
      }
    }
    console.log("[MemberTier Debug]", {
      supabaseUrlDefined: !!process.env.VITE_SUPABASE_URL,
      supabaseServiceKeyDefined: !!process.env.SUPABASE_SERVICE_KEY,
      authUserId,
      salesId,
      tierData,
      membershipTier,
    });
  } catch (e) {
    console.warn("Could not look up membership tier:", e.message);
  }

  // ─── System Prompt ────────────────────────────────────────────────────────

  const systemPrompt = `You are a bilingual (English/Spanish) CRM assistant for KW CHISPA, a Keller Williams affinity group empowering Hispanic/Latino real estate agents. Auto-detect the user's language and respond in the same language.

The member you are currently helping has a membership tier of: ${membershipTier}

You can help members in two ways:
1. Search the KW CHISPA member directory
2. Answer questions about how the KW CHISPA platform works

─── PLATFORM HELP ───

If a member asks how to do something on the platform, here is what you know:

PROFILE:
- Members can update their profile by clicking on the "Members" tab in the main navigation.
- From there they can update their photo, contact info, languages spoken, cities/counties/states served, Market Center info, and social media links.
- To update their name or avatar they can click their name or avatar in the top right corner.
- Profile changes are saved with the Save button.

FIND AN AGENT:
- Members can find other KW CHISPA members using the "Find an Agent" page in the main navigation.
- They can search by name, city, state, county, language spoken, or Market Center.
- Results show on an interactive map as well as a list.

EVENTS:
- Members can view upcoming KW CHISPA events on the Events page in the main navigation.
- Events are pulled live from Eventbrite plus recurring community events are always shown.

CHANGE PASSWORD:
- Members can change their password by clicking their name or avatar in the top right corner.
- Then go to Profile and click "Change Password."
- They will receive an email with instructions to set a new password.

PREMIER RESOURCES (Premier members only):
- Premier members have access to a Premier Resources page with exclusive content and tools for KW CHISPA agents.
- If this member is Free tier, tell them: "Premier Resources is an exclusive section available to Premier members. It includes tools and resources to help grow your real estate business. To access it, you would need to upgrade to Premier membership."

SOCIAL MEDIA CONTENT GENERATOR (Premier members only):
- Premier members have access to an AI-powered Social Media Content Generator that creates images and videos for their real estate business.
- If this member is Free tier, tell them: "The Social Media Content Generator is an AI tool available to Premier members that creates professional social media content for your real estate business — images and videos you can post right away. To access it, you would need to upgrade to Premier membership."

UPGRADING TO PREMIER:
- Members can upgrade to Premier by visiting the Premier Resources page and clicking the upgrade button.

─── MEMBER SEARCH ───

You can search for existing members by name, city, state, county, language, or Market Center. Search only returns Active/approved members.

When searching by county, strip the word "County" or "Condado" — the database stores just the county name (e.g. "Bergen" not "Bergen County"). When searching by state, ALWAYS convert abbreviations to full names — the database stores full state names (e.g. "New Jersey" not "NJ"). Never pass a two-letter abbreviation as the state parameter.

─── BOUNDARIES ───

If anyone asks about adding, creating, or managing members, let them know you can only search the directory and they should contact a KW CHISPA admin.

If anyone asks about adding or managing events, respond with: "I'm not able to help with events. Please contact a KW CHISPA admin for assistance." (In Spanish: "No puedo ayudar con eventos. Por favor contacta a un administrador de KW CHISPA.")

─── KW TERMS ───
- "Market Center" = a Keller Williams office location
- "Team Leader" = the manager of a Market Center
- Agent roles: "Solo Agent", "Team Member", or "Team Lead"
- Membership tiers: "Free" or "Premier"

Be warm, helpful, and professional.`;

  // ─── Tool Definitions ─────────────────────────────────────────────────────

  const tools = [
    {
      name: "search_members",
      description:
        "Search the KW CHISPA member directory. Use this when the user wants to find members by name, city, state, county, language spoken, or Market Center. Returns up to 10 matches.",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Name or general search term (searches first and last name)",
          },
          city: { type: "string", description: "Filter by city served" },
          state: { type: "string", description: "Filter by state served" },
          county: { type: "string", description: "Filter by county served" },
          language: {
            type: "string",
            description: "Filter by language spoken",
          },
          market_center: {
            type: "string",
            description: "Filter by Market Center name",
          },
        },
        required: [],
      },
    },
  ];

  // ─── Tool Handlers ────────────────────────────────────────────────────────

  const STATE_ABBR = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "District of Columbia",
    PR: "Puerto Rico",
  };

  async function handleSearchMembers(input) {
    if (!userJwt) {
      return { success: false, error: "User is not authenticated." };
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        error: "Supabase is not configured on the server.",
      };
    }

    // contacts_summary exposes all contacts columns plus email_fts
    const url = new URL(`${supabaseUrl}/rest/v1/contacts_summary`);

    url.searchParams.set(
      "select",
      "id,first_name,last_name,cell_number,market_center_name,agent_role,languages_spoken,cities_served,counties_served,states_served",
    );
    url.searchParams.set("member_status", "eq.Active");
    url.searchParams.set("limit", "10");

    // Build OR clauses separately so we can combine them safely
    let nameOrClause = null;
    let stateOrClause = null;

    // Name search: split into words so "Carlos Ruiz" matches first OR last name for each word
    if (input.query && input.query.trim()) {
      const words = input.query
        .trim()
        .replace(/[()]/g, "")
        .split(/\s+/)
        .filter(Boolean);
      const clauses = words.flatMap((w) => [
        `first_name.ilike.*${w}*`,
        `last_name.ilike.*${w}*`,
      ]);
      nameOrClause = `(${clauses.join(",")})`;
    }

    // State search: OR across abbreviation and full name to handle both storage formats
    if (input.state) {
      const stateInput = input.state.trim();
      const fullName = STATE_ABBR[stateInput.toUpperCase()];
      const abbr = !fullName
        ? Object.keys(STATE_ABBR).find(
            (k) => STATE_ABBR[k].toLowerCase() === stateInput.toLowerCase(),
          )
        : null;

      if (fullName) {
        // User typed an abbreviation — search both
        stateOrClause = `(states_served.cs.{"${stateInput}"},states_served.cs.{"${fullName}"})`;
      } else if (abbr) {
        // User typed a full name — search both
        stateOrClause = `(states_served.cs.{"${stateInput}"},states_served.cs.{"${abbr}"})`;
      } else {
        // Unknown value — search as-is
        url.searchParams.set("states_served", `cs.{"${stateInput}"}`);
      }
    }

    // Combine OR clauses: if both name and state need OR, wrap in an AND
    if (nameOrClause && stateOrClause) {
      url.searchParams.set("and", `(or${nameOrClause},or${stateOrClause})`);
    } else if (nameOrClause) {
      url.searchParams.set("or", nameOrClause);
    } else if (stateOrClause) {
      url.searchParams.set("or", stateOrClause);
    }

    // Array-contains filters (PostgREST cs operator)
    if (input.city) {
      url.searchParams.set("cities_served", `cs.{"${input.city}"}`);
    }
    if (input.county) {
      url.searchParams.set("counties_served", `cs.{"${input.county}"}`);
    }
    if (input.language) {
      url.searchParams.set("languages_spoken", `cs.{"${input.language}"}`);
    }

    // ilike filter for market center name
    if (input.market_center) {
      url.searchParams.set(
        "market_center_name",
        `ilike.*${input.market_center}*`,
      );
    }

    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${userJwt}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("Supabase search error:", errorText);
      return { success: false, error: errorText };
    }

    const results = await resp.json();

    if (!results.length) {
      return {
        success: true,
        count: 0,
        summary: "No members found matching your search.",
      };
    }

    // Format results into a readable summary for Claude to present
    const lines = results.map((r) => {
      const parts = [`• ${r.first_name} ${r.last_name}`];
      if (r.cell_number) parts.push(`Cell: ${r.cell_number}`);
      if (r.market_center_name) parts.push(`MC: ${r.market_center_name}`);
      if (r.agent_role) parts.push(`Role: ${r.agent_role}`);
      if (r.languages_spoken?.length)
        parts.push(`Languages: ${r.languages_spoken.join(", ")}`);
      if (r.cities_served?.length)
        parts.push(`Cities: ${r.cities_served.slice(0, 3).join(", ")}`);
      if (r.states_served?.length)
        parts.push(`States: ${r.states_served.join(", ")}`);
      return parts.join(" | ");
    });

    return {
      success: true,
      count: results.length,
      summary: lines.join("\n"),
    };
  }

  // ─── Request Handler ──────────────────────────────────────────────────────

  try {
    const { messages } = JSON.parse(event.body);

    // First call: let Claude decide if it needs a tool
    const firstResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages,
      }),
    });

    const firstData = await firstResp.json();
    console.log("Anthropic first response stop_reason:", firstData.stop_reason);

    if (firstData.stop_reason === "tool_use") {
      const toolUseBlocks = firstData.content.filter(
        (b) => b.type === "tool_use",
      );

      if (toolUseBlocks.length > 0) {
        // Execute all tool calls in parallel
        const toolResults = await Promise.all(
          toolUseBlocks.map(async (toolUseBlock) => {
            let result;
            if (toolUseBlock.name === "search_members") {
              result = await handleSearchMembers(toolUseBlock.input);
            } else {
              result = {
                success: false,
                error: `Unknown tool: ${toolUseBlock.name}`,
              };
            }
            console.log(
              `Tool result [${toolUseBlock.name}]:`,
              JSON.stringify(result),
            );
            return {
              tool_use_id: toolUseBlock.id,
              content: JSON.stringify(result),
            };
          }),
        );

        // Second call: send all tool results back to Claude for a natural-language reply
        const followUpMessages = [
          ...messages,
          { role: "assistant", content: firstData.content },
          {
            role: "user",
            content: toolResults.map((r) => ({
              type: "tool_result",
              tool_use_id: r.tool_use_id,
              content: r.content,
            })),
          },
        ];

        const secondResp = await fetch(
          "https://api.anthropic.com/v1/messages",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-5",
              max_tokens: 1024,
              system: systemPrompt,
              tools,
              messages: followUpMessages,
            }),
          },
        );

        const secondData = await secondResp.json();
        console.log("Anthropic second response:", JSON.stringify(secondData));
        const textBlock = secondData?.content?.find((b) => b.type === "text");
        const reply =
          textBlock?.text ??
          secondData?.content?.[0]?.text ??
          JSON.stringify(secondData);
        return { statusCode: 200, body: JSON.stringify({ reply }) };
      }
    }

    // Regular text response (no tool use)
    const reply = firstData?.content?.[0]?.text ?? JSON.stringify(firstData);
    return { statusCode: 200, body: JSON.stringify({ reply }) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Error: " + err.message }),
    };
  }
};
