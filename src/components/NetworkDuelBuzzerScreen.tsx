import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NetworkRoomState } from '../services/networkDuel';
import {
  startSpeechRecognition,
  SpeechController,
  isSpeechRecognitionSupported
} from '../services/speechRecognition';

interface NetworkDuelBuzzerScreenProps {
  roomState: NetworkRoomState;
  role: 'host' | 'challenger';
  onBuzz: (reactionTime: number) => void;
  onAnswer: (text: string) => void;
  onHome: () => void;
}

export const NetworkDuelBuzzerScreen: React.FC<NetworkDuelBuzzerScreenProps> = ({
  roomState,
  role,
  onBuzz,
  onAnswer,
  onHome,
}) => {
  const timeLimit = roomState.settings.timeLimit || 15;
  const [countdown, setCountdown] = useState<number>(timeLimit);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isTypingMode, setIsTypingMode] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const speechSupported = isSpeechRecognitionSupported();
  const speechControllerRef = useRef<SpeechController | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const countdownIntervalRef = useRef<number | null>(null);

  const isMyBuzz = roomState.buzzedPlayer === role;
  const isOpponentBuzz = roomState.buzzedPlayer !== null && roomState.buzzedPlayer !== role;
  const isAnswering = roomState.state === 'answering';

  const myName = role === 'host' ? roomState.hostName : roomState.challengerName || 'You';
  const opponentName = role === 'host' ? roomState.challengerName || 'Opponent' : roomState.hostName;

  const myScore = role === 'host' ? roomState.scores.host : roomState.scores.challenger;
  const opponentScore = role === 'host' ? roomState.scores.challenger : roomState.scores.host;

  // Initialize countdown on new question
  useEffect(() => {
    setCountdown(timeLimit);
    setIsListening(false);
    setLiveTranscript('');
    setIsTypingMode(false);
    setManualText('');
    setSpeechError(null);
    startTimeRef.current = Date.now();

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
  }, [roomState.index, timeLimit]);

  // When someone buzzes in, pause timer immediately
  useEffect(() => {
    if (isAnswering && countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [isAnswering]);

  // Submit Answer safe callback
  const submitAnswer = useCallback(
    (text: string) => {
      setIsListening(false);
      if (speechControllerRef.current) {
        speechControllerRef.current.abort();
        speechControllerRef.current = null;
      }
      onAnswer(text.trim());
    },
    [onAnswer]
  );

  // If this device buzzes in, start microphone listening
  useEffect(() => {
    if (isMyBuzz && isAnswering) {
      if (!speechSupported) {
        setIsTypingMode(true);
        return;
      }

      setIsListening(true);
      const controller = startSpeechRecognition(
        (transcript) => {
          setLiveTranscript(transcript);
        },
        (finalTranscript) => {
          const ans = (finalTranscript || liveTranscript).trim();
          submitAnswer(ans);
        },
        (err) => {
          setSpeechError(`Mic issue: ${err}. Switched to typing.`);
          setIsTypingMode(true);
        }
      );

      speechControllerRef.current = controller;
    }
  }, [isMyBuzz, isAnswering, speechSupported, submitAnswer, liveTranscript]);

  // Handle Buzz Action
  const handleBuzzClick = () => {
    if (roomState.state !== 'buzzing' || isAnswering) return;
    const elapsed = Math.min(
      timeLimit,
      Number(((Date.now() - startTimeRef.current) / 1000).toFixed(1))
    );
    onBuzz(elapsed);
  };

  // Keyboard shortcut: Spacebar to buzz
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && roomState.state === 'buzzing' && !isAnswering && !isTypingMode) {
        e.preventDefault();
        handleBuzzClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [roomState.state, isAnswering, isTypingMode]);

  // Manual submission handler
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitAnswer(manualText || liveTranscript);
  };

  const formatCountdown = (seconds: number) => {
    const wholeSec = Math.ceil(seconds);
    const sStr = wholeSec < 10 ? `0${wholeSec}` : `${wholeSec}`;
    return `00:${sStr}`;
  };

  const timerPercentage = Math.max(0, Math.min(100, (countdown / timeLimit) * 100));
  const currentQ = roomState.currentQuestion;

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col justify-between p-6 md:p-12 max-w-4xl mx-auto">
      {/* Top Bar: Exit + Scores + Timer */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-mono text-xs tracking-wider border-b border-rule pb-3">
          <button
            type="button"
            onClick={onHome}
            className="border border-rule px-3 py-1 text-mute hover:text-paper hover:border-paper select-none"
          >
            ← EXIT DUEL
          </button>

          {/* Live Duel Scoreboard */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 border ${isMyBuzz ? 'border-paper bg-surface' : 'border-rule'}`}>
              <span className="font-bold text-paper">{myName} (YOU):</span>{' '}
              <span>{myScore} PTS</span>
            </div>
            <span className="text-mute font-bold">VS</span>
            <div className={`px-3 py-1 border ${isOpponentBuzz ? 'border-paper bg-surface' : 'border-rule'}`}>
              <span className="font-bold text-paper">{opponentName}:</span>{' '}
              <span>{opponentScore} PTS</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-mute">
              ROUND {roomState.index + 1}/{roomState.roundsTotal}
            </span>
            <span className="text-paper text-sm font-bold">
              {formatCountdown(countdown)}
            </span>
          </div>
        </div>

        {/* Category Header */}
        <div className="font-mono text-xs text-mute tracking-wider uppercase">
          {currentQ?.category?.toUpperCase()} · {currentQ?.difficulty?.toUpperCase()}
        </div>

        {/* Timer Line Track */}
        <div className="w-full bg-surface h-0.5 relative">
          <div
            className="bg-rule h-0.5"
            style={{ width: `${timerPercentage}%` }}
          />
        </div>

        {/* Question Text */}
        <div className="pt-4 pb-2">
          <h2 className="font-display text-2xl md:text-4xl leading-tight tracking-wide text-paper">
            {currentQ?.question}
          </h2>
        </div>

        <div className="w-full bg-surface h-1 relative">
          <div
            className="bg-rule h-1"
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      </div>

      {/* Buzzer and Interaction Area */}
      <div className="pt-8 pb-4 space-y-4">
        {/* State 1: Both Devices Can Buzz */}
        {!isAnswering && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleBuzzClick}
              className="w-full py-6 md:py-8 bg-ink text-paper border-2 border-paper hover:bg-surface active:bg-paper active:text-ink font-mono text-lg md:text-xl tracking-wider select-none font-bold"
            >
              BUZZ IN — HOLD TO SPEAK
            </button>
            <div className="text-center font-mono text-xs text-mute">
              Press <kbd className="border border-rule px-1 text-paper">Space</kbd> or tap button to buzz in before your opponent!
            </div>
          </div>
        )}

        {/* State 2: You Buzzed In First! */}
        {isMyBuzz && isAnswering && (
          <div className="space-y-4">
            <div className="p-3 bg-surface border border-rule font-mono text-xs text-center text-paper">
              ⚡ YOU BUZZED IN FIRST ({roomState.buzzTime}s)! {opponentName.toUpperCase()} IS LOCKED OUT.
            </div>

            {isTypingMode ? (
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Type your answer..."
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
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-paper text-ink border border-paper font-mono text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 font-bold text-sm">
                    {isListening && <span className="inline-block w-3 h-3 bg-ink animate-mic-pulse" />}
                    <span>{isListening ? 'LISTENING TO YOUR ANSWER…' : 'EVALUATING ANSWER…'}</span>
                  </div>
                  <div className="text-xs text-ink/80 min-h-[24px]">
                    {liveTranscript ? `"${liveTranscript}"` : 'Speak into your microphone now...'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => submitAnswer(liveTranscript)}
                    className="py-2.5 px-4 bg-paper text-ink border border-paper font-mono text-xs font-bold hover:opacity-90 select-none"
                  >
                    [ STOP MIC & SUBMIT ]
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (speechControllerRef.current) speechControllerRef.current.abort();
                      setIsListening(false);
                      setIsTypingMode(true);
                    }}
                    className="py-2.5 px-4 bg-surface text-paper border border-rule font-mono text-xs hover:border-paper select-none"
                  >
                    [ SWITCH TO KEYBOARD ]
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* State 3: Opponent Buzzed In First (You Are Locked Out) */}
        {isOpponentBuzz && isAnswering && (
          <div className="p-8 bg-surface border-2 border-rule text-center space-y-3 font-mono">
            <div className="text-mute text-xs tracking-wider uppercase">
              Locked Out
            </div>
            <div className="font-display text-2xl md:text-3xl text-paper uppercase">
              {opponentName} BUZZED IN FIRST
            </div>
            <p className="text-mute text-xs">
              {opponentName} is now speaking their answer. Prepare for rebound if they miss!
            </p>
            <div className="inline-block px-3 py-1 border border-rule text-xs text-mute">
              Reaction time: {roomState.buzzTime}s
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
