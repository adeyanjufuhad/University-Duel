const PLAYER_NAME_KEY = 'university_duel_player_name';

export function getStoredPlayerName(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveStoredPlayerName(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name.trim());
  } catch {
    // Ignore
  }
}

export function clearStoredPlayerName(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PLAYER_NAME_KEY);
  } catch {
    // Ignore
  }
}
