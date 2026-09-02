import React from 'react';
import { DuelState } from '../types';

interface DuelSummaryScreenProps {
  duelState: DuelState;
  totalRounds: number;
  onRematch: () => void;
  onNewMatch: () => void;
}

export const DuelSummaryScreen: React.FC<DuelSummaryScreenProps> = ({
  duelState,
  totalRounds,
  onRematch,
  onNewMatch,
}) => {
  const p1 = duelState.player1;
  const p2 = duelState.player2;

  const p1Name = p1.name || 'Player 1';
  const p2Name = p2.name || 'Player 2';

  const p1Wins = p1.score > p2.score;
  const p2Wins = p2.score > p1.score;
  const isDraw = p1.score === p2.score;

  const winnerName = p1Wins ? p1Name : p2Name;
  const margin = Math.abs(p1.score - p2.score);

  const avgReactionTime = (times: number[]) => {
    const valid = times.filter((t) => t > 0);
    return valid.length > 0
      ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) + 's'
      : '—';
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between p-6 md:p-12 max-w-3xl mx-auto">
      <div className="space-y-8">
        <div>
          <div className="font-mono text-xs text-mute uppercase tracking-widest">
            Championship Match Results
          </div>

          {/* Winner Title */}
          <h1 className="font-display text-3xl md:text-5xl uppercase tracking-tight mt-1">
            {isDraw ? 'DUEL ENDED IN A DRAW' : `${winnerName} WINS!`}
          </h1>

          {!isDraw && (
            <p className="font-mono text-sm text-mute mt-1">
              Margin of victory: {margin} points
            </p>
          )}
        </div>

        {/* Head-to-Head Scoreboard Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-5 border-2 ${p1Wins ? 'border-ink bg-paper' : 'border-rule bg-paper'} space-y-1`}>
            <div className="font-mono text-xs text-mute uppercase">Contestant 1</div>
            <div className="font-display text-2xl md:text-3xl uppercase truncate">{p1Name}</div>
            <div className="font-display text-3xl md:text-4xl text-ink pt-2">{p1.score} PTS</div>
            {p1Wins && (
              <div className="font-mono text-xs bg-ink text-paper px-2 py-0.5 inline-block uppercase mt-1">
                ★ Victor
              </div>
            )}
          </div>

          <div className={`p-5 border-2 ${p2Wins ? 'border-ink bg-paper' : 'border-rule bg-paper'} space-y-1`}>
            <div className="font-mono text-xs text-mute uppercase">Contestant 2</div>
            <div className="font-display text-2xl md:text-3xl uppercase truncate">{p2Name}</div>
            <div className="font-display text-3xl md:text-4xl text-ink pt-2">{p2.score} PTS</div>
            {p2Wins && (
              <div className="font-mono text-xs bg-ink text-paper px-2 py-0.5 inline-block uppercase mt-1">
                ★ Victor
              </div>
            )}
          </div>
        </div>

        {/* Match Statistics Comparison Table */}
        <div className="border border-rule font-mono text-xs md:text-sm">
          <div className="bg-surface text-paper p-3 font-bold uppercase tracking-wider flex justify-between">
            <span className="w-1/3 truncate">{p1Name}</span>
            <span className="w-1/3 text-center text-mute">STATISTIC</span>
            <span className="w-1/3 text-right truncate">{p2Name}</span>
          </div>

          <div className="divide-y divide-rule bg-paper text-ink">
            <div className="flex justify-between p-3">
              <span className="w-1/3 font-bold">{p1.score}</span>
              <span className="w-1/3 text-center text-mute">Total Points</span>
              <span className="w-1/3 text-right font-bold">{p2.score}</span>
            </div>

            <div className="flex justify-between p-3">
              <span className="w-1/3 font-bold">
                {p1.correctCount} / {totalRounds}
              </span>
              <span className="w-1/3 text-center text-mute">Correct Answers</span>
              <span className="w-1/3 text-right font-bold">
                {p2.correctCount} / {totalRounds}
              </span>
            </div>

            <div className="flex justify-between p-3">
              <span className="w-1/3 font-bold">{p1.buzzCount}</span>
              <span className="w-1/3 text-center text-mute">Buzzes Won</span>
              <span className="w-1/3 text-right font-bold">{p2.buzzCount}</span>
            </div>

            <div className="flex justify-between p-3">
              <span className="w-1/3 font-bold">{avgReactionTime(p1.buzzTimes)}</span>
              <span className="w-1/3 text-center text-mute">Avg. Buzz Time</span>
              <span className="w-1/3 text-right font-bold">{avgReactionTime(p2.buzzTimes)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-8 space-y-2">
        <button
          type="button"
          onClick={onRematch}
          className="w-full py-4 px-6 bg-ink text-paper font-mono text-base tracking-wider border border-ink hover:bg-ink active:opacity-90 select-none font-bold uppercase"
        >
          PLAY REMATCH
        </button>
        <button
          type="button"
          onClick={onNewMatch}
          className="w-full py-3.5 px-6 bg-paper text-ink font-mono text-xs tracking-wider border border-rule hover:border-ink select-none uppercase font-bold"
        >
          SETUP NEW DUEL
        </button>
      </div>
    </div>
  );
};
