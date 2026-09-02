import React from 'react';
import { ScoreState } from '../types';

interface SummaryScreenProps {
  score: ScoreState;
  buzzTimes: number[];
  highScore: number;
  playerName: string;
  onRestart: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  score,
  buzzTimes,
  highScore,
  playerName,
  onRestart
}) => {
  // Compute average buzz reaction time
  const validTimes = buzzTimes.filter((t) => t > 0);
  const avgBuzzTime =
    validTimes.length > 0
      ? (validTimes.reduce((a, b) => a + b, 0) / validTimes.length).toFixed(1)
      : '0.0';

  // Overall accuracy
  const overallPercentage =
    score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  const isNewHighScore = score.points > 0 && score.points >= highScore;

  // Categories list
  const categoryKeys = [
    'Applied Math',
    'Data Analysis',
    'Verbal Reasoning',
    'General Knowledge'
  ];

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between p-6 md:p-12 max-w-2xl mx-auto">
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl md:text-5xl uppercase tracking-tight">
            Session complete
          </h1>
          <div className="font-mono text-xs text-mute mt-1 uppercase tracking-wider">
            Contestant: <span className="text-ink font-bold">{playerName || 'Contestant'}</span>
          </div>

          {/* Points & High Score highlight */}
          <div className="p-4 border border-ink bg-paper mt-4">
            <div className="flex justify-between items-baseline">
              <span className="font-mono text-xs text-mute uppercase tracking-wider">
                Total Score
              </span>
              {isNewHighScore && (
                <span className="font-mono text-xs bg-ink text-paper px-2 py-0.5 uppercase tracking-wider">
                  ★ New High Score!
                </span>
              )}
            </div>
            <div className="font-display text-4xl md:text-5xl text-ink mt-1">
              {score.points.toLocaleString()}{' '}
              <span className="font-mono text-base text-mute">PTS</span>
            </div>
            <div className="font-mono text-xs text-mute mt-1">
              High Score: {highScore.toLocaleString()} PTS
            </div>
          </div>

          <div className="pt-4 space-y-1 font-mono text-base">
            <div className="font-bold">
              {score.correct} / {score.total} correct ({overallPercentage}%)
            </div>
            <div className="text-mute text-sm">
              Avg. buzz time: {avgBuzzTime}s
            </div>
          </div>
        </div>

        {/* Category breakdowns */}
        <div className="space-y-5 pt-2 border-t border-rule">
          <div className="font-mono text-xs uppercase text-mute tracking-wider">
            Category Breakdown
          </div>

          <div className="space-y-4">
            {categoryKeys.map((catName) => {
              const catScore = score.byCategory[catName] || { correct: 0, total: 0, points: 0 };
              const percent =
                catScore.total > 0
                  ? Math.round((catScore.correct / catScore.total) * 100)
                  : 0;

              return (
                <div key={catName} className="space-y-1.5">
                  <div className="flex justify-between font-mono text-sm">
                    <span className="font-bold">{catName}</span>
                    <span className="text-mute text-xs">
                      {catScore.points.toLocaleString()} pts · {catScore.correct}/{catScore.total} ({percent}%)
                    </span>
                  </div>

                  {/* Hard-edge Progress Bar: --ink fill, --rule track */}
                  <div className="w-full h-3 bg-rule/30 border border-rule relative overflow-hidden">
                    <div
                      className="h-full bg-ink"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Advice */}
        <div className="p-4 border border-rule bg-paper font-mono text-xs text-mute space-y-1">
          <div>• Answering quickly yields maximum speed bonuses (up to 100 pts max per question).</div>
          <div>• Competition tip: State answers clearly and concisely for instant recognition.</div>
        </div>
      </div>

      {/* Practice Again Button */}
      <div className="pt-8">
        <button
          type="button"
          onClick={onRestart}
          className="w-full py-4 px-6 bg-ink text-paper font-mono text-base tracking-wider border border-ink hover:bg-ink active:opacity-90 select-none font-bold"
        >
          PRACTICE AGAIN
        </button>
      </div>
    </div>
  );
};
