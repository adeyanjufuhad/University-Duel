import questionBank from '../data/question-bank.json';
import { evaluateAnswerMatch } from '../utils/answerMatcher';

export interface NetworkRoomState {
  code: string;
  hostName: string;
  challengerName: string | null;
  settings: {
    category: string;
    difficulty: string;
    timeLimit: number;
    rounds: number;
  };
  index: number;
  roundsTotal: number;
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
  currentQuestion: any;
  pool?: any[];
}

// Global session variables
let activeEventSource: EventSource | null = null;
let activeBroadcastChannel: BroadcastChannel | null = null;
let currentRoomState: NetworkRoomState | null = null;
let currentRole: 'host' | 'challenger' | null = null;
let subscriberCallback: ((state: NetworkRoomState) => void) | null = null;
let hostHeartbeatInterval: any = null;

function getTopicUrl(code: string): string {
  return `https://ntfy.sh/udeul2026_${code.trim()}`;
}

function notifySubscribers(state: NetworkRoomState) {
  currentRoomState = { ...state };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`ud_room_${state.code}`, JSON.stringify(state));
    } catch {}
    if (activeBroadcastChannel) {
      activeBroadcastChannel.postMessage({ type: 'ROOM_UPDATE', state });
    }
  }
  if (subscriberCallback) {
    subscriberCallback(state);
  }
}

async function postMessageToRoom(code: string, messageObj: any): Promise<boolean> {
  // Also send to local BroadcastChannel for same-device tabs
  if (activeBroadcastChannel) {
    try {
      activeBroadcastChannel.postMessage(messageObj);
    } catch {}
  }

  try {
    const topic = getTopicUrl(code);
    const resp = await fetch(topic, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageObj)
    });
    return resp.ok;
  } catch (err) {
    console.warn('Network post warning:', err);
    return false;
  }
}

function handleIncomingAction(actionMsg: any) {
  if (currentRole !== 'host' || !currentRoomState) return;

  const { action, payload, role } = actionMsg;
  const room = currentRoomState;

  if (action === 'start') {
    room.state = 'buzzing';
    room.index = 0;
    room.buzzedPlayer = null;
    room.canRebound = false;
    room.reboundPlayer = null;
    room.transcription = '';
    room.verdict = null;
    notifySubscribers(room);
    postMessageToRoom(room.code, { type: 'ROOM_UPDATE', state: room });
  } else if (action === 'buzz') {
    if (room.state === 'buzzing') {
      room.state = 'answering';
      room.buzzedPlayer = role || payload?.role || 'challenger';
      room.buzzTime = payload?.reactionTime || 1.0;
      if (room.buzzedPlayer === 'host') {
        room.scores.hostBuzzes += 1;
        room.scores.hostTimes.push(room.buzzTime);
      } else {
        room.scores.challengerBuzzes += 1;
        room.scores.challengerTimes.push(room.buzzTime);
      }
      notifySubscribers(room);
      postMessageToRoom(room.code, { type: 'ROOM_UPDATE', state: room });
    }
  } else if (action === 'answer') {
    if (room.state === 'answering') {
      const q = room.currentQuestion;
      const text = payload?.text || '';
      const match = evaluateAnswerMatch(q.answer, text, q.options);

      const remaining = Math.max(0, room.settings.timeLimit - room.buzzTime);
      const ratio = Math.max(0, Math.min(1, remaining / room.settings.timeLimit));
      const speedBonus = match.isMatch ? Math.round(ratio * 50) : 0;
      const totalPoints = match.isMatch ? 50 + speedBonus : 0;

      room.transcription = text;
      room.verdict = {
        correct: match.isMatch,
        reason: match.reason,
        pointsEarned: totalPoints
      };

      if (match.isMatch) {
        if (room.buzzedPlayer === 'host') {
          room.scores.host += totalPoints;
          room.scores.hostCorrect += 1;
        } else {
          room.scores.challenger += totalPoints;
          room.scores.challengerCorrect += 1;
        }
        room.canRebound = false;
        room.reboundPlayer = null;
      } else {
        if (!room.reboundPlayer) {
          room.canRebound = true;
          room.reboundPlayer = room.buzzedPlayer === 'host' ? 'challenger' : 'host';
        } else {
          room.canRebound = false;
          room.reboundPlayer = null;
        }
      }

      room.state = 'verdict';
      notifySubscribers(room);
      postMessageToRoom(room.code, { type: 'ROOM_UPDATE', state: room });
    }
  } else if (action === 'rebound') {
    if (room.canRebound && room.reboundPlayer) {
      room.state = 'answering';
      room.buzzedPlayer = room.reboundPlayer;
      room.canRebound = false;
      notifySubscribers(room);
      postMessageToRoom(room.code, { type: 'ROOM_UPDATE', state: room });
    }
  } else if (action === 'next') {
    const pool = room.pool || questionBank.questions;
    if (room.index + 1 < room.roundsTotal) {
      room.index += 1;
      room.currentQuestion = pool[room.index % pool.length];
      room.state = 'buzzing';
      room.buzzedPlayer = null;
      room.canRebound = false;
      room.reboundPlayer = null;
      room.transcription = '';
      room.verdict = null;
    } else {
      room.state = 'summary';
    }
    notifySubscribers(room);
    postMessageToRoom(room.code, { type: 'ROOM_UPDATE', state: room });
  } else if (action === 'rematch') {
    const pool = room.pool || questionBank.questions;
    room.index = 0;
    room.currentQuestion = pool[0];
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
    notifySubscribers(room);
    postMessageToRoom(room.code, { type: 'ROOM_UPDATE', state: room });
  }
}

function cleanupExistingSession() {
  if (hostHeartbeatInterval) {
    clearInterval(hostHeartbeatInterval);
    hostHeartbeatInterval = null;
  }
  if (activeEventSource) {
    activeEventSource.close();
    activeEventSource = null;
  }
  if (activeBroadcastChannel) {
    try {
      activeBroadcastChannel.close();
    } catch {}
    activeBroadcastChannel = null;
  }
}

/**
 * Creates a new Duel Room.
 * Uses HTTPS Server-Sent Events (SSE) relay that works globally across all mobile devices without NAT/firewall blocks.
 */
export async function createDuelRoom(
  hostName: string,
  settings: { category: string; difficulty: string; timeLimit: number; rounds: number }
): Promise<{ code: string }> {
  cleanupExistingSession();

  const filtered = questionBank.questions.filter((q: any) => {
    const matchCat = settings.category === 'All' || q.category.toLowerCase() === settings.category.toLowerCase();
    const matchDiff = settings.difficulty === 'All' || q.difficulty.toLowerCase() === settings.difficulty.toLowerCase();
    return matchCat && matchDiff;
  });

  const pool = (filtered.length > 0 ? filtered : questionBank.questions)
    .sort(() => Math.random() - 0.5)
    .slice(0, settings.rounds || 10);

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  currentRole = 'host';

  currentRoomState = {
    code,
    hostName: hostName || 'Host',
    challengerName: null,
    settings: {
      category: settings.category || 'All',
      difficulty: settings.difficulty || 'All',
      timeLimit: settings.timeLimit || 15,
      rounds: pool.length
    },
    index: 0,
    roundsTotal: pool.length,
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
    currentQuestion: pool[0] || null,
    pool
  };

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    activeBroadcastChannel = new BroadcastChannel(`ud_room_${code}`);
    activeBroadcastChannel.onmessage = (e) => {
      if (e.data?.type === 'ACTION') {
        handleIncomingAction(e.data);
      } else if (e.data?.type === 'JOIN') {
        if (currentRoomState) {
          currentRoomState.challengerName = e.data.challengerName;
          notifySubscribers(currentRoomState);
          postMessageToRoom(code, { type: 'ROOM_UPDATE', state: currentRoomState });
        }
      }
    };
  }

  // Subscribe to real-time HTTPS SSE stream
  const sseUrl = `${getTopicUrl(code)}/sse`;
  const es = new EventSource(sseUrl);
  activeEventSource = es;

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.message) {
        const msg = JSON.parse(data.message);
        if (msg.type === 'JOIN') {
          if (currentRoomState) {
            currentRoomState.challengerName = msg.challengerName || 'Challenger';
            notifySubscribers(currentRoomState);
            // Immediately broadcast the updated room with both players
            postMessageToRoom(code, { type: 'ROOM_UPDATE', state: currentRoomState });
          }
        } else if (msg.type === 'ACTION') {
          handleIncomingAction(msg);
        }
      }
    } catch {}
  };

  // Announce initial room state immediately
  await postMessageToRoom(code, { type: 'ROOM_UPDATE', state: currentRoomState });

  // Heartbeat to keep room state announced while in lobby
  hostHeartbeatInterval = setInterval(() => {
    if (currentRoomState && currentRoomState.state === 'lobby') {
      postMessageToRoom(code, { type: 'ROOM_UPDATE', state: currentRoomState });
    }
  }, 2000);

  return { code };
}

/**
 * Joins an existing Duel Room on another device or same device.
 */
export async function joinDuelRoom(
  code: string,
  challengerName: string
): Promise<{ ok: boolean; hostName: string; settings: any }> {
  cleanupExistingSession();
  const cleanCode = code.trim();
  currentRole = 'challenger';

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    activeBroadcastChannel = new BroadcastChannel(`ud_room_${cleanCode}`);
    activeBroadcastChannel.onmessage = (e) => {
      if (e.data?.type === 'ROOM_UPDATE' && e.data.state) {
        notifySubscribers(e.data.state);
      }
    };
  }

  // Check local storage if on same device
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(`ud_room_${cleanCode}`);
      if (local) {
        const parsed = JSON.parse(local);
        parsed.challengerName = challengerName;
        currentRoomState = parsed;
        try {
          localStorage.setItem(`ud_room_${cleanCode}`, JSON.stringify(parsed));
        } catch {}
        if (activeBroadcastChannel) {
          activeBroadcastChannel.postMessage({ type: 'JOIN', challengerName });
        }
      }
    } catch {}
  }

  return new Promise<{ ok: boolean; hostName: string; settings: any }>((resolve, reject) => {
    let resolved = false;

    // Connect to real-time HTTPS SSE stream
    const sseUrl = `${getTopicUrl(cleanCode)}/sse`;
    const es = new EventSource(sseUrl);
    activeEventSource = es;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (currentRoomState && currentRoomState.hostName) {
          resolve({
            ok: true,
            hostName: currentRoomState.hostName,
            settings: currentRoomState.settings
          });
        } else {
          reject(new Error(`Duel room ${cleanCode} not found. Please verify the code on the host device.`));
        }
      }
    }, 7000);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.message) {
          const msg = JSON.parse(data.message);
          if (msg.type === 'ROOM_UPDATE' && msg.state) {
            notifySubscribers(msg.state);
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve({
                ok: true,
                hostName: msg.state.hostName || 'Host',
                settings: msg.state.settings
              });
            }
          }
        }
      } catch {}
    };

    // Send JOIN request immediately, and retry every 1.2s until connected
    postMessageToRoom(cleanCode, { type: 'JOIN', challengerName });
    const joinInterval = setInterval(() => {
      if (resolved) {
        clearInterval(joinInterval);
      } else {
        postMessageToRoom(cleanCode, { type: 'JOIN', challengerName });
      }
    }, 1200);
  });
}

/**
 * Subscribes the current screen to room state updates.
 */
export function subscribeToDuelRoom(
  _code: string,
  _role: 'host' | 'challenger',
  onUpdate: (state: NetworkRoomState) => void,
  _onError?: (err: any) => void
): () => void {
  subscriberCallback = onUpdate;

  if (currentRoomState) {
    onUpdate(currentRoomState);
  }

  return () => {
    if (subscriberCallback === onUpdate) {
      subscriberCallback = null;
    }
  };
}

/**
 * Dispatches player actions (start, buzz, answer, rebound, next, rematch).
 */
export async function sendDuelAction(
  code: string,
  role: 'host' | 'challenger',
  action: 'start' | 'buzz' | 'answer' | 'rebound' | 'next' | 'rematch',
  payload?: any
): Promise<void> {
  const actionMsg = {
    type: 'ACTION',
    role,
    action,
    payload: { ...payload, role }
  };

  if (currentRole === 'host') {
    handleIncomingAction(actionMsg);
  } else {
    await postMessageToRoom(code, actionMsg);
  }
}
