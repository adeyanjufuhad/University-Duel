import Peer, { type DataConnection } from 'peerjs';
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

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

// Global singleton state for the active room session
let currentPeer: Peer | null = null;
let currentConn: DataConnection | null = null;
let currentRoomState: NetworkRoomState | null = null;
let currentRole: 'host' | 'challenger' | null = null;
let subscriberCallback: ((state: NetworkRoomState) => void) | null = null;
let broadcastChannel: BroadcastChannel | null = null;
let hostLobbyInterval: any = null;
let challengerJoinInterval: any = null;

function notifySubscribers(state: NetworkRoomState) {
  currentRoomState = { ...state };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`ud_room_${state.code}`, JSON.stringify(state));
    } catch {}
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'ROOM_UPDATE', state });
    }
  }
  if (subscriberCallback) {
    subscriberCallback(state);
  }
}

function sendToRemote(msg: any) {
  if (currentConn && currentConn.open) {
    try {
      currentConn.send(msg);
    } catch (e) {
      console.warn('Could not send data across WebRTC data connection:', e);
    }
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
    sendToRemote({ type: 'ROOM_UPDATE', state: room });
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
      sendToRemote({ type: 'ROOM_UPDATE', state: room });
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
      sendToRemote({ type: 'ROOM_UPDATE', state: room });
    }
  } else if (action === 'rebound') {
    if (room.canRebound && room.reboundPlayer) {
      room.state = 'answering';
      room.buzzedPlayer = room.reboundPlayer;
      room.canRebound = false;
      notifySubscribers(room);
      sendToRemote({ type: 'ROOM_UPDATE', state: room });
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
    sendToRemote({ type: 'ROOM_UPDATE', state: room });
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
    sendToRemote({ type: 'ROOM_UPDATE', state: room });
  }
}

function cleanupExistingSession() {
  if (hostLobbyInterval) {
    clearInterval(hostLobbyInterval);
    hostLobbyInterval = null;
  }
  if (challengerJoinInterval) {
    clearInterval(challengerJoinInterval);
    challengerJoinInterval = null;
  }
  if (currentConn) {
    try {
      currentConn.close();
    } catch {}
    currentConn = null;
  }
  if (currentPeer) {
    try {
      currentPeer.destroy();
    } catch {}
    currentPeer = null;
  }
  if (broadcastChannel) {
    try {
      broadcastChannel.close();
    } catch {}
    broadcastChannel = null;
  }
}

/**
 * Creates a new WebRTC PeerJS Duel Room.
 * Works on any deployed site (Vercel, Netlify, GitHub Pages, or local).
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

  return new Promise<{ code: string }>((resolve) => {
    let resolved = false;
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const peerId = `udeul2026-${code}`;

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
      broadcastChannel = new BroadcastChannel(`ud_room_${code}`);
      broadcastChannel.onmessage = (e) => {
        if (e.data?.type === 'ACTION') {
          handleIncomingAction(e.data);
        } else if (e.data?.type === 'JOIN') {
          if (currentRoomState) {
            currentRoomState.challengerName = e.data.challengerName || 'Challenger';
            notifySubscribers(currentRoomState);
            broadcastChannel?.postMessage({ type: 'ROOM_UPDATE', state: currentRoomState });
          }
        }
      };
    }

    try {
      localStorage.setItem(`ud_room_${code}`, JSON.stringify(currentRoomState));
    } catch {}

    const peer = new Peer(peerId, {
      debug: 1,
      config: ICE_CONFIG
    });
    currentPeer = peer;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ code });
      }
    }, 3500);

    peer.on('open', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ code });
      }
    });

    peer.on('connection', (conn) => {
      currentConn = conn;

      const broadcastState = () => {
        if (currentRoomState && conn.open) {
          try {
            conn.send({ type: 'ROOM_UPDATE', state: currentRoomState });
          } catch {}
        }
      };

      // In PeerJS, connection is already established when 'connection' event fires
      broadcastState();

      conn.on('open', broadcastState);

      conn.on('data', (data: any) => {
        if (!data) return;
        if (data.type === 'JOIN') {
          if (currentRoomState) {
            currentRoomState.challengerName = data.challengerName || 'Challenger';
            notifySubscribers(currentRoomState);
            broadcastState();
          }
        } else if (data.type === 'ACTION') {
          handleIncomingAction(data);
        }
      });

      conn.on('close', () => {
        currentConn = null;
      });
    });

    peer.on('error', (err) => {
      console.warn('Peer error on host:', err);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ code });
      }
    });
  });
}

/**
 * Joins an existing WebRTC Duel Room on another device or same device.
 */
export async function joinDuelRoom(
  code: string,
  challengerName: string
): Promise<{ ok: boolean; hostName: string; settings: any }> {
  cleanupExistingSession();
  const cleanCode = code.trim();
  const targetPeerId = `udeul2026-${cleanCode}`;

  currentRole = 'challenger';

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(`ud_room_${cleanCode}`);
    broadcastChannel.onmessage = (e) => {
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
        if (broadcastChannel) {
          broadcastChannel.postMessage({ type: 'JOIN', challengerName });
        }
      }
    } catch {}
  }

  return new Promise<{ ok: boolean; hostName: string; settings: any }>((resolve, reject) => {
    let resolved = false;

    const peer = new Peer({
      debug: 1,
      config: ICE_CONFIG
    });
    currentPeer = peer;

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

    peer.on('open', () => {
      const conn = peer.connect(targetPeerId, { reliable: true });
      currentConn = conn;

      const sendJoinPulse = () => {
        if (conn.open) {
          try {
            conn.send({ type: 'JOIN', challengerName });
          } catch {}
        }
      };

      conn.on('open', () => {
        sendJoinPulse();
        // Repeating handshake pulse every 400ms until host responds with challengerName
        challengerJoinInterval = setInterval(sendJoinPulse, 400);
      });

      conn.on('data', (data: any) => {
        if (!data) return;
        if (data.type === 'ROOM_UPDATE' && data.state) {
          if (data.state.challengerName && challengerJoinInterval) {
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
      });

      conn.on('error', (err) => {
        console.warn('Connection error to host:', err);
      });
    });

    peer.on('error', (err) => {
      console.warn('Peer error on challenger:', err);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (challengerJoinInterval) clearInterval(challengerJoinInterval);
        if (currentRoomState && currentRoomState.hostName) {
          resolve({
            ok: true,
            hostName: currentRoomState.hostName,
            settings: currentRoomState.settings
          });
        } else {
          reject(new Error(`Could not connect to room ${cleanCode}. Please check code and host connection.`));
        }
      }
    });
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

  if (broadcastChannel) {
    broadcastChannel.postMessage(actionMsg);
  }

  if (currentRole === 'host') {
    handleIncomingAction(actionMsg);
  } else {
    sendToRemote(actionMsg);
  }
}
