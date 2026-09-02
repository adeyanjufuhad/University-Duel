import React, { useEffect, useState } from 'react';
import { Verdict, ScoreState } from '../types';

interface VerdictScreenProps {
  verdict: Verdict | null;
  transcription: string;
  correctAnswer: string;
  score: ScoreState;
  buzzTime: number;
  isTimedOut?: boolean;
  onNext: () => void;
  onHome: () => void;
}

export const VerdictScreen: React.FC<VerdictScreenProps> = ({
  verdict,
  transcription,
  correctAnswer,
  score,
  buzzTime,
  isTimedOut = false,
  onNext,
  onHome,
}) => {
  const [autoAdvanceRemaining, setAutoAdvanceRemaining] = useState<number>(4);

  const isJudging = verdict === null;
  const isCorrect = verdict?.correct ?? false;

  // Auto-advance timer (4 seconds) once judging is resolved
  useEffect(() => {
    if (isJudging) return;

    setAutoAdvanceRemaining(4);
    const interval = window.setInterval(() => {
      setAutoAdvanceRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          onNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isJudging, onNext]);

  // Handle enter or spacebar to advance immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !isJudging) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isJudging, onNext]);

  // Color scheme:
  // CORRECT: screen bg is --paper (#FAFAF7), text is --ink (#0A0A0A)
  // INCORRECT: screen bg is --ink (#0A0A0A) with hatched line texture, text is --paper (#FAFAF7)
  const containerClass = isJudging
    ? 'bg-ink text-paper'
    : isCorrect
    ? 'bg-paper text-ink'
    : 'bg-hatched-dark text-paper';

  const dividerClass = isCorrect ? 'border-ink' : 'border-rule';
  const buttonClass = isCorrect
    ? 'bg-ink text-paper border-ink hover:opacity-90'
    : 'bg-paper text-ink border-paper hover:opacity-90';

  const homeBtnClass = isCorrect
    ? 'border-ink/40 text-ink/70 hover:border-ink hover:text-ink'
    : 'border-rule text-mute hover:border-paper hover:text-paper';

  return (
    <div className={`min-h-screen ${containerClass} flex flex-col justify-between p-6 md:p-12 transition-none`}>
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Top Bar with Home navigation */}
        <div className="flex justify-between items-center font-mono text-xs">
          <button
            type="button"
            onClick={onHome}
            className={`border px-3 py-1 select-none ${homeBtnClass}`}
          >
            ← HOME
          </button>
          <span className="text-mute font-mono">
            {score.points.toLocaleString()} TOTAL PTS
          </span>
        </div>

        {/* Verdict Label */}
        <div className="pt-2">
          {isJudging ? (
            <div className="font-display text-4xl md:text-6xl uppercase tracking-wider text-mute animate-pulse">
              JUDGING…
            </div>
          ) : isCorrect ? (
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                <div className="font-display text-4xl md:text-6xl uppercase tracking-tight text-ink">
                  CORRECT
                </div>
                {verdict?.pointsEarned !== undefined && (
                  <div className="font-mono text-xl md:text-2xl font-bold text-ink">
                    +{verdict.pointsEarned.toLocaleString()} PTS
                  </div>
                )}
              </div>
              {verdict?.speedBonus !== undefined && (
                <div className="font-mono text-xs text-mute">
                  Base: +{verdict.basePoints} pts · Speed bonus: +{verdict.speedBonus} pts
                </div>
              )}
            </div>
          ) : (
            <div className="font-display text-4xl md:text-6xl uppercase tracking-tight text-paper">
              {isTimedOut ? 'TIME EXPIRED' : 'INCORRECT'}
            </div>
          )}

          {/* AI Reason string (small below verdict) */}
          {!isJudging && verdict?.reason && (
            <p className="font-mono text-xs md:text-sm text-mute mt-2">
              {verdict.reason}
            </p>
          )}
        </div>

        {/* Divider */}
        <hr className={`border-t-2 ${dividerClass} w-full`} />

        {/* Q&A comparison block */}
        <div className="space-y-4 font-mono text-sm md:text-base">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <span className="text-mute w-28 shrink-0">You said:</span>
            <span className="font-bold break-words">
              {isTimedOut
                ? '(No answer — buzzer timed out)'
                : transcription
                ? `"${transcription}"`
                : '(No audible response)'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <span className="text-mute w-28 shrink-0">Answer:</span>
            <span className="font-bold">{correctAnswer}</span>
          </div>
        </div>

        {/* Stats block */}
        <div className="pt-4 space-y-2 font-mono text-sm md:text-base border-t border-rule/30">
          <div className="flex justify-between max-w-xs">
            <span className="text-mute">Score</span>
            <span className="font-bold">
              {score.correct} / {score.total}
            </span>
          </div>
          <div className="flex justify-between max-w-xs">
            <span className="text-mute">Total Points</span>
            <span className="font-bold">
              {score.points.toLocaleString()} pts
            </span>
          </div>
          <div className="flex justify-between max-w-xs">
            <span className="text-mute">Buzz time</span>
            <span className="font-bold">
              {buzzTime > 0 ? `${buzzTime.toFixed(1)}s` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="max-w-2xl mx-auto w-full pt-8 space-y-3">
        <button
          type="button"
          onClick={onNext}
          disabled={isJudging}
          className={`w-full py-4 px-6 font-mono text-base tracking-wider border font-bold select-none ${buttonClass} disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          NEXT QUESTION
        </button>

        {!isJudging && (
          <div className="text-center font-mono text-xs text-mute">
            Auto-advancing in {autoAdvanceRemaining}s · or press <kbd className="border border-mute px-1">Space</kbd>
          </div>
        )}
      </div>
    </div>
  );
};
