export interface Question {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  answer: string;
  options?: string[];
  explanation?: string;
}

export interface QuestionBankData {
  meta: {
    title: string;
    categories: string[];
    difficulty_scale: string[];
    format: string;
    notes: string;
  };
  questions: Question[];
}

export interface Verdict {
  correct: boolean;
  reason: string;
  manualReview?: boolean;
  pointsEarned?: number;
  basePoints?: number;
  speedBonus?: number;
}

export interface ScoreState {
  correct: number;
  total: number;
  points: number;
  byCategory: Record<string, { correct: number; total: number; points: number }>;
}

export interface FilterState {
  category: string;
  difficulty: string;
}

export type ScreenType =
  | 'setup'
  | 'buzzer'
  | 'verdict'
  | 'summary'
  | 'duel-buzzer'
  | 'duel-verdict'
  | 'duel-summary'
  | 'network-lobby'
  | 'network-buzzer'
  | 'network-verdict'
  | 'network-summary';

export type GameMode = 'solo' | 'duel';

export interface DuelPlayerState {
  name: string;
  score: number;
  correctCount: number;
  buzzCount: number;
  buzzTimes: number[];
}

export interface DuelState {
  player1: DuelPlayerState;
  player2: DuelPlayerState;
  roundsTotal: number;
  activeBuzzerPlayer: 1 | 2 | null;
  isRebound: boolean;
  reboundPlayer: 1 | 2 | null;
  hasReboundAttempted: boolean;
}
