import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import questionBank from './src/data/question-bank.json';
import { evaluateAnswerMatch } from './src/utils/answerMatcher';

interface DuelRoom {
  code: string;
  hostName: string;
  challengerName: string | null;
  settings: {
    category: string;
    difficulty: string;
    timeLimit: number;
    rounds: number;
  };
  pool: any[];
  index: number;
  state: 'lobby' | 'buzzing' | 'answering' | 'verdict' | 'summary';
  buzzedPlayer: 'host' | 'challenger' | null;
  buzzTime: number;
  transcription: string;
  verdict: any;
  scores: {
    host: number;
    challenger: number;
    hostBuzzes: number;
    challengerBuzzes: number;
    hostCorrect: number;
    challengerCorrect: number;
    hostTimes: number[];
    challengerTimes: number[];
  };
  canRebound: boolean;
  reboundPlayer: 'host' | 'challenger' | null;
  clients: {
    host?: any;
    challenger?: any;
  };
}

const duelRooms = new Map<string, DuelRoom>();

function broadcastRoomState(room: DuelRoom) {
  const publicData = {
    code: room.code,
    hostName: room.hostName,
    challengerName: room.challengerName,
    settings: room.settings,
    index: room.index,
    roundsTotal: room.settings.rounds,
    state: room.state,
    buzzedPlayer: room.buzzedPlayer,
    buzzTime: room.buzzTime,
    transcription: room.transcription,
    verdict: room.verdict,
    scores: room.scores,
    canRebound: room.canRebound,
    reboundPlayer: room.reboundPlayer,
    currentQuestion: room.pool[room.index] || null,
  };

  const payload = `data: ${JSON.stringify(publicData)}\n\n`;

  if (room.clients.host && !room.clients.host.destroyed) {
    room.clients.host.write(payload);
  }
  if (room.clients.challenger && !room.clients.challenger.destroyed) {
    room.clients.challenger.write(payload);
  }
}

async function judgeAnswerText(question: string, correctAnswer: string, transcribedAnswer: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (apiKey) {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
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

      if (resp.ok) {
        const data = await resp.json();
        const text = data.content?.[0]?.text ?? '';
        const match = text.match(/\{[\s\S]*?\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
    } catch {
      // Fallback below
    }
  }

  // Intelligent fallback check
  const matchResult = evaluateAnswerMatch(correctAnswer, transcribedAnswer);
  return {
    correct: matchResult.isMatch,
    reason: matchResult.reason
  };
}

function calculateDuelPoints(isCorrect: boolean, reactionTime: number, timeLimit: number, difficulty: string) {
  if (!isCorrect) return { totalPoints: 0, basePoints: 0, speedBonus: 0 };
  const diff = (difficulty || 'medium').toLowerCase();
  let basePoints = 50;
  let maxBonus = 50;
  if (diff === 'easy') { basePoints = 40; maxBonus = 60; }
  else if (diff === 'hard') { basePoints = 60; maxBonus = 40; }

  const remaining = Math.max(0, timeLimit - reactionTime);
  const ratio = Math.max(0, Math.min(1, remaining / timeLimit));
  const speedBonus = Math.round(ratio * maxBonus);
  return { totalPoints: Math.min(100, basePoints + speedBonus), basePoints, speedBonus };
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'duel-api-endpoints',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url?.split('?')[0];

          // 1. Claude judge endpoint
          if (url === '/api/judge') {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              return res.end('Method Not Allowed');
            }
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { question, correctAnswer, transcribedAnswer } = JSON.parse(body);
                const result = await judgeAnswerText(question, correctAnswer, transcribedAnswer);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message, fallback: true }));
              }
            });
            return;
          }

          // 2. Create Duel Room
          if (url === '/api/duel/create') {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              return res.end('Method Not Allowed');
            }
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const { hostName, settings } = JSON.parse(body);
                // 4-digit numeric code
                let code = Math.floor(1000 + Math.random() * 9000).toString();
                while (duelRooms.has(code)) {
                  code = Math.floor(1000 + Math.random() * 9000).toString();
                }

                // Filter & shuffle question pool
                const questions = questionBank.questions.filter((q: any) => {
                  const matchCat = settings.category === 'All' || q.category.toLowerCase() === settings.category.toLowerCase();
                  const matchDiff = settings.difficulty === 'All' || q.difficulty.toLowerCase() === settings.difficulty.toLowerCase();
                  return matchCat && matchDiff;
                });

                const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, settings.rounds || 10);

                const newRoom: DuelRoom = {
                  code,
                  hostName: hostName || 'Host',
                  challengerName: null,
                  settings: {
                    category: settings.category || 'All',
                    difficulty: settings.difficulty || 'All',
                    timeLimit: settings.timeLimit || 15,
                    rounds: shuffled.length || 10
                  },
                  pool: shuffled,
                  index: 0,
                  state: 'lobby',
                  buzzedPlayer: null,
                  buzzTime: 0,
                  transcription: '',
                  verdict: null,
                  scores: {
                    host: 0,
                    challenger: 0,
                    hostBuzzes: 0,
                    challengerBuzzes: 0,
                    hostCorrect: 0,
                    challengerCorrect: 0,
                    hostTimes: [],
                    challengerTimes: []
                  },
                  canRebound: false,
                  reboundPlayer: null,
                  clients: {}
                };

                duelRooms.set(code, newRoom);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ code }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          // 3. Join Duel Room
          if (url === '/api/duel/join') {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              return res.end('Method Not Allowed');
            }
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const { code, challengerName } = JSON.parse(body);
                const room = duelRooms.get(code?.toString().trim());

                if (!room) {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'Room not found. Check the 4-digit code.' }));
                }

                if (room.challengerName && room.challengerName !== challengerName && room.state !== 'lobby') {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'This duel room is already in progress with two players.' }));
                }

                room.challengerName = challengerName || 'Challenger';
                broadcastRoomState(room);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  ok: true,
                  hostName: room.hostName,
                  settings: room.settings
                }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          // 4. SSE Events Connection
          if (url === '/api/duel/events') {
            const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
            const code = urlObj.searchParams.get('code') || '';
            const role = (urlObj.searchParams.get('role') || 'host') as 'host' | 'challenger';

            const room = duelRooms.get(code);
            if (!room) {
              res.statusCode = 404;
              return res.end('Room not found');
            }

            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            });
            res.write('\n');

            room.clients[role] = res;
            broadcastRoomState(room);

            req.on('close', () => {
              if (room.clients[role] === res) {
                delete room.clients[role];
              }
            });
            return;
          }

          // 5. Duel Action Handler
          if (url === '/api/duel/action') {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              return res.end('Method Not Allowed');
            }
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { code, role, action, payload } = JSON.parse(body);
                const room = duelRooms.get(code);
                if (!room) {
                  res.statusCode = 404;
                  return res.end(JSON.stringify({ error: 'Room not found' }));
                }

                if (action === 'start') {
                  room.state = 'buzzing';
                  room.index = 0;
                  room.buzzedPlayer = null;
                  room.canRebound = false;
                  broadcastRoomState(room);
                } else if (action === 'buzz') {
                  // Only first buzz is accepted
                  if (room.state === 'buzzing') {
                    room.state = 'answering';
                    room.buzzedPlayer = role;
                    room.buzzTime = payload?.reactionTime || 1.0;
                    if (role === 'host') {
                      room.scores.hostBuzzes += 1;
                      room.scores.hostTimes.push(room.buzzTime);
                    } else {
                      room.scores.challengerBuzzes += 1;
                      room.scores.challengerTimes.push(room.buzzTime);
                    }
                    broadcastRoomState(room);
                  }
                } else if (action === 'answer') {
                  // Buzzed player submits answer
                  if (room.state === 'answering') {
                    const currentQ = room.pool[room.index];
                    const answerText = payload?.text || '';
                    const evalResult = await judgeAnswerText(currentQ.question, currentQ.answer, answerText);
                    const pointCalc = calculateDuelPoints(evalResult.correct, room.buzzTime, room.settings.timeLimit, currentQ.difficulty);

                    const finalVerdict = {
                      correct: evalResult.correct,
                      reason: evalResult.reason,
                      pointsEarned: pointCalc.totalPoints,
                      basePoints: pointCalc.basePoints,
                      speedBonus: pointCalc.speedBonus
                    };

                    room.transcription = answerText;
                    room.verdict = finalVerdict;

                    if (evalResult.correct) {
                      if (room.buzzedPlayer === 'host') {
                        room.scores.host += pointCalc.totalPoints;
                        room.scores.hostCorrect += 1;
                      } else if (room.buzzedPlayer === 'challenger') {
                        room.scores.challenger += pointCalc.totalPoints;
                        room.scores.challengerCorrect += 1;
                      }
                      room.canRebound = false;
                      room.reboundPlayer = null;
                    } else {
                      // Allow opponent rebound steal if not already in rebound
                      if (!room.reboundPlayer) {
                        room.canRebound = true;
                        room.reboundPlayer = room.buzzedPlayer === 'host' ? 'challenger' : 'host';
                      } else {
                        room.canRebound = false;
                      }
                    }

                    room.state = 'verdict';
                    broadcastRoomState(room);
                  }
                } else if (action === 'rebound') {
                  if (room.canRebound && room.reboundPlayer) {
                    room.state = 'answering';
                    room.buzzedPlayer = room.reboundPlayer;
                    room.canRebound = false;
                    broadcastRoomState(room);
                  }
                } else if (action === 'next') {
                  if (room.index + 1 < room.pool.length && room.index + 1 < room.settings.rounds) {
                    room.index += 1;
                    room.state = 'buzzing';
                    room.buzzedPlayer = null;
                    room.canRebound = false;
                    room.reboundPlayer = null;
                    room.transcription = '';
                    room.verdict = null;
                  } else {
                    room.state = 'summary';
                  }
                  broadcastRoomState(room);
                } else if (action === 'rematch') {
                  const questions = questionBank.questions.filter((q: any) => {
                    const matchCat = room.settings.category === 'All' || q.category.toLowerCase() === room.settings.category.toLowerCase();
                    const matchDiff = room.settings.difficulty === 'All' || q.difficulty.toLowerCase() === room.settings.difficulty.toLowerCase();
                    return matchCat && matchDiff;
                  });
                  room.pool = [...questions].sort(() => Math.random() - 0.5).slice(0, room.settings.rounds);
                  room.index = 0;
                  room.state = 'buzzing';
                  room.buzzedPlayer = null;
                  room.canRebound = false;
                  room.reboundPlayer = null;
                  room.transcription = '';
                  room.verdict = null;
                  room.scores = {
                    host: 0,
                    challenger: 0,
                    hostBuzzes: 0,
                    challengerBuzzes: 0,
                    hostCorrect: 0,
                    challengerCorrect: 0,
                    hostTimes: [],
                    challengerTimes: []
                  };
                  broadcastRoomState(room);
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          next();
        });
      }
    }
  ],
  define: {
    'process.env.ANTHROPIC_API_KEY': JSON.stringify(process.env.ANTHROPIC_API_KEY || '')
  }
});
