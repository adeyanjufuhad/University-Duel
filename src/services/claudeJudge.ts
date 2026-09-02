import { Verdict } from '../types';
import { evaluateAnswerMatch } from '../utils/answerMatcher';

export async function judgeAnswer(
  question: string,
  correctAnswer: string,
  transcribedAnswer: string
): Promise<Verdict> {
  const cleanAnswer = (transcribedAnswer || '').trim();

  // If student said nothing or only silence
  if (!cleanAnswer) {
    return {
      correct: false,
      reason: 'No audible or typed answer was detected.'
    };
  }

  // 1. Try dev-server proxy endpoint first
  try {
    const proxyResponse = await fetch('/api/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        correctAnswer,
        transcribedAnswer: cleanAnswer
      })
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      if (typeof data.correct === 'boolean') {
        return {
          correct: data.correct,
          reason: data.reason || (data.correct ? 'Correct answer.' : 'Incorrect answer.')
        };
      }
    }
  } catch {
    // Continue to direct call or fallback
  }

  // 2. Direct Anthropic API call fallback
  const apiKey = (typeof process !== 'undefined' && process.env?.ANTHROPIC_API_KEY) || '';
  if (apiKey) {
    try {
      const directResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
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
Student said: "${cleanAnswer}"

Reply with ONLY valid JSON in this exact shape, nothing else:
{"correct": true, "reason": "one short sentence"}
or
{"correct": false, "reason": "one short sentence"}`
            }
          ]
        })
      });

      if (directResponse.ok) {
        const data = await directResponse.json();
        const text = data.content?.[0]?.text ?? '';
        const match = text.match(/\{[\s\S]*?\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            correct: Boolean(parsed.correct),
            reason: parsed.reason || (parsed.correct ? 'Accepted by Claude.' : 'Rejected by Claude.')
          };
        }
      }
    } catch {
      // Continue to intelligent fallback
    }
  }

  // 3. Fallback intelligent evaluation using conversational & speech normalization
  const matchResult = evaluateAnswerMatch(correctAnswer, cleanAnswer);
  return {
    correct: matchResult.isMatch,
    reason: matchResult.reason,
    manualReview: true
  };
}
