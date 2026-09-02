import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Question } from '../types';
import {
  startSpeechRecognition,
  SpeechController,
  isSpeechRecognitionSupported
} from '../services/speechRecognition';

interface BuzzerScreenProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  timeLimit: number;
  currentPoints: number;
  playerName?: string;
  onAnswerLocked: (transcript: string, reactionTime: number) => void;
  onTimeout: () => void;
  onHome: () => void;
}

export const BuzzerScreen: React.FC<BuzzerScreenProps> = ({
  question,
  questionNumber,
  totalQuestions,
  timeLimit,
  currentPoints,
  playerName,
  onAnswerLocked,
  onTimeout,
  onHome,
}) => {
  const [countdown, setCountdown] = useState<number>(timeLimit);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [hasBuzzed, setHasBuzzed] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [reactionTime, setReactionTime] = useState<number>(0);
  const [isTypingMode, setIsTypingMode] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const speechSupported = isSpeechRecognitionSupported();
  const speechControllerRef = useRef<SpeechController | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const countdownIntervalRef = useRef<number | null>(null);
  const hasLockedRef = useRef<boolean>(false);

  // Stop countdown timer
  const pauseCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Safe single-invocation lock function
  const lockAndSubmit = useCallback(
    (ans: string, elapsed: number) => {
      if (hasLockedRef.current) return;
      hasLockedRef.current = true;

      pauseCountdown();
      setIsListening(false);

      if (speechControllerRef.current) {
        speechControllerRef.current.abort();
        speechControllerRef.current = null;
      }

      onAnswerLocked(ans, elapsed);
    },
    [onAnswerLocked, pauseCountdown]
  );

  // Initialize countdown on question mount
  useEffect(() => {
    hasLockedRef.current = false;
    setCountdown(timeLimit);
    setHasBuzzed(false);
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
    if (countdown <= 0 && !hasBuzzed && !isTypingMode && !hasLockedRef.current) {
      hasLockedRef.current = true;
      pauseCountdown();
      onTimeout();
    }
  }, [countdown, hasBuzzed, isTypingMode, onTimeout, pauseCountdown]);

  // Handle Buzz In action (Hold or Tap to speak)
  const handleBuzzIn = () => {
    if (hasBuzzed || isListening || hasLockedRef.current) return;

    pauseCountdown();
    const elapsed = Math.min(
      timeLimit,
      Number(((Date.now() - startTimeRef.current) / 1000).toFixed(1))
    );
    setReactionTime(elapsed);
    setHasBuzzed(true);
    setIsListening(true);

    if (!speechSupported) {
      setIsTypingMode(true);
      return;
    }

    // Start Web Speech API
    const controller = startSpeechRecognition(
      (transcript) => {
        if (!hasLockedRef.current) {
          setLiveTranscript(transcript);
        }
      },
      (finalTranscript) => {
        const ans = (finalTranscript || liveTranscript).trim();
        lockAndSubmit(ans, elapsed);
      },
      (err) => {
        setSpeechError(`Microphone issue: ${err}. Switched to keyboard.`);
        setIsTypingMode(true);
      }
    );

    speechControllerRef.current = controller;
  };

  // Stop Mic and Submit whatever has been said so far (only calls lockAndSubmit once!)
  const handleStopMicAndSubmit = () => {
    lockAndSubmit(liveTranscript, reactionTime || 5.0);
  };

  // Cancel mic and switch to typing
  const handleSwitchToTyping = () => {
    pauseCountdown();
    if (!hasBuzzed) {
      const elapsed = Math.min(
        timeLimit,
        Number(((Date.now() - startTimeRef.current) / 1000).toFixed(1))
      );
      setReactionTime(elapsed);
      setHasBuzzed(true);
    }
    if (speechControllerRef.current) {
      speechControllerRef.current.abort();
      speechControllerRef.current = null;
    }
    setIsListening(false);
    setIsTypingMode(true);
  };

  // Keyboard shortcut: Spacebar to buzz in
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !hasBuzzed && !isTypingMode && !hasLockedRef.current) {
        e.preventDefault();
        handleBuzzIn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasBuzzed, isTypingMode]);

  // Format seconds as 00:SS
  const formatCountdown = (seconds: number) => {
    const wholeSec = Math.ceil(seconds);
    const sStr = wholeSec < 10 ? `0${wholeSec}` : `${wholeSec}`;
    return `00:${sStr}`;
  };

  // Timer line percentage
  const timerPercentage = Math.max(0, Math.min(100, (countdown / timeLimit) * 100));

  // Category display formatting
  const categoryHeader = `${question.category.toUpperCase()} · ${question.difficulty.toUpperCase()}`;

  // Manual submission handler
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lockAndSubmit(manualText || liveTranscript, reactionTime || 5.0);
  };

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col justify-between p-6 md:p-12 max-w-3xl mx-auto">
      {/* Top Bar: Back to Home + Category + Points + Formatted Timer */}
      <div className="space-y-6">
        <div className="flex justify-between items-center font-mono text-sm tracking-wider">
          <button
            type="button"
            onClick={onHome}
            className="border border-rule px-3 py-1 text-xs text-mute hover:text-paper hover:border-paper select-none"
          >
            ← HOME
          </button>

          <div className="flex items-center gap-2 sm:gap-4">
            {playerName && (
              <span className="text-mute text-xs hidden md:inline uppercase border-b border-rule pb-0.5">
                {playerName}
              </span>
            )}
            <span className="text-paper font-bold text-xs sm:text-sm border border-rule px-2 py-0.5 bg-surface">
              {currentPoints.toLocaleString()} PTS
            </span>
            <span className="text-mute text-xs hidden sm:inline">
              Q{questionNumber}/{totalQuestions}
            </span>
            <span className="text-paper text-sm sm:text-base font-bold">
              {formatCountdown(countdown)}
            </span>
          </div>
        </div>

        {/* Category & Difficulty Line */}
        <div className="font-mono text-xs text-mute tracking-wider uppercase">
          {categoryHeader}
        </div>

        {/* Timer line track shrinking left-to-right */}
        <div className="w-full bg-surface h-0.5 relative">
          <div
            className="bg-rule h-0.5"
            style={{ width: `${timerPercentage}%` }}
          />
        </div>

        {/* Question Area */}
        <div className="pt-6 pb-4">
          <h2 className="font-display text-2xl md:text-4xl leading-tight tracking-wide text-paper">
            {question.question}
          </h2>
        </div>

        {/* Shrinking Rule Track under question as specified */}
        <div className="w-full bg-surface h-1 relative">
          <div
            className="bg-rule h-1"
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      </div>

      {/* Buzzer, Speech & Typing Interaction Area */}
      <div className="pt-10 pb-6 space-y-4">
        {/* If user is in Typing Mode */}
        {isTypingMode ? (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="flex justify-between items-center font-mono text-xs text-mute">
              <span>Type your answer below:</span>
              <span className="text-paper">Buzz time: {reactionTime}s</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Enter answer (e.g. ₦640,000 or sixty four thousand)..."
                autoFocus
                className="flex-1 bg-surface border border-rule text-paper px-4 py-3.5 font-mono text-sm focus:border-paper"
              />
              <button
                type="submit"
                disabled={!manualText.trim()}
                className="bg-paper text-ink font-mono text-sm px-6 py-3.5 border border-paper font-bold disabled:opacity-40 disabled:cursor-not-allowed select-none"
              >
                SUBMIT
              </button>
            </div>
            {speechError && (
              <p className="font-mono text-xs text-mute">{speechError}</p>
            )}
          </form>
        ) : (
          <>
            {/* Full-width Buzzer Button */}
            <button
              type="button"
              onClick={handleBuzzIn}
              disabled={hasBuzzed && !isListening}
              className={`w-full py-5 px-6 font-mono text-base md:text-lg tracking-wider border select-none flex items-center justify-center gap-3 ${
                isListening
                  ? 'bg-paper text-ink border-paper'
                  : hasBuzzed
                  ? 'bg-surface text-mute border-rule cursor-default'
                  : 'bg-ink text-paper border-paper hover:bg-surface active:bg-paper active:text-ink'
              }`}
            >
              {isListening ? (
                <>
                  {/* Pulsing indicator dot */}
                  <span className="inline-block w-3 h-3 bg-ink animate-mic-pulse" />
                  <span>LISTENING…</span>
                </>
              ) : hasBuzzed ? (
                <span>ANSWER LOCKED</span>
              ) : (
                <span>BUZZ IN — HOLD TO SPEAK</span>
              )}
            </button>

            {/* Instruction hint */}
            {!hasBuzzed && (
              <div className="flex justify-between items-center font-mono text-xs text-mute pt-1">
                <span>
                  Press <kbd className="border border-rule px-1 text-paper">Space</kbd> or click to buzz
                </span>
                <button
                  type="button"
                  onClick={handleSwitchToTyping}
                  className="underline hover:text-paper"
                >
                  Type answer instead
                </button>
              </div>
            )}

            {/* Live Transcription Box */}
            {hasBuzzed && (
              <div className="min-h-[52px] p-3.5 border border-rule bg-surface font-mono text-xs text-mute flex flex-col justify-center">
                {liveTranscript ? (
                  <span className="text-paper text-sm">"{liveTranscript}"</span>
                ) : isListening ? (
                  <span>Listening for spoken answer... Speak clearly into your mic</span>
                ) : (
                  <span>Evaluating answer...</span>
                )}
              </div>
            )}

            {/* Mic Controls while Listening: Stop Mic or Switch to Typing */}
            {isListening && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
            )}
          </>
        )}
      </div>
    </div>
  );
};
