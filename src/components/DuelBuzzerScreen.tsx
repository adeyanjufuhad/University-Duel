import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Question, DuelState } from '../types';
import {
  startSpeechRecognition,
  SpeechController,
  isSpeechRecognitionSupported
} from '../services/speechRecognition';

interface DuelBuzzerScreenProps {
  question: Question;
  roundNumber: number;
  totalRounds: number;
  timeLimit: number;
  duelState: DuelState;
  onAnswerLocked: (
    buzzingPlayer: 1 | 2,
    transcript: string,
    reactionTime: number
  ) => void;
  onTimeout: () => void;
  onHome: () => void;
}

export const DuelBuzzerScreen: React.FC<DuelBuzzerScreenProps> = ({
  question,
  roundNumber,
  totalRounds,
  timeLimit,
  duelState,
  onAnswerLocked,
  onTimeout,
  onHome,
}) => {
  const [countdown, setCountdown] = useState<number>(timeLimit);
  const [buzzedPlayer, setBuzzedPlayer] = useState<1 | 2 | null>(null);
  const [reactionTime, setReactionTime] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isTypingMode, setIsTypingMode] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const speechSupported = isSpeechRecognitionSupported();
  const speechControllerRef = useRef<SpeechController | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const countdownIntervalRef = useRef<number | null>(null);
  const hasLockedRef = useRef<boolean>(false);

  const p1Name = duelState.player1.name || 'Player 1';
  const p2Name = duelState.player2.name || 'Player 2';

  // Stop countdown timer
  const pauseCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Safe single-invocation lock function
  const lockAndSubmit = useCallback(
    (player: 1 | 2, ans: string, elapsed: number) => {
      if (hasLockedRef.current) return;
      hasLockedRef.current = true;

      pauseCountdown();
      setIsListening(false);

      if (speechControllerRef.current) {
        speechControllerRef.current.abort();
        speechControllerRef.current = null;
      }

      onAnswerLocked(player, ans, elapsed);
    },
    [onAnswerLocked, pauseCountdown]
  );

  // Initialize countdown on question mount
  useEffect(() => {
    hasLockedRef.current = false;
    setCountdown(timeLimit);
    setBuzzedPlayer(null);
    setIsListening(false);
    setLiveTranscript('');
    setReactionTime(0);
    setIsTypingMode(false);
    setManualText('');
    setSpeechError(null);
    startTimeRef.current = Date.now();

    // 100ms interval for smooth timer track calculation
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0.1) {
          window.clearInterval(timer);
          return 0;
        }
        return Math.max(0, Number((prev - 0.1).toFixed(1)));
      });
    }, 100);

    countdownIntervalRef.current = timer;

    return () => {
      window.clearInterval(timer);
      if (speechControllerRef.current) {
        speechControllerRef.current.abort();
        speechControllerRef.current = null;
      }
    };
  }, [question.id, timeLimit]);

  // Check for countdown zero
  useEffect(() => {
    if (countdown <= 0 && buzzedPlayer === null && !isTypingMode && !hasLockedRef.current) {
      hasLockedRef.current = true;
      pauseCountdown();
      onTimeout();
    }
  }, [countdown, buzzedPlayer, isTypingMode, onTimeout, pauseCountdown]);

  // Handle Buzz In for specific player
  const handlePlayerBuzz = (player: 1 | 2) => {
    if (buzzedPlayer !== null || isListening || hasLockedRef.current) return;

    pauseCountdown();
    const elapsed = Math.min(
      timeLimit,
      Number(((Date.now() - startTimeRef.current) / 1000).toFixed(1))
    );

    setBuzzedPlayer(player);
    setReactionTime(elapsed);
    setIsListening(true);

    if (!speechSupported) {
      setIsTypingMode(true);
      return;
    }

    // Start Web Speech API for the active buzzer
    const controller = startSpeechRecognition(
      (transcript) => {
        if (!hasLockedRef.current) {
          setLiveTranscript(transcript);
        }
      },
      (finalTranscript) => {
        const ans = (finalTranscript || liveTranscript).trim();
        lockAndSubmit(player, ans, elapsed);
      },
      (err) => {
        setSpeechError(`Microphone issue: ${err}. Switched to keyboard.`);
        setIsTypingMode(true);
      }
    );

    speechControllerRef.current = controller;
  };

  // Keyboard shortcut listener: KeyA for Player 1, KeyL for Player 2
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (buzzedPlayer !== null || isTypingMode || hasLockedRef.current) return;

      if (e.code === 'KeyA') {
        e.preventDefault();
        handlePlayerBuzz(1);
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        handlePlayerBuzz(2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [buzzedPlayer, isTypingMode]);

  // Stop Mic and Submit
  const handleStopMicAndSubmit = () => {
    if (buzzedPlayer) {
      lockAndSubmit(buzzedPlayer, liveTranscript, reactionTime || 5.0);
    }
  };

  // Switch to manual keyboard typing
  const handleSwitchToTyping = () => {
    pauseCountdown();
    if (speechControllerRef.current) {
      speechControllerRef.current.abort();
      speechControllerRef.current = null;
    }
    setIsListening(false);
    setIsTypingMode(true);
  };

  // Manual submission handler
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (buzzedPlayer) {
      lockAndSubmit(buzzedPlayer, manualText || liveTranscript, reactionTime || 5.0);
    }
  };

  // Format seconds as 00:SS
  const formatCountdown = (seconds: number) => {
    const wholeSec = Math.ceil(seconds);
    const sStr = wholeSec < 10 ? `0${wholeSec}` : `${wholeSec}`;
    return `00:${sStr}`;
  };

  const timerPercentage = Math.max(0, Math.min(100, (countdown / timeLimit) * 100));
  const categoryHeader = `${question.category.toUpperCase()} · ${question.difficulty.toUpperCase()}`;
  const activePlayerName = buzzedPlayer === 1 ? p1Name : p2Name;

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col justify-between p-6 md:p-12 max-w-4xl mx-auto">
      {/* Top Bar: Exit + Live 1v1 Scoreboard + Timer */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-mono text-xs tracking-wider border-b border-rule pb-3">
          <button
            type="button"
            onClick={onHome}
            className="border border-rule px-3 py-1 text-mute hover:text-paper hover:border-paper select-none"
          >
            ← EXIT DUEL
          </button>

          {/* Live 1v1 Scoreboard */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 border ${buzzedPlayer === 1 ? 'border-paper bg-surface' : 'border-rule'}`}>
              <span className="font-bold text-paper">{p1Name}:</span>{' '}
              <span>{duelState.player1.score} PTS</span>
            </div>
            <span className="text-mute font-bold">VS</span>
            <div className={`px-3 py-1 border ${buzzedPlayer === 2 ? 'border-paper bg-surface' : 'border-rule'}`}>
              <span className="font-bold text-paper">{p2Name}:</span>{' '}
              <span>{duelState.player2.score} PTS</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-mute">
              ROUND {roundNumber}/{totalRounds}
            </span>
            <span className="text-paper text-sm font-bold">
              {formatCountdown(countdown)}
            </span>
          </div>
        </div>

        {/* Category Header */}
        <div className="font-mono text-xs text-mute tracking-wider uppercase">
          {categoryHeader}
        </div>

        {/* Timer line track */}
        <div className="w-full bg-surface h-0.5 relative">
          <div
            className="bg-rule h-0.5"
            style={{ width: `${timerPercentage}%` }}
          />
        </div>

        {/* Question Area */}
        <div className="pt-4 pb-2">
          <h2 className="font-display text-2xl md:text-4xl leading-tight tracking-wide text-paper">
            {question.question}
          </h2>
        </div>

        {/* Shrinking Track below question */}
        <div className="w-full bg-surface h-1 relative">
          <div
            className="bg-rule h-1"
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      </div>

      {/* Duel Buzzers / Answering Floor */}
      <div className="pt-8 pb-4 space-y-4">
        {/* Race Result Banner when buzzed */}
        {buzzedPlayer !== null && (
          <div className="p-3 bg-surface border border-rule font-mono text-xs text-center">
            <span className="text-paper font-bold uppercase">{activePlayerName}</span>
            <span className="text-mute"> BUZZED IN FIRST ({reactionTime}s)! </span>
            <span className="text-mute">
              {buzzedPlayer === 1 ? p2Name : p1Name} IS LOCKED OUT.
            </span>
          </div>
        )}

        {/* If Active Player is Typing */}
        {isTypingMode && buzzedPlayer ? (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="flex justify-between items-center font-mono text-xs text-mute">
              <span>{activePlayerName}, enter your answer:</span>
              <span className="text-paper">Buzz time: {reactionTime}s</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={`Type ${activePlayerName}'s answer...`}
                autoFocus
                className="flex-1 bg-surface border border-rule text-paper px-4 py-3.5 font-mono text-sm focus:border-paper"
              />
              <button
                type="submit"
                disabled={!manualText.trim()}
                className="bg-paper text-ink font-mono text-sm px-6 py-3.5 border border-paper font-bold disabled:opacity-40 select-none"
              >
                SUBMIT
              </button>
            </div>
            {speechError && (
              <p className="font-mono text-xs text-mute">{speechError}</p>
            )}
          </form>
        ) : buzzedPlayer !== null ? (
          /* When Voice Listening is Active */
          <div className="space-y-3">
            <div className="p-4 bg-paper text-ink border border-paper font-mono text-center space-y-2">
              <div className="flex items-center justify-center gap-2 font-bold text-sm">
                <span className="inline-block w-3 h-3 bg-ink animate-mic-pulse" />
                <span>LISTENING TO {activePlayerName.toUpperCase()}…</span>
              </div>
              <div className="text-xs text-ink/80 min-h-[24px]">
                {liveTranscript ? `"${liveTranscript}"` : 'Speak your answer clearly now...'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleStopMicAndSubmit}
                className="py-2.5 px-4 bg-paper text-ink border border-paper font-mono text-xs font-bold hover:opacity-90 select-none"
              >
                [ STOP MIC & SUBMIT ]
              </button>
              <button
                type="button"
                onClick={handleSwitchToTyping}
                className="py-2.5 px-4 bg-surface text-paper border border-rule font-mono text-xs hover:border-paper select-none"
              >
                [ SWITCH TO KEYBOARD ]
              </button>
            </div>
          </div>
        ) : (
          /* Dual Buzzers Arena */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Player 1 Buzzer (Left) */}
            <button
              type="button"
              onClick={() => handlePlayerBuzz(1)}
              className="p-6 md:p-8 bg-ink text-paper border-2 border-paper hover:bg-surface active:bg-paper active:text-ink text-left space-y-2 select-none group"
            >
              <div className="flex justify-between items-baseline font-mono text-xs text-mute">
                <span>PLAYER 1</span>
                <span className="border border-rule px-1.5 py-0.5 text-paper group-hover:border-paper">
                  KEY [ A ]
                </span>
              </div>
              <div className="font-display text-xl md:text-2xl uppercase">
                {p1Name}
              </div>
              <div className="font-mono text-xs text-mute">
                TAP OR PRESS 'A' TO BUZZ IN
              </div>
            </button>

            {/* Player 2 Buzzer (Right) */}
            <button
              type="button"
              onClick={() => handlePlayerBuzz(2)}
              className="p-6 md:p-8 bg-ink text-paper border-2 border-paper hover:bg-surface active:bg-paper active:text-ink text-left space-y-2 select-none group"
            >
              <div className="flex justify-between items-baseline font-mono text-xs text-mute">
                <span>PLAYER 2</span>
                <span className="border border-rule px-1.5 py-0.5 text-paper group-hover:border-paper">
                  KEY [ L ]
                </span>
              </div>
              <div className="font-display text-xl md:text-2xl uppercase">
                {p2Name}
              </div>
              <div className="font-mono text-xs text-mute">
                TAP OR PRESS 'L' TO BUZZ IN
              </div>
            </button>
          </div>
        )}

        {buzzedPlayer === null && (
          <div className="text-center font-mono text-xs text-mute pt-2">
            First contestant to buzz locks out opponent and takes the floor.
          </div>
        )}
      </div>
    </div>
  );
};
