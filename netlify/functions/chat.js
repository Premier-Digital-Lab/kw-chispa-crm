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

  const tools = [
    {
      name: 'create_contact',
      description:
        'Create a new contact in the KW CHISPA CRM. Use this whenever the user wants to add a person, client, or lead to the system.',
      input_schema: {
        type: 'object',
        properties: {
          first_name: { type: 'string', description: 'First name of the contact' },
          last_name: { type: 'string', description: 'Last name of the contact' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number' },
          title: { type: 'string', description: 'Job title' },
          background: { type: 'string', description: 'Notes or background about the contact' },
        },
        required: ['first_name', 'last_name'],
      },
    },
  ];

  const systemPrompt =
    'You are a bilingual (English/Spanish) CRM assistant for KW CHISPA, a Hispanic/Latino real estate agent group. ' +
    'Auto-detect the user language and respond in the same language. ' +
    'You help create contacts, add notes, add tasks, and search contacts. ' +
    'When the user asks to add or create a contact, use the create_contact tool.';

  try {
    const { messages } = JSON.parse(event.body);

    // First call: let Claude decide if it needs to use a tool
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
    console.log('Anthropic first response:', JSON.stringify(firstData));

    // If Claude wants to create a contact, execute it and return a follow-up reply
    if (firstData.stop_reason === 'tool_use') {
      const toolUseBlock = firstData.content.find((b) => b.type === 'tool_use');

      if (toolUseBlock && toolUseBlock.name === 'create_contact') {
        const input = toolUseBlock.input;
        let toolResult;

        if (!userJwt) {
          toolResult = { success: false, error: 'User is not authenticated.' };
        } else if (!supabaseUrl || !supabaseAnonKey) {
          toolResult = { success: false, error: 'Supabase is not configured on the server.' };
        } else {
          // Build the contact row
          const contactPayload = {
            first_name: input.first_name,
            last_name: input.last_name,
            created_at: new Date().toISOString(),
          };
          if (input.email) {
            contactPayload.email_jsonb = [{ email: input.email, type: 'Work' }];
          }
          if (input.phone) {
            contactPayload.phone_jsonb = [{ number: input.phone, type: 'Work' }];
          }
          if (input.title) contactPayload.title = input.title;
          if (input.background) contactPayload.background = input.background;

          // Insert via Supabase REST API using the user's JWT (RLS enforced)
          const insertResp = await fetch(`${supabaseUrl}/rest/v1/contacts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userJwt}`,
              apikey: supabaseAnonKey,
              Prefer: 'return=representation',
            },
            body: JSON.stringify(contactPayload),
          });

          if (insertResp.ok) {
            const inserted = await insertResp.json();
            const contactId = inserted[0]?.id;
            toolResult = { success: true, contact_id: contactId };
          } else {
            const errorText = await insertResp.text();
            console.error('Supabase insert error:', errorText);
            toolResult = { success: false, error: errorText };
          }
        }

        // Second call: send tool result back to Claude for a natural language confirmation
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
