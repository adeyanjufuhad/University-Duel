import { connect } from 'itty-sockets';
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

let activeChannel: any = null;
let activeBroadcastChannel: BroadcastChannel | null = null;
let currentRoomState: NetworkRoomState | null = null;
let currentRole: 'host' | 'challenger' | null = null;
let subscriberCallback: ((state: NetworkRoomState) => void) | null = null;
let hostLobbyHeartbeat: any = null;
let challengerJoinInterval: any = null;

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

function broadcastToRoom(msgObj: any) {
  if (activeChannel) {
    try {
      activeChannel.send(JSON.stringify(msgObj));
    } catch (e) {
      console.warn('Channel send error:', e);
    }
  }
  if (activeBroadcastChannel) {
    try {
      activeBroadcastChannel.postMessage(msgObj);
    } catch {}
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
    broadcastToRoom({ type: 'ROOM_UPDATE', state: room });
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
      broadcastToRoom({ type: 'ROOM_UPDATE', state: room });
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
      broadcastToRoom({ type: 'ROOM_UPDATE', state: room });
    }
  } else if (action === 'rebound') {
    if (room.canRebound && room.reboundPlayer) {
      room.state = 'answering';
      room.buzzedPlayer = room.reboundPlayer;
      room.canRebound = false;
      notifySubscribers(room);
      broadcastToRoom({ type: 'ROOM_UPDATE', state: room });
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
    broadcastToRoom({ type: 'ROOM_UPDATE', state: room });
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
    broadcastToRoom({ type: 'ROOM_UPDATE', state: room });
  }
}

function cleanupExistingSession() {
  if (hostLobbyHeartbeat) {
    clearInterval(hostLobbyHeartbeat);
    hostLobbyHeartbeat = null;
  }
  if (challengerJoinInterval) {
    clearInterval(challengerJoinInterval);
    challengerJoinInterval = null;
  }
  if (activeChannel) {
    try {
      activeChannel.close();
    } catch {}
    activeChannel = null;
  }
  if (activeBroadcastChannel) {
    try {
      activeBroadcastChannel.close();
    } catch {}
    activeBroadcastChannel = null;
  }
}

/**
 * Creates a new Duel Room using persistent WebSocket relay.
 * Works seamlessly across all deployed sites (Vercel, Netlify, etc.) and mobile carriers.
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
          currentRoomState.challengerName = e.data.challengerName || 'Challenger';
          notifySubscribers(currentRoomState);
          broadcastToRoom({ type: 'ROOM_UPDATE', state: currentRoomState });
        }
      }
    };
  }

  try {
    localStorage.setItem(`ud_room_${code}`, JSON.stringify(currentRoomState));
  } catch {}

  const channel = connect(`ud_duel_${code}`, { as: hostName || 'Host' });
  activeChannel = channel;

  channel.on('message', ({ message }: { message: string }) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'JOIN') {
        if (currentRoomState) {
          currentRoomState.challengerName = data.challengerName || 'Challenger';
          notifySubscribers(currentRoomState);
          broadcastToRoom({ type: 'ROOM_UPDATE', state: currentRoomState });
        }
      } else if (data.type === 'ACTION') {
        handleIncomingAction(data);
      }
    } catch {}
  });

  // Host sends room state on startup and pulses while in lobby
  broadcastToRoom({ type: 'ROOM_UPDATE', state: currentRoomState });
  hostLobbyHeartbeat = setInterval(() => {
    if (currentRoomState && currentRoomState.state === 'lobby') {
      broadcastToRoom({ type: 'ROOM_UPDATE', state: currentRoomState });
    }
  }, 1000);

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

    const channel = connect(`ud_duel_${cleanCode}`, { as: challengerName || 'Challenger' });
    activeChannel = channel;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (challengerJoinInterval) clearInterval(challengerJoinInterval);
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
    }, 8000);

    channel.on('message', ({ message }: { message: string }) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'ROOM_UPDATE' && data.state) {
          if (challengerJoinInterval) {
            clearInterval(challengerJoinInterval);
            challengerJoinInterval = null;
          }
          notifySubscribers(data.state);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve({
              ok: true,
              hostName: data.state.hostName || 'Host',
              settings: data.state.settings
            });
          }
        }
      } catch {}
    });

    // Send JOIN pulse and retry every 350ms until host responds with ROOM_UPDATE
    const sendJoin = () => {
      try {
        channel.send(JSON.stringify({ type: 'JOIN', challengerName }));
      } catch {}
    };

    sendJoin();
    challengerJoinInterval = setInterval(sendJoin, 350);
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
  _code: string,
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
    broadcastToRoom(actionMsg);
  }
}
