exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ reply: 'Missing ANTHROPIC_API_KEY' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SB_PUBLISHABLE_KEY;

  // Extract user JWT forwarded from the frontend
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const userJwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // ─── System Prompt ────────────────────────────────────────────────────────

  const systemPrompt =
    'You are a bilingual (English/Spanish) CRM assistant for KW CHISPA, a Keller Williams affinity group empowering Hispanic/Latino real estate agents. Auto-detect the user\'s language and respond in the same language.\n\n' +
    'You help manage the KW CHISPA member directory. You can:\n' +
    '- Create new members with their profile information\n' +
    '- Search for existing members by name, city, state, county, language, or Market Center (search only returns Active/approved members)\n\n' +
    'When creating a member, collect as much information as possible. Required fields are: first_name, last_name, cell_number, market_center_name, agent_role, languages_spoken, cities_served, counties_served, states_served, and countries_served. All other fields are optional.\n\n' +
    'KW-specific terms to know:\n' +
    '- "Market Center" = a Keller Williams office location\n' +
    '- "Team Leader" = the manager of a Market Center\n' +
    '- Agent roles: "Solo Agent", "Team Member", or "Team Lead"\n' +
    '- Membership tiers: "Free" or "Premier"\n' +
    '- Member status defaults to "Pending" (admin approves later)\n\n' +
    'For array fields (languages_spoken, cities_served, counties_served, states_served, countries_served), accept comma-separated values from the user and convert them to arrays.\n\n' +
    'Always confirm what you understood before creating a member. Be warm and professional.\n\n' +
    'When searching by county, strip the word \'County\' or \'Condado\' from the search term — the database stores just the county name (e.g. \'Bergen\' not \'Bergen County\'). When searching by state, ALWAYS convert abbreviations to full names before calling search_members — the database stores full state names (e.g. use \'New Jersey\' not \'NJ\', use \'Texas\' not \'TX\'). Never pass a two-letter abbreviation as the state parameter.';

  // ─── Tool Definitions ─────────────────────────────────────────────────────

  const tools = [
    {
      name: 'create_contact',
      description:
        'Create a new member in the KW CHISPA member directory. Use this when the user wants to add a new member or agent to the system.',
      input_schema: {
        type: 'object',
        properties: {
          // Identity
          first_name: { type: 'string', description: 'First name' },
          last_name: { type: 'string', description: 'Last name' },
          gender: { type: 'string', description: 'Gender (e.g. Male, Female, Non-binary)' },
          title: { type: 'string', description: 'Professional title or designation' },
          background: { type: 'string', description: 'Bio or background notes about the member' },
          email: { type: 'string', description: 'Email address' },
          // Contact
          cell_number: { type: 'string', description: 'Cell phone number' },
          // Social
          linkedin_url: { type: 'string', description: 'LinkedIn profile URL' },
          facebook_url: { type: 'string', description: 'Facebook profile URL' },
          instagram_url: { type: 'string', description: 'Instagram profile URL' },
          tiktok_url: { type: 'string', description: 'TikTok profile URL' },
          // KW Info
          market_center_name: { type: 'string', description: 'Name of the Keller Williams Market Center' },
          agent_role: {
            type: 'string',
            enum: ['Solo Agent', 'Team Member', 'Team Lead'],
            description: 'Agent role within KW',
          },
          market_center_team_leader: { type: 'string', description: 'Name of the Market Center Team Leader' },
          market_center_tl_phone: { type: 'string', description: 'Team Leader phone number' },
          market_center_tl_email: { type: 'string', description: 'Team Leader email address' },
          // Market Center Address
          mc_street_number: { type: 'string', description: 'Market Center street number' },
          mc_street_name: { type: 'string', description: 'Market Center street name' },
          mc_suite_unit: { type: 'string', description: 'Market Center suite or unit number' },
          mc_city: { type: 'string', description: 'Market Center city' },
          mc_state: { type: 'string', description: 'Market Center state' },
          mc_zip_code: { type: 'string', description: 'Market Center ZIP code' },
          mc_country: { type: 'string', description: 'Market Center country' },
          // Service Areas (arrays)
          languages_spoken: {
            type: 'array',
            items: { type: 'string' },
            description: 'Languages spoken by the agent (e.g. ["Spanish", "English"])',
          },
          cities_served: {
            type: 'array',
            items: { type: 'string' },
            description: 'Cities where the agent serves clients',
          },
          counties_served: {
            type: 'array',
            items: { type: 'string' },
            description: 'Counties where the agent serves clients',
          },
          states_served: {
            type: 'array',
            items: { type: 'string' },
            description: 'States where the agent serves clients',
          },
          countries_served: {
            type: 'array',
            items: { type: 'string' },
            description: 'Countries where the agent serves clients',
          },
          // Membership
          membership_tier: {
            type: 'string',
            enum: ['Free', 'Premier'],
            description: 'Membership tier (defaults to Free)',
          },
          join_date: { type: 'string', description: 'Date the member joined (YYYY-MM-DD)' },
          member_status: {
            type: 'string',
            enum: ['Active', 'Inactive', 'Pending'],
            description: 'Member status (defaults to Pending)',
          },
          has_newsletter: {
            type: 'boolean',
            description: 'Whether the member wants to receive KW CHISPA emails',
          },
        },
        required: [
          'first_name',
          'last_name',
          'cell_number',
          'market_center_name',
          'agent_role',
          'languages_spoken',
          'cities_served',
          'counties_served',
          'states_served',
          'countries_served',
        ],
      },
    },
    {
      name: 'search_members',
      description:
        'Search the KW CHISPA member directory. Use this when the user wants to find members by name, city, state, county, language spoken, or Market Center. Returns up to 10 matches.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Name or general search term (searches first and last name)',
          },
          city: { type: 'string', description: 'Filter by city served' },
          state: { type: 'string', description: 'Filter by state served' },
          county: { type: 'string', description: 'Filter by county served' },
          language: { type: 'string', description: 'Filter by language spoken' },
          market_center: { type: 'string', description: 'Filter by Market Center name' },
        },
        required: [],
      },
    },
  ];

  // ─── Tool Handlers ────────────────────────────────────────────────────────

  async function handleCreateContact(input) {
    if (!userJwt) {
      return { success: false, error: 'User is not authenticated.' };
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Supabase is not configured on the server.' };
    }

    const payload = {
      first_name: input.first_name,
      last_name: input.last_name,
      first_seen: new Date().toISOString(),
    };

    // Email → stored as JSONB array
    if (input.email) {
      payload.email_jsonb = [{ email: input.email, type: 'Work' }];
    }

    // Plain string fields
    const stringFields = [
      'gender', 'title', 'background', 'cell_number',
      'linkedin_url', 'facebook_url', 'instagram_url', 'tiktok_url',
      'market_center_name', 'agent_role',
      'market_center_team_leader', 'market_center_tl_phone', 'market_center_tl_email',
      'mc_street_number', 'mc_street_name', 'mc_suite_unit',
      'mc_city', 'mc_state', 'mc_zip_code', 'mc_country',
      'membership_tier', 'join_date', 'member_status',
    ];
    for (const field of stringFields) {
      if (input[field] != null) payload[field] = input[field];
    }

    // Boolean fields
    if (input.has_newsletter != null) payload.has_newsletter = input.has_newsletter;

    // Array fields (text[]) — pass directly as JSON arrays
    const arrayFields = [
      'languages_spoken', 'cities_served', 'counties_served',
      'states_served', 'countries_served',
    ];
    for (const field of arrayFields) {
      if (Array.isArray(input[field]) && input[field].length > 0) {
        payload[field] = input[field];
      }
    }

    const resp = await fetch(`${supabaseUrl}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userJwt}`,
        apikey: supabaseAnonKey,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      const inserted = await resp.json();
      return { success: true, contact_id: inserted[0]?.id };
    }
    const errorText = await resp.text();
    console.error('Supabase insert error:', errorText);
    return { success: false, error: errorText };
  }

  const STATE_ABBR = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia', PR: 'Puerto Rico',
  };

  async function handleSearchMembers(input) {
    if (!userJwt) {
      return { success: false, error: 'User is not authenticated.' };
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Supabase is not configured on the server.' };
    }

    // contacts_summary exposes all contacts columns plus email_fts
    const url = new URL(`${supabaseUrl}/rest/v1/contacts_summary`);

    url.searchParams.set(
      'select',
      'id,first_name,last_name,cell_number,market_center_name,agent_role,languages_spoken,cities_served,counties_served,states_served',
    );
    url.searchParams.set('member_status', 'eq.Active');
    url.searchParams.set('limit', '10');

    // Build OR clauses separately so we can combine them safely
    let nameOrClause = null;
    let stateOrClause = null;

    // Name search: OR across first_name and last_name
    if (input.query && input.query.trim()) {
      const q = input.query.trim().replace(/[()]/g, '');
      nameOrClause = `(first_name.ilike.*${q}*,last_name.ilike.*${q}*)`;
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
        url.searchParams.set('states_served', `cs.{"${stateInput}"}`);
      }
    }

    // Combine OR clauses: if both name and state need OR, wrap in an AND
    if (nameOrClause && stateOrClause) {
      url.searchParams.set('and', `(or${nameOrClause},or${stateOrClause})`);
    } else if (nameOrClause) {
      url.searchParams.set('or', nameOrClause);
    } else if (stateOrClause) {
      url.searchParams.set('or', stateOrClause);
    }

    // Array-contains filters (PostgREST cs operator)
    if (input.city) {
      url.searchParams.set('cities_served', `cs.{"${input.city}"}`);
    }
    if (input.county) {
      url.searchParams.set('counties_served', `cs.{"${input.county}"}`);
    }
    if (input.language) {
      url.searchParams.set('languages_spoken', `cs.{"${input.language}"}`);
    }

    // ilike filter for market center name
    if (input.market_center) {
      url.searchParams.set('market_center_name', `ilike.*${input.market_center}*`);
    }

    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${userJwt}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('Supabase search error:', errorText);
      return { success: false, error: errorText };
    }

    const results = await resp.json();

    if (!results.length) {
      return { success: true, count: 0, summary: 'No members found matching your search.' };
    }

    // Format results into a readable summary for Claude to present
    const lines = results.map((r) => {
      const parts = [`• ${r.first_name} ${r.last_name}`];
      if (r.cell_number) parts.push(`Cell: ${r.cell_number}`);
      if (r.market_center_name) parts.push(`MC: ${r.market_center_name}`);
      if (r.agent_role) parts.push(`Role: ${r.agent_role}`);
      if (r.languages_spoken?.length) parts.push(`Languages: ${r.languages_spoken.join(', ')}`);
      if (r.cities_served?.length) parts.push(`Cities: ${r.cities_served.slice(0, 3).join(', ')}`);
      if (r.states_served?.length) parts.push(`States: ${r.states_served.join(', ')}`);
      return parts.join(' | ');
    });

    return {
      success: true,
      count: results.length,
      summary: lines.join('\n'),
    };
  }

  // ─── Request Handler ──────────────────────────────────────────────────────

  try {
    const { messages } = JSON.parse(event.body);

    // First call: let Claude decide if it needs a tool
    const firstResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages,
      }),
    });

    const firstData = await firstResp.json();
    console.log('Anthropic first response stop_reason:', firstData.stop_reason);

    if (firstData.stop_reason === 'tool_use') {
      const toolUseBlock = firstData.content.find((b) => b.type === 'tool_use');

      if (toolUseBlock) {
        let toolResult;

        if (toolUseBlock.name === 'create_contact') {
          toolResult = await handleCreateContact(toolUseBlock.input);
        } else if (toolUseBlock.name === 'search_members') {
          toolResult = await handleSearchMembers(toolUseBlock.input);
        } else {
          toolResult = { success: false, error: `Unknown tool: ${toolUseBlock.name}` };
        }

        console.log('Tool result:', JSON.stringify(toolResult));

        // Second call: send tool result back to Claude for a natural-language reply
        const followUpMessages = [
          ...messages,
          { role: 'assistant', content: firstData.content },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolUseBlock.id,
                content: JSON.stringify(toolResult),
              },
            ],
          },
        ];

        const secondResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            tools,
            messages: followUpMessages,
          }),
        });

        const secondData = await secondResp.json();
        console.log('Anthropic second response:', JSON.stringify(secondData));
        const reply = secondData?.content?.[0]?.text ?? JSON.stringify(secondData);
        return { statusCode: 200, body: JSON.stringify({ reply }) };
      }
    }

    // Regular text response (no tool use)
    const reply = firstData?.content?.[0]?.text ?? JSON.stringify(firstData);
    return { statusCode: 200, body: JSON.stringify({ reply }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ reply: 'Error: ' + err.message }) };
  }
};
