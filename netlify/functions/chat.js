const fetch = global.fetch || require('node-fetch');

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { messages, contactsContext } = body;

    if (!Array.isArray(messages)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid `messages` array in request body' }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY environment variable' }) };
    }

    const systemPrompt = `You are a bilingual (English/Spanish) CRM assistant for KW CHISPA, a Hispanic/Latino real estate agent group. Auto-detect the user's language and respond in the same language. You help create contacts, add notes, add tasks, and search contacts. The user's Supabase contacts data will be provided as context.`;

    // Build a single prompt combining system, contacts context, and conversation messages
    let prompt = `System: ${systemPrompt}\n\n`;
    prompt += `ContactsContext:\n${contactsContext || ''}\n\n`;
    prompt += `Conversation:\n`;

    for (const m of messages) {
      const role = (m.role || 'user').toLowerCase();
      const label = role === 'assistant' ? 'Assistant' : role === 'system' ? 'System' : 'Human';
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '');
      prompt += `${label}: ${content}\n\n`;
    }

    // Invite the model to respond
    prompt += `Assistant:`;

    const resp = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        prompt,
        max_tokens_to_sample: 1000,
        temperature: 0.2,
      }),
    });

    const data = await resp.json();

    // Try several possible response shapes used by Anthropic SDKs/APIs
    let assistantReply = null;
    if (typeof data === 'string') assistantReply = data;
    else if (data.completion) assistantReply = data.completion;
    else if (data.completion?.text) assistantReply = data.completion.text;
    else if (data.output && Array.isArray(data.output) && data.output[0]?.content) assistantReply = data.output[0].content[0]?.text || data.output[0].content[0]?.text;
    else if (data?.choices && data.choices[0]) assistantReply = data.choices[0].text || data.choices[0].message?.content;
    else assistantReply = JSON.stringify(data);

    if (typeof assistantReply === 'object') assistantReply = JSON.stringify(assistantReply);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: (assistantReply || '').trim() }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
