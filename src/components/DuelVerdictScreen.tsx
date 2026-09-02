import React, { useEffect, useState } from 'react';
import { Verdict, DuelState } from '../types';

interface DuelVerdictScreenProps {
  verdict: Verdict | null;
  transcription: string;
  correctAnswer: string;
  answeringPlayer: 1 | 2 | null;
  duelState: DuelState;
  buzzTime: number;
  isTimedOut?: boolean;
  canRebound: boolean;
  onNext: () => void;
  onRebound: () => void;
  onHome: () => void;
}

export const DuelVerdictScreen: React.FC<DuelVerdictScreenProps> = ({
  verdict,
  transcription,
  correctAnswer,
  answeringPlayer,
  duelState,
  buzzTime,
  isTimedOut = false,
  canRebound,
  onNext,
  onRebound,
  onHome,
}) => {
  const [autoAdvanceRemaining, setAutoAdvanceRemaining] = useState<number>(5);

  const isJudging = verdict === null;
  const isCorrect = verdict?.correct ?? false;

  const p1Name = duelState.player1.name || 'Player 1';
  const p2Name = duelState.player2.name || 'Player 2';
  const answeringName = answeringPlayer === 1 ? p1Name : answeringPlayer === 2 ? p2Name : 'Neither';
  const opponentName = answeringPlayer === 1 ? p2Name : p1Name;

  // Auto-advance timer only if correct or if rebound is not available
  useEffect(() => {
    if (isJudging || canRebound) return;

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
  }, [isJudging, canRebound, onNext]);

  // Handle enter or spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isJudging) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (canRebound) {
          onRebound();
        } else {
          onNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isJudging, canRebound, onNext, onRebound]);

  // Color scheme
  const containerClass = isJudging
    ? 'bg-ink text-paper'
    : isCorrect
    ? 'bg-paper text-ink'
    : 'bg-hatched-dark text-paper';

  const dividerClass = isCorrect ? 'border-ink' : 'border-rule';
  const buttonClass = isCorrect
    ? 'bg-ink text-paper border-ink hover:opacity-90'
    : 'bg-paper text-ink border-paper hover:opacity-90';

  return (
    <div className={`min-h-screen ${containerClass} flex flex-col justify-between p-6 md:p-12 transition-none`}>
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Top Bar with Live Duel Score */}
        <div className="flex justify-between items-center font-mono text-xs border-b border-rule/30 pb-3">
          <button
            type="button"
            onClick={onHome}
            className={`border px-3 py-1 select-none ${isCorrect ? 'border-ink text-ink' : 'border-rule text-mute hover:border-paper hover:text-paper'}`}
          >
            ← EXIT DUEL
          </button>

          <div className="flex items-center gap-3">
            <span className="font-bold">{p1Name}: {duelState.player1.score} PTS</span>
            <span className="text-mute">vs</span>
            <span className="font-bold">{p2Name}: {duelState.player2.score} PTS</span>
          </div>
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
              <div className="font-mono text-xs text-mute uppercase font-bold">
                Point awarded to: {answeringName} ({buzzTime.toFixed(1)}s reaction)
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="font-display text-4xl md:text-6xl uppercase tracking-tight text-paper">
                {isTimedOut ? 'TIME EXPIRED' : 'INCORRECT'}
              </div>
              {answeringPlayer && (
                <div className="font-mono text-xs text-mute uppercase">
                  {answeringName} missed the question (0 pts)
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          {!isJudging && verdict?.reason && (
            <p className="font-mono text-xs md:text-sm text-mute mt-2">
              {verdict.reason}
            </p>
          )}
        </div>

        {/* Divider */}
        <hr className={`border-t-2 ${dividerClass} w-full`} />

        {/* Comparison Block */}
        <div className="space-y-4 font-mono text-sm md:text-base">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <span className="text-mute w-32 shrink-0">{answeringName} said:</span>
            <span className="font-bold break-words">
              {isTimedOut
                ? '(No buzzer buzz in time)'
                : transcription
                ? `"${transcription}"`
                : '(No audible response)'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <span className="text-mute w-32 shrink-0">Correct Answer:</span>
            <span className="font-bold">{correctAnswer}</span>
          </div>
        </div>

        {/* Rebound Opportunity Box */}
        {canRebound && !isJudging && (
          <div className="p-4 border border-rule bg-surface font-mono text-xs space-y-2">
            <div className="text-paper font-bold uppercase tracking-wider">
              ⚡ REBOUND CHANCE FOR {opponentName.toUpperCase()}!
            </div>
            <p className="text-mute">
              {answeringName} missed. {opponentName} has a chance to steal this question for points.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Area */}
      <div className="max-w-2xl mx-auto w-full pt-8 space-y-3">
        {canRebound && !isJudging ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRebound}
              className="w-full py-4 px-6 font-mono text-sm tracking-wider font-bold bg-paper text-ink border border-paper hover:opacity-90 select-none"
            >
              STEAL REBOUND ({opponentName.toUpperCase()})
            </button>
            <button
              type="button"
              onClick={onNext}
              className="w-full py-4 px-6 font-mono text-sm tracking-wider border border-rule font-bold text-paper hover:border-paper select-none"
            >
              SKIP TO NEXT QUESTION
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={isJudging}
            className={`w-full py-4 px-6 font-mono text-base tracking-wider border font-bold select-none ${buttonClass} disabled:opacity-30`}
          >
            NEXT QUESTION
          </button>
        )}

        {!isJudging && !canRebound && (
          <div className="text-center font-mono text-xs text-mute">
            Auto-advancing in {autoAdvanceRemaining}s · or press <kbd className="border border-mute px-1">Space</kbd>
          </div>
        )}
      </div>
    </div>
  );
};
