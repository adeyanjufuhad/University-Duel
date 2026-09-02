import React from 'react';
import { NetworkRoomState } from '../services/networkDuel';

interface NetworkDuelVerdictScreenProps {
  roomState: NetworkRoomState;
  role: 'host' | 'challenger';
  onRebound: () => void;
  onNext: () => void;
  onHome: () => void;
}

export const NetworkDuelVerdictScreen: React.FC<NetworkDuelVerdictScreenProps> = ({
  roomState,
  role,
  onRebound,
  onNext,
  onHome,
}) => {
  const isCorrect = roomState.verdict?.correct ?? false;
  const isHost = role === 'host';

  const buzzedRole = roomState.buzzedPlayer;
  const buzzedName = buzzedRole === 'host' ? roomState.hostName : roomState.challengerName || 'Opponent';
  const isMyAnswer = buzzedRole === role;

  const myName = isHost ? roomState.hostName : roomState.challengerName || 'You';
  const opponentName = isHost ? roomState.challengerName || 'Opponent' : roomState.hostName;

  const myScore = isHost ? roomState.scores.host : roomState.scores.challenger;
  const opponentScore = isHost ? roomState.scores.challenger : roomState.scores.host;

  const canIRebound = roomState.canRebound && roomState.reboundPlayer === role;
  const currentQ = roomState.currentQuestion;

  const containerClass = isCorrect ? 'bg-paper text-ink' : 'bg-hatched-dark text-paper';
  const dividerClass = isCorrect ? 'border-ink' : 'border-rule';

  return (
    <div className={`min-h-screen ${containerClass} flex flex-col justify-between p-6 md:p-12 transition-none`}>
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Top Bar with Scores */}
        <div className="flex justify-between items-center font-mono text-xs border-b border-rule/30 pb-3">
          <button
            type="button"
            onClick={onHome}
            className={`border px-3 py-1 select-none ${isCorrect ? 'border-ink text-ink' : 'border-rule text-mute hover:border-paper hover:text-paper'}`}
          >
            ← EXIT DUEL
          </button>

          <div className="flex items-center gap-3">
            <span className="font-bold">{myName} (YOU): {myScore} PTS</span>
            <span className="text-mute">vs</span>
            <span className="font-bold">{opponentName}: {opponentScore} PTS</span>
          </div>
        </div>

        {/* Verdict Title */}
        <div className="pt-2">
          {isCorrect ? (
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                <div className="font-display text-4xl md:text-6xl uppercase tracking-tight text-ink">
                  CORRECT
                </div>
                {roomState.verdict?.pointsEarned !== undefined && (
                  <div className="font-mono text-xl md:text-2xl font-bold text-ink">
                    +{roomState.verdict.pointsEarned} PTS
                  </div>
                )}
              </div>
              <div className="font-mono text-xs text-mute uppercase font-bold">
                {isMyAnswer ? 'You scored!' : `${buzzedName} scored!`} ({roomState.buzzTime}s reaction)
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="font-display text-4xl md:text-6xl uppercase tracking-tight text-paper">
                INCORRECT
              </div>
              <div className="font-mono text-xs text-mute uppercase">
                {isMyAnswer ? 'You missed the answer' : `${buzzedName} missed the answer`}
              </div>
            </div>
          )}

          {roomState.verdict?.reason && (
            <p className="font-mono text-xs md:text-sm text-mute mt-2">
              {roomState.verdict.reason}
            </p>
          )}
        </div>

        <hr className={`border-t-2 ${dividerClass} w-full`} />

        {/* Comparison Details */}
        <div className="space-y-4 font-mono text-sm md:text-base">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <span className="text-mute w-32 shrink-0">{buzzedName} said:</span>
            <span className="font-bold break-words">
              {roomState.transcription ? `"${roomState.transcription}"` : '(No response)'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <span className="text-mute w-32 shrink-0">Correct Answer:</span>
            <span className="font-bold">{currentQ?.answer}</span>
          </div>

          {currentQ?.explanation && (
            <div className="p-3.5 border border-rule/50 bg-surface/30 font-mono text-xs text-mute space-y-1 mt-2">
              <div className="font-bold uppercase tracking-wider text-[11px]">
                Explanation:
              </div>
              <div className="leading-relaxed">{currentQ.explanation}</div>
            </div>
          )}
        </div>

        {/* Rebound Opportunity Notice */}
        {canIRebound && (
          <div className="p-4 border border-rule bg-surface font-mono text-xs space-y-2">
            <div className="text-paper font-bold uppercase tracking-wider">
              ⚡ YOU HAVE A REBOUND STEAL OPPORTUNITY!
            </div>
            <p className="text-mute">
              {opponentName} answered incorrectly. You can buzz in right now to steal the question points!
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="max-w-2xl mx-auto w-full pt-8 space-y-3">
        {canIRebound ? (
          <button
            type="button"
            onClick={onRebound}
            className="w-full py-4 px-6 font-mono text-base tracking-wider font-bold bg-paper text-ink border border-paper hover:opacity-90 select-none uppercase"
          >
            STEAL REBOUND NOW
          </button>
        ) : isHost ? (
          <button
            type="button"
            onClick={onNext}
            className={`w-full py-4 px-6 font-mono text-base tracking-wider border font-bold select-none ${
              isCorrect ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink border-paper'
            }`}
          >
            NEXT QUESTION →
          </button>
        ) : (
          <div className="text-center font-mono text-xs text-mute py-4 border border-rule">
            Waiting for host ({roomState.hostName}) to advance to the next question…
          </div>
        )}
      </div>
    </div>
  );
};
