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

export async function createDuelRoom(
  hostName: string,
  settings: { category: string; difficulty: string; timeLimit: number; rounds: number }
): Promise<{ code: string }> {
  const resp = await fetch('/api/duel/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName, settings })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create duel room');
  }
  return resp.json();
}

export async function joinDuelRoom(
  code: string,
  challengerName: string
): Promise<{ ok: boolean; hostName: string; settings: any }> {
  const resp = await fetch('/api/duel/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, challengerName })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to join duel room');
  }
  return resp.json();
}

export function subscribeToDuelRoom(
  code: string,
  role: 'host' | 'challenger',
  onUpdate: (state: NetworkRoomState) => void,
  onError?: (err: any) => void
): () => void {
  const eventSource = new EventSource(`/api/duel/events?code=${encodeURIComponent(code)}&role=${role}`);

  eventSource.onmessage = (event) => {
    try {
      const data: NetworkRoomState = JSON.parse(event.data);
      onUpdate(data);
    } catch (e) {
      console.error('Error parsing SSE duel event:', e);
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}

export async function sendDuelAction(
  code: string,
  role: 'host' | 'challenger',
  action: 'start' | 'buzz' | 'answer' | 'rebound' | 'next' | 'rematch',
  payload?: any
): Promise<void> {
  const resp = await fetch('/api/duel/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, role, action, payload })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Action ${action} failed`);
  }
}
