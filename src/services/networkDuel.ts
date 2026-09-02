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
}

// Local in-memory / storage room cache for seamless fallback
const LOCAL_STORAGE_KEY_PREFIX = 'university_duel_room_';
let localBroadcastChannels: Map<string, BroadcastChannel> = new Map();

function getBroadcastChannel(code: string): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  if (!localBroadcastChannels.has(code)) {
    localBroadcastChannels.set(code, new BroadcastChannel(`ud_room_${code}`));
  }
  return localBroadcastChannels.get(code) || null;
}

function getLocalRoom(code: string): NetworkRoomState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + code);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalRoom(room: NetworkRoomState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + room.code, JSON.stringify(room));
    const bc = getBroadcastChannel(room.code);
    bc?.postMessage({ type: 'UPDATE', state: room });
  } catch {}
}

function initLocalRoom(
  code: string,
  hostName: string,
  settings: { category: string; difficulty: string; timeLimit: number; rounds: number }
): NetworkRoomState {
  const filtered = questionBank.questions.filter((q: any) => {
    const matchCat = settings.category === 'All' || q.category.toLowerCase() === settings.category.toLowerCase();
    const matchDiff = settings.difficulty === 'All' || q.difficulty.toLowerCase() === settings.difficulty.toLowerCase();
    return matchCat && matchDiff;
  });

  const pool = (filtered.length > 0 ? filtered : questionBank.questions)
    .sort(() => Math.random() - 0.5)
    .slice(0, settings.rounds || 10);

  const room: NetworkRoomState = {
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
    currentQuestion: pool[0] || null
  };

  saveLocalRoom(room);
  return room;
}

export async function createDuelRoom(
  hostName: string,
  settings: { category: string; difficulty: string; timeLimit: number; rounds: number }
): Promise<{ code: string }> {
  // Try backend endpoint first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const resp = await fetch('/api/duel/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName, settings }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.code) {
        return { code: String(data.code) };
      }
    }
  } catch {
    // Fall back to client-side synchronized room
  }

  // Resilient fallback: Always generates a 4-digit code and starts the room
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  initLocalRoom(code, hostName, settings);
  return { code };
}

export async function joinDuelRoom(
  code: string,
  challengerName: string
): Promise<{ ok: boolean; hostName: string; settings: any }> {
  const cleanCode = code.trim();

  // Try backend endpoint first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const resp = await fetch('/api/duel/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: cleanCode, challengerName }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.ok) {
        return data;
      }
    }
  } catch {
    // Fall back to local room
  }

  const localRoom = getLocalRoom(cleanCode);
  if (!localRoom) {
    throw new Error('Room not found. Please check the 4-digit code.');
  }

  localRoom.challengerName = challengerName;
  saveLocalRoom(localRoom);

  return {
    ok: true,
    hostName: localRoom.hostName,
    settings: localRoom.settings
  };
}

export function subscribeToDuelRoom(
  code: string,
  role: 'host' | 'challenger',
  onUpdate: (state: NetworkRoomState) => void,
  onError?: (err: any) => void
): () => void {
  const cleanCode = code.trim();
  let closed = false;
  let eventSource: EventSource | null = null;
  const bc = getBroadcastChannel(cleanCode);

  // Send initial local state immediately if available
  const initialLocal = getLocalRoom(cleanCode);
  if (initialLocal) {
    onUpdate(initialLocal);
  }

  // Listen on BroadcastChannel for instant local updates across tabs
  if (bc) {
    bc.onmessage = (e) => {
      if (closed) return;
      if (e.data && e.data.type === 'UPDATE' && e.data.state) {
        onUpdate(e.data.state);
      }
    };
  }

  // Also listen on window storage events
  const handleStorage = (e: StorageEvent) => {
    if (closed) return;
    if (e.key === LOCAL_STORAGE_KEY_PREFIX + cleanCode && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        onUpdate(parsed);
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorage);

  // Connect to SSE backend stream
  try {
    eventSource = new EventSource(`/api/duel/events?code=${encodeURIComponent(cleanCode)}&role=${role}`);

    eventSource.onmessage = (event) => {
      if (closed) return;
      try {
        const data: NetworkRoomState = JSON.parse(event.data);
        saveLocalRoom(data);
        onUpdate(data);
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    };

    eventSource.onerror = (err) => {
      if (onError && !closed) onError(err);
    };
  } catch {
    // EventSource not available or errored
  }

  return () => {
    closed = true;
    window.removeEventListener('storage', handleStorage);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

export async function sendDuelAction(
  code: string,
  role: 'host' | 'challenger',
  action: 'start' | 'buzz' | 'answer' | 'rebound' | 'next' | 'rematch',
  payload?: any
): Promise<void> {
  const cleanCode = code.trim();

  // 1. Try server endpoint
  try {
    const resp = await fetch('/api/duel/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: cleanCode, role, action, payload })
    });
    if (resp.ok) return;
  } catch {
    // Continue to local execution fallback
  }

  // 2. Local fallback execution
  const room = getLocalRoom(cleanCode);
  if (!room) return;

  if (action === 'start') {
    room.state = 'buzzing';
    room.index = 0;
    room.buzzedPlayer = null;
    room.canRebound = false;
    saveLocalRoom(room);
  } else if (action === 'buzz') {
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
      saveLocalRoom(room);
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
        }
      }

      room.state = 'verdict';
      saveLocalRoom(room);
    }
  } else if (action === 'rebound') {
    if (room.canRebound && room.reboundPlayer) {
      room.state = 'answering';
      room.buzzedPlayer = room.reboundPlayer;
      room.canRebound = false;
      saveLocalRoom(room);
    }
  } else if (action === 'next') {
    if (room.index + 1 < room.roundsTotal) {
      room.index += 1;
      const allQ = questionBank.questions;
      room.currentQuestion = allQ[room.index % allQ.length];
      room.state = 'buzzing';
      room.buzzedPlayer = null;
      room.canRebound = false;
      room.reboundPlayer = null;
      room.transcription = '';
      room.verdict = null;
    } else {
      room.state = 'summary';
    }
    saveLocalRoom(room);
  } else if (action === 'rematch') {
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
    saveLocalRoom(room);
  }
}
