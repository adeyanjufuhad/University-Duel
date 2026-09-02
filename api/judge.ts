export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, correctAnswer, transcribedAnswer } = req.body || {};
  const apiKey = process.env.ANTHROPIC_API_KEY || '';

  if (apiKey) {
    try {
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `You are judging a competitive quiz answer. Be flexible — accept synonyms, partial answers, numbers written as words, and reasonable approximations.

Question: "${question}"
Correct answer: "${correctAnswer}"
Student said: "${transcribedAnswer}"

Reply with ONLY valid JSON in this exact shape, nothing else:
{"correct": true, "reason": "one short sentence"}
or
{"correct": false, "reason": "one short sentence"}`
            }
          ]
        })
      });

      if (anthropicResponse.ok) {
        const data = await anthropicResponse.json();
        const text = data.content?.[0]?.text ?? '';
        const match = text.match(/\{[\s\S]*?\}/);
        if (match) {
          return res.status(200).json(JSON.parse(match[0]));
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  res.status(200).json({ fallback: true });
}
