import React from 'react';
import { NetworkRoomState } from '../services/networkDuel';

interface NetworkDuelSummaryScreenProps {
  roomState: NetworkRoomState;
  role: 'host' | 'challenger';
  onRematch: () => void;
  onHome: () => void;
}

export const NetworkDuelSummaryScreen: React.FC<NetworkDuelSummaryScreenProps> = ({
  roomState,
  role,
  onRematch,
  onHome,
}) => {
  const isHost = role === 'host';
  const hostName = roomState.hostName;
  const challengerName = roomState.challengerName || 'Challenger';

  const hostScore = roomState.scores.host;
  const challengerScore = roomState.scores.challenger;

  const hostWins = hostScore > challengerScore;
  const challengerWins = challengerScore > hostScore;
  const isDraw = hostScore === challengerScore;

  const winnerName = hostWins ? hostName : challengerName;
  const margin = Math.abs(hostScore - challengerScore);

  const iWon = (isHost && hostWins) || (!isHost && challengerWins);

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
            Online Duel Final Results
          </div>

          <h1 className="font-display text-3xl md:text-5xl uppercase tracking-tight mt-1">
            {isDraw ? 'DUEL ENDED IN A DRAW' : iWon ? 'VICTORY! YOU WON THE DUEL!' : `${winnerName} WINS THE DUEL!`}
          </h1>

          {!isDraw && (
            <p className="font-mono text-sm text-mute mt-1">
              Margin: {margin} points
            </p>
          )}
        </div>

        {/* Head-to-Head Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-5 border-2 ${hostWins ? 'border-ink bg-paper' : 'border-rule bg-paper'} space-y-1`}>
            <div className="font-mono text-xs text-mute uppercase">Host {isHost && '(YOU)'}</div>
            <div className="font-display text-2xl md:text-3xl uppercase truncate">{hostName}</div>
            <div className="font-display text-3xl md:text-4xl text-ink pt-2">{hostScore} PTS</div>
            {hostWins && (
              <div className="font-mono text-xs bg-ink text-paper px-2 py-0.5 inline-block uppercase mt-1">
                ★ Winner
              </div>
            )}
          </div>

          <div className={`p-5 border-2 ${challengerWins ? 'border-ink bg-paper' : 'border-rule bg-paper'} space-y-1`}>
            <div className="font-mono text-xs text-mute uppercase">Challenger {!isHost && '(YOU)'}</div>
            <div className="font-display text-2xl md:text-3xl uppercase truncate">{challengerName}</div>
            <div className="font-display text-3xl md:text-4xl text-ink pt-2">{challengerScore} PTS</div>
            {challengerWins && (
              <div className="font-mono text-xs bg-ink text-paper px-2 py-0.5 inline-block uppercase mt-1">
                ★ Winner
              </div>
            )}
          </div>
        </div>

        {/* Stats Table */}
        <div className="border border-rule font-mono text-xs md:text-sm">
          <div className="bg-surface text-paper p-3 font-bold uppercase tracking-wider flex justify-between">
            <span className="w-1/3 truncate">{hostName}</span>
            <span className="w-1/3 text-center text-mute">STATISTIC</span>
            <span className="w-1/3 text-right truncate">{challengerName}</span>
          </div>

          <div className="divide-y divide-rule bg-paper text-ink">
            <div className="flex justify-between p-3">
              <span className="w-1/3 font-bold">{hostScore}</span>
              <span className="w-1/3 text-center text-mute">Total Points</span>
              <span className="w-1/3 text-right font-bold">{challengerScore}</span>
            </div>

            <div className="flex justify-between p-3">
              <span className="w-1/3 font-bold">
                {roomState.scores.hostCorrect} / {roomState.roundsTotal}
              </span>
              <span className="w-1/3 text-center text-mute">Correct Answers</span>
              <span className="w-1/3 text-right font-bold">
                {roomState.scores.challengerCorrect} / {roomState.roundsTotal}
              </span>
            </div>

            <div className="flex justify-between p-3">
              <span className="w-1/3 font-bold">{roomState.scores.hostBuzzes}</span>
              <span className="w-1/3 text-center text-mute">Buzzes Won</span>
              <span className="w-1/3 text-right font-bold">{roomState.scores.challengerBuzzes}</span>
            </div>

            <div className="flex justify-between p-3">
              <span className="w-1/3 font-bold">{avgReactionTime(roomState.scores.hostTimes)}</span>
              <span className="w-1/3 text-center text-mute">Avg. Buzz Time</span>
              <span className="w-1/3 text-right font-bold">{avgReactionTime(roomState.scores.challengerTimes)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="pt-8 space-y-2">
        {isHost ? (
          <button
            type="button"
            onClick={onRematch}
            className="w-full py-4 px-6 bg-ink text-paper font-mono text-base tracking-wider border border-ink hover:bg-ink active:opacity-90 select-none font-bold uppercase"
          >
            PLAY REMATCH
          </button>
        ) : (
          <div className="text-center font-mono text-xs text-mute py-3 border border-rule">
            Waiting for host to initiate rematch…
          </div>
        )}
        <button
          type="button"
          onClick={onHome}
          className="w-full py-3.5 px-6 bg-paper text-ink font-mono text-xs tracking-wider border border-rule hover:border-ink select-none uppercase font-bold"
        >
          EXIT DUEL ARENA
        </button>
      </div>
    </div>
  );
};
