exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ reply: 'Missing ANTHROPIC_API_KEY' }) };
  }
  try {
    const { messages } = JSON.parse(event.body);
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: 'You are a bilingual (English/Spanish) CRM assistant for KW CHISPA, a Hispanic/Latino real estate agent group. Auto-detect the user language and respond in the same language. You help create contacts, add notes, add tasks, and search contacts.',
        messages
      })
    });
    const data = await resp.json();
    console.log('Anthropic response:', JSON.stringify(data));
    const reply = data?.content?.[0]?.text ?? JSON.stringify(data);
    return { statusCode: 200, body: JSON.stringify({ reply }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ reply: 'Error: ' + err.message }) };
  }
};
