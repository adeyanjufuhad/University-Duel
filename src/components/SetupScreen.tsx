import React, { useState } from 'react';
import { CATEGORIES, DIFFICULTIES, QUESTIONS } from '../data/questions';
import { GameMode } from '../types';

interface SetupScreenProps {
  mode: GameMode;
  selectedCategory: string;
  selectedDifficulty: string;
  timeLimit: number;
  highScore: number;
  playerName: string;
  player1Name: string;
  player2Name: string;
  duelRounds: number;
  duelDeviceType: 'local' | 'online';
  onlineRole: 'host' | 'join';
  joinCode: string;
  onlineJoinError?: string | null;
  onlineHostError?: string | null;
  isHostingLoading?: boolean;
  onChangeMode: (mode: GameMode) => void;
  onChangeDuelDeviceType: (type: 'local' | 'online') => void;
  onChangeOnlineRole: (role: 'host' | 'join') => void;
  onChangeJoinCode: (code: string) => void;
  onSelectCategory: (cat: string) => void;
  onSelectDifficulty: (diff: string) => void;
  onSelectTimeLimit: (seconds: number) => void;
  onChangePlayer1Name: (name: string) => void;
  onChangePlayer2Name: (name: string) => void;
  onChangeDuelRounds: (rounds: number) => void;
  onResetHighScore: () => void;
  onEditName: () => void;
  onOpenIntro: () => void;
  onStart: () => void;
  onJoinOnlineDuel: () => void;
}

const TIME_LIMIT_OPTIONS = [10, 15, 20, 30, 45, 60];
const DUEL_ROUND_OPTIONS = [5, 10, 15, 20];

export const SetupScreen: React.FC<SetupScreenProps> = ({
  mode,
  selectedCategory,
  selectedDifficulty,
  timeLimit,
  highScore,
  playerName,
  player1Name,
  player2Name,
  duelRounds,
  duelDeviceType,
  onlineRole,
  joinCode,
  onlineJoinError,
  onlineHostError,
  isHostingLoading = false,
  onChangeMode,
  onChangeDuelDeviceType,
  onChangeOnlineRole,
  onChangeJoinCode,
  onSelectCategory,
  onSelectDifficulty,
  onSelectTimeLimit,
  onChangePlayer1Name,
  onChangePlayer2Name,
  onChangeDuelRounds,
  onResetHighScore,
  onEditName,
  onOpenIntro,
  onStart,
  onJoinOnlineDuel,
}) => {
  const [resetConfirm, setResetConfirm] = useState(false);

  // Compute how many questions match
  const matchingCount = QUESTIONS.filter((q) => {
    const matchesCat =
      selectedCategory === 'All' ||
      q.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesDiff =
      selectedDifficulty === 'All' ||
      q.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();
    return matchesCat && matchesDiff;
  }).length;

  const handleResetClick = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
    } else {
      onResetHighScore();
      setResetConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between p-6 md:p-12 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight uppercase leading-none">
              University Duel
            </h1>
            <p className="font-mono text-lg text-mute mt-1">Practice Arena</p>

            {/* Contestant Identity Memory Badge */}
            <div className="flex items-center gap-2 mt-3 font-mono text-xs">
              <span className="text-mute uppercase">Contestant:</span>
              <span className="font-bold border-b border-ink">
                {playerName || 'Contestant'}
              </span>
              <button
                type="button"
                onClick={onEditName}
                className="text-mute hover:text-ink underline uppercase text-[11px] ml-1"
              >
                [ EDIT ]
              </button>
              <span className="text-rule">·</span>
              <button
                type="button"
                onClick={onOpenIntro}
                className="text-mute hover:text-ink underline uppercase text-[11px]"
              >
                [ INTRO & RULES ]
              </button>
            </div>
          </div>

          {/* High Score & Reset Card */}
          <div className="p-3 border border-ink bg-paper sm:text-right shrink-0">
            <div className="font-mono text-xs text-mute uppercase tracking-wider">
              High Score
            </div>
            <div className="font-display text-2xl text-ink">
              {highScore.toLocaleString()} <span className="font-mono text-xs text-mute">PTS</span>
            </div>
            {highScore > 0 && (
              <button
                type="button"
                onClick={handleResetClick}
                className="mt-1 font-mono text-[11px] text-mute hover:text-ink underline uppercase select-none"
              >
                {resetConfirm ? '[ CONFIRM RESET? ]' : '[ RESET ]'}
              </button>
            )}
          </div>
        </div>

        {/* Mode Selector: Solo Drill vs Duel Mode */}
        <div className="space-y-2 border-t border-b border-rule py-4">
          <h2 className="font-mono text-xs tracking-wider uppercase text-mute">
            Select Game Mode
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeMode('solo')}
              className={`py-3 px-4 font-mono text-xs sm:text-sm tracking-wider font-bold border border-ink select-none ${
                mode === 'solo'
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper text-ink border-ink hover:bg-paper'
              }`}
            >
              SOLO PRACTICE
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('duel')}
              className={`py-3 px-4 font-mono text-xs sm:text-sm tracking-wider font-bold border border-ink select-none ${
                mode === 'duel'
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper text-ink border-ink hover:bg-paper'
              }`}
            >
              DUEL MODE (1v1)
            </button>
          </div>
        </div>

        {/* Duel Mode Options */}
        {mode === 'duel' && (
          <div className="space-y-5 bg-surface text-paper p-5 border border-rule">
            {/* 1 Device vs 2 Devices Selector */}
            <div className="space-y-2">
              <div className="font-mono text-xs text-mute uppercase tracking-wider">
                Duel Setup Type
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeDuelDeviceType('online')}
                  className={`py-2 px-3 font-mono text-xs border select-none ${
                    duelDeviceType === 'online'
                      ? 'bg-paper text-ink border-paper font-bold'
                      : 'bg-ink text-paper border-rule'
                  }`}
                >
                  2 DEVICES (ROOM CODE)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDuelDeviceType('local')}
                  className={`py-2 px-3 font-mono text-xs border select-none ${
                    duelDeviceType === 'local'
                      ? 'bg-paper text-ink border-paper font-bold'
                      : 'bg-ink text-paper border-rule'
                  }`}
                >
                  1 DEVICE (PASS & PLAY)
                </button>
              </div>
            </div>

            {/* If 2 Devices Online Selected */}
            {duelDeviceType === 'online' ? (
              <div className="space-y-4 pt-2 border-t border-rule/50">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeOnlineRole('host')}
                    className={`py-2 px-3 font-mono text-xs border select-none ${
                      onlineRole === 'host'
                        ? 'bg-paper text-ink border-paper font-bold'
                        : 'bg-ink text-paper border-rule'
                    }`}
                  >
                    HOST A DUEL
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeOnlineRole('join')}
                    className={`py-2 px-3 font-mono text-xs border select-none ${
                      onlineRole === 'join'
                        ? 'bg-paper text-ink border-paper font-bold'
                        : 'bg-ink text-paper border-rule'
                    }`}
                  >
                    JOIN WITH CODE
                  </button>
                </div>

                {onlineRole === 'host' ? (
                  <div className="space-y-3 font-mono text-xs">
                    <p className="text-mute">
                      You will generate a 4-digit code. Share it with your opponent on another phone or laptop to connect live.
                    </p>
                    <div className="space-y-1">
                      <label className="text-mute uppercase">Your Contestant Name</label>
                      <input
                        type="text"
                        value={player1Name}
                        onChange={(e) => onChangePlayer1Name(e.target.value)}
                        placeholder="Host name..."
                        className="w-full bg-ink border border-rule text-paper px-3 py-2 font-mono text-sm focus:border-paper"
                      />
                    </div>
                    {onlineHostError && (
                      <p className="text-paper border border-rule p-2 bg-ink">{onlineHostError}</p>
                    )}
                    <button
                      type="button"
                      onClick={onStart}
                      disabled={isHostingLoading}
                      className="w-full py-3.5 bg-paper text-ink font-mono text-sm font-bold border border-paper hover:opacity-90 disabled:opacity-50 select-none uppercase mt-2"
                    >
                      {isHostingLoading ? 'CREATING DUEL ROOM…' : 'CREATE DUEL ROOM & GET CODE'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 font-mono text-xs">
                    <p className="text-mute">
                      Enter the 4-digit code created by the host device.
                    </p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-mute uppercase">Your Contestant Name</label>
                        <input
                          type="text"
                          value={playerName}
                          onChange={(e) => onChangePlayer2Name(e.target.value)}
                          placeholder="Your name..."
                          className="w-full bg-ink border border-rule text-paper px-3 py-2 font-mono text-sm focus:border-paper"
                        />
                      </div>
                      <div>
                        <label className="text-mute uppercase">4-Digit Duel Code</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={joinCode}
                          onChange={(e) => onChangeJoinCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 4821"
                          className="w-full bg-ink border border-rule text-paper px-3 py-3 font-mono text-lg tracking-widest text-center focus:border-paper font-bold"
                        />
                      </div>
                      {onlineJoinError && (
                        <p className="text-paper border border-rule p-2 bg-ink">{onlineJoinError}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={onJoinOnlineDuel}
                      disabled={joinCode.length !== 4}
                      className="w-full py-3 bg-paper text-ink font-mono text-sm font-bold border border-paper hover:opacity-90 disabled:opacity-40 select-none uppercase"
                    >
                      CONNECT TO DUEL
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Local 1 Device Pass & Play */
              <div className="space-y-4 pt-2 border-t border-rule/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs text-mute uppercase">
                      Player 1 (Key [A])
                    </label>
                    <input
                      type="text"
                      value={player1Name}
                      onChange={(e) => onChangePlayer1Name(e.target.value)}
                      placeholder="Player 1 name..."
                      className="w-full bg-ink border border-rule text-paper px-3 py-2 font-mono text-sm focus:border-paper"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs text-mute uppercase">
                      Player 2 (Key [L])
                    </label>
                    <input
                      type="text"
                      value={player2Name}
                      onChange={(e) => onChangePlayer2Name(e.target.value)}
                      placeholder="Player 2 name..."
                      className="w-full bg-ink border border-rule text-paper px-3 py-2 font-mono text-sm focus:border-paper"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Duel Rounds (if hosting or local) */}
            {(duelDeviceType === 'local' || onlineRole === 'host') && (
              <div className="space-y-2 pt-3 border-t border-rule/50">
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-mute uppercase">
                    Match Length (Questions)
                  </span>
                  <span className="font-mono text-xs text-mute">{duelRounds} questions</span>
                </div>
                <div className="flex gap-2">
                  {DUEL_ROUND_OPTIONS.map((rounds) => (
                    <button
                      key={rounds}
                      type="button"
                      onClick={() => onChangeDuelRounds(rounds)}
                      className={`font-mono text-xs px-4 py-2 border select-none ${
                        duelRounds === rounds
                          ? 'bg-paper text-ink border-paper font-bold'
                          : 'bg-ink text-paper border-rule hover:border-paper'
                      }`}
                    >
                      {rounds}Q
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Category & Difficulty (only shown if not in Join mode) */}
        {!(mode === 'duel' && duelDeviceType === 'online' && onlineRole === 'join') && (
          <>
            {/* Category Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <h2 className="font-mono text-sm tracking-wide text-mute">Category</h2>
                <span className="font-mono text-xs text-mute">{matchingCount} questions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => {
                  const isSelected = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => onSelectCategory(category)}
                      className={`font-mono text-xs sm:text-sm px-4 py-2.5 border border-ink text-left select-none ${
                        isSelected
                          ? 'bg-ink text-paper border-ink'
                          : 'bg-paper text-ink border-ink hover:bg-paper'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty Section */}
            <div className="space-y-3">
              <h2 className="font-mono text-sm tracking-wide text-mute">Difficulty</h2>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((difficulty) => {
                  const isSelected = selectedDifficulty === difficulty;
                  return (
                    <button
                      key={difficulty}
                      type="button"
                      onClick={() => onSelectDifficulty(difficulty)}
                      className={`font-mono text-xs sm:text-sm px-4 py-2.5 border border-ink select-none ${
                        isSelected
                          ? 'bg-ink text-paper border-ink'
                          : 'bg-paper text-ink border-ink hover:bg-paper'
                      }`}
                    >
                      {difficulty}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Limit Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <h2 className="font-mono text-sm tracking-wide text-mute">Time Limit</h2>
                <span className="font-mono text-xs text-mute">{timeLimit}s per question</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TIME_LIMIT_OPTIONS.map((seconds) => {
                  const isSelected = timeLimit === seconds;
                  return (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => onSelectTimeLimit(seconds)}
                      className={`font-mono text-xs sm:text-sm px-4 py-2.5 border border-ink select-none ${
                        isSelected
                          ? 'bg-ink text-paper border-ink'
                          : 'bg-paper text-ink border-ink hover:bg-paper'
                      }`}
                    >
                      {seconds}s
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Scoring and Rules Note */}
        <div className="pt-2 border-t border-rule font-mono text-xs text-mute space-y-1">
          <div>• Max 100 pts per question (Base 40-60 pts + up to +60 speed bonus)</div>
          <div>• Real-time buzzer lockout & rebound steals active in Duel Mode</div>
          <div>• Zero rounded corners · Inversion feedback only</div>
        </div>
      </div>

      {/* Start Button (if not in Join mode) */}
      {!(mode === 'duel' && duelDeviceType === 'online' && onlineRole === 'join') && (
        <div className="pt-8">
          <button
            type="button"
            onClick={onStart}
            disabled={matchingCount === 0}
            className="w-full font-mono text-base tracking-wider py-4 bg-ink text-paper border border-ink hover:bg-ink active:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed select-none font-bold"
          >
            {mode === 'duel' && duelDeviceType === 'online'
              ? 'CREATE DUEL ROOM'
              : mode === 'duel'
              ? 'START LOCAL DUEL'
              : 'START DRILL'}
          </button>
        </div>
      )}
    </div>
  );
};
