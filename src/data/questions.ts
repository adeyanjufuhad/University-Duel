import questionBankData from './question-bank.json';
import { Question } from '../types';

export const QUESTIONS: Question[] = questionBankData.questions;

export const CATEGORIES = [
  'All',
  'Applied Math',
  'Data Analysis',
  'Verbal Reasoning',
  'General Knowledge'
] as const;

export const DIFFICULTIES = [
  'All',
  'Easy',
  'Medium',
  'Hard'
] as const;

export function filterAndShufflePool(category: string, difficulty: string): Question[] {
  const filtered = QUESTIONS.filter((q) => {
    const matchesCat =
      category === 'All' || q.category.toLowerCase() === category.toLowerCase();
    const matchesDiff =
      difficulty === 'All' || q.difficulty.toLowerCase() === difficulty.toLowerCase();
    return matchesCat && matchesDiff;
  });

  // Fisher-Yates shuffle
  const shuffled = [...filtered];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
