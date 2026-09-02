const HIGH_SCORE_KEY = 'university_duel_high_score';

export interface PointCalculation {
  totalPoints: number;
  basePoints: number;
  speedBonus: number;
}

export function calculatePoints(
  isCorrect: boolean,
  reactionTime: number,
  timeLimit: number,
  difficulty?: string
): PointCalculation {
  if (!isCorrect) {
    return { totalPoints: 0, basePoints: 0, speedBonus: 0 };
  }

  // 100 points maximum per question
  // Base points: 50 pts (slight variance by difficulty if desired, or flat 50)
  // Easy: 40 base + 60 speed = 100 max
  // Medium: 50 base + 50 speed = 100 max
  // Hard: 60 base + 40 speed = 100 max
  const diff = (difficulty || 'medium').toLowerCase();
  let basePoints = 50;
  let maxSpeedBonus = 50;

  if (diff === 'easy') {
    basePoints = 40;
    maxSpeedBonus = 60;
  } else if (diff === 'hard') {
    basePoints = 60;
    maxSpeedBonus = 40;
  }

  // Speed bonus: the faster the student answers, the closer to max speed bonus
  const remainingTime = Math.max(0, timeLimit - reactionTime);
  const speedRatio = Math.max(0, Math.min(1, remainingTime / timeLimit));
  const speedBonus = Math.round(speedRatio * maxSpeedBonus);

  const totalPoints = Math.min(100, basePoints + speedBonus);
  return { totalPoints, basePoints, speedBonus };
}

export function getStoredHighScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(HIGH_SCORE_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveStoredHighScore(score: number): number {
  if (typeof window === 'undefined') return score;
  try {
    const current = getStoredHighScore();
    if (score > current) {
      localStorage.setItem(HIGH_SCORE_KEY, score.toString());
      return score;
    }
    return current;
  } catch {
    return score;
  }
}

export function resetStoredHighScore(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HIGH_SCORE_KEY, '0');
  } catch {
    // Ignore
  }
}
