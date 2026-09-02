import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ScreenType,
  GameMode,
  Question,
  ScoreState,
  FilterState,
  Verdict,
  DuelState
} from './types';
import { filterAndShufflePool } from './data/questions';
import { judgeAnswer } from './services/claudeJudge';
import {
  calculatePoints,
  getStoredHighScore,
  saveStoredHighScore,
  resetStoredHighScore
} from './utils/scoring';
import {
  getStoredPlayerName,
  saveStoredPlayerName
} from './utils/playerMemory';
import {
  createDuelRoom,
  joinDuelRoom,
  subscribeToDuelRoom,
  sendDuelAction,
  NetworkRoomState
} from './services/networkDuel';

import { SetupScreen } from './components/SetupScreen';
import { BuzzerScreen } from './components/BuzzerScreen';
import { VerdictScreen } from './components/VerdictScreen';
import { SummaryScreen } from './components/SummaryScreen';
import { IntroModal } from './components/IntroModal';
import { DuelBuzzerScreen } from './components/DuelBuzzerScreen';
import { DuelVerdictScreen } from './components/DuelVerdictScreen';
import { DuelSummaryScreen } from './components/DuelSummaryScreen';
import { NetworkDuelLobby } from './components/NetworkDuelLobby';
import { NetworkDuelBuzzerScreen } from './components/NetworkDuelBuzzerScreen';
import { NetworkDuelVerdictScreen } from './components/NetworkDuelVerdictScreen';
import { NetworkDuelSummaryScreen } from './components/NetworkDuelSummaryScreen';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenType>('setup');
  const [mode, setMode] = useState<GameMode>('solo');
  const [filters, setFilters] = useState<FilterState>({
    category: 'All',
    difficulty: 'All'
  });
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [highScore, setHighScore] = useState<number>(0);
  const [playerName, setPlayerName] = useState<string>('');
  const [player1Name, setPlayer1Name] = useState<string>('');
  const [player2Name, setPlayer2Name] = useState<string>('Challenger');
  const [duelRounds, setDuelRounds] = useState<number>(10);
  const [showIntro, setShowIntro] = useState<boolean>(false);

  // Online Duel State
  const [duelDeviceType, setDuelDeviceType] = useState<'local' | 'online'>('online');
  const [onlineRole, setOnlineRole] = useState<'host' | 'join'>('host');
  const [joinCode, setJoinCode] = useState<string>('');
  const [onlineJoinError, setOnlineJoinError] = useState<string | null>(null);
  const [networkRoomCode, setNetworkRoomCode] = useState<string>('');
  const [networkRole, setNetworkRole] = useState<'host' | 'challenger'>('host');
  const [networkRoomState, setNetworkRoomState] = useState<NetworkRoomState | null>(null);
  const sseUnsubscribeRef = useRef<(() => void) | null>(null);

  // Solo Drill State
  const [pool, setPool] = useState<Question[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [score, setScore] = useState<ScoreState>({
    correct: 0,
    total: 0,
    points: 0,
    byCategory: {}
  });
  const [buzzTimes, setBuzzTimes] = useState<number[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [lastBuzzTime, setLastBuzzTime] = useState<number>(0);
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);

  // Local Duel State
  const [duelState, setDuelState] = useState<DuelState>({
    player1: { name: 'Player 1', score: 0, correctCount: 0, buzzCount: 0, buzzTimes: [] },
    player2: { name: 'Player 2', score: 0, correctCount: 0, buzzCount: 0, buzzTimes: [] },
    roundsTotal: 10,
    activeBuzzerPlayer: null,
    isRebound: false,
    reboundPlayer: null,
    hasReboundAttempted: false
  });

  const evaluatedQuestionIndexRef = useRef<number>(-1);

  // Initialize stored high score and contestant name on load
  useEffect(() => {
    setHighScore(getStoredHighScore());
    const storedName = getStoredPlayerName();
    if (storedName) {
      setPlayerName(storedName);
      setPlayer1Name(storedName);
      setShowIntro(false);
    } else {
      setPlayer1Name('Player 1');
      setShowIntro(true);
    }

    return () => {
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
      }
    };
  }, []);

  const handleSavePlayerName = (name: string) => {
    saveStoredPlayerName(name);
    setPlayerName(name);
    setPlayer1Name(name);
    setShowIntro(false);
  };

  const handleGoHome = useCallback(() => {
    if (sseUnsubscribeRef.current) {
      sseUnsubscribeRef.current();
      sseUnsubscribeRef.current = null;
    }
    evaluatedQuestionIndexRef.current = -1;
    setScreen('setup');
    setVerdict(null);
    setTranscription('');
    setIsTimedOut(false);
    setNetworkRoomState(null);
    setOnlineJoinError(null);
  }, []);

  const handleResetHighScore = () => {
    resetStoredHighScore();
    setHighScore(0);
  };

  // ===================== ONLINE NETWORK DUEL =====================

  const handleStartOnlineDuelHost = async () => {
    try {
      setOnlineJoinError(null);
      const hName = player1Name.trim() || playerName.trim() || 'Host';
      const created = await createDuelRoom(hName, {
        category: filters.category,
        difficulty: filters.difficulty,
        timeLimit: timeLimit,
        rounds: duelRounds
      });

      setNetworkRoomCode(created.code);
      setNetworkRole('host');

      if (sseUnsubscribeRef.current) sseUnsubscribeRef.current();
      sseUnsubscribeRef.current = subscribeToDuelRoom(
        created.code,
        'host',
        (updated) => {
          setNetworkRoomState(updated);
          if (updated.state === 'lobby') setScreen('network-lobby');
          else if (updated.state === 'buzzing' || updated.state === 'answering') setScreen('network-buzzer');
          else if (updated.state === 'verdict') setScreen('network-verdict');
          else if (updated.state === 'summary') setScreen('network-summary');
        },
        () => {
          // SSE reconnects automatically
        }
      );

      setScreen('network-lobby');
    } catch (err: any) {
      setOnlineJoinError(err.message || 'Failed to create room');
    }
  };

  const handleJoinOnlineDuel = async () => {
    try {
      setOnlineJoinError(null);
      const cName = playerName.trim() || 'Challenger';
      const joined = await joinDuelRoom(joinCode.trim(), cName);

      if (joined.ok) {
        setNetworkRoomCode(joinCode.trim());
        setNetworkRole('challenger');

        if (sseUnsubscribeRef.current) sseUnsubscribeRef.current();
        sseUnsubscribeRef.current = subscribeToDuelRoom(
          joinCode.trim(),
          'challenger',
          (updated) => {
            setNetworkRoomState(updated);
            if (updated.state === 'lobby') setScreen('network-lobby');
            else if (updated.state === 'buzzing' || updated.state === 'answering') setScreen('network-buzzer');
            else if (updated.state === 'verdict') setScreen('network-verdict');
            else if (updated.state === 'summary') setScreen('network-summary');
          },
          () => {
            // reconnects automatically
          }
        );

        setScreen('network-lobby');
      }
    } catch (err: any) {
      setOnlineJoinError(err.message || 'Failed to join duel room.');
    }
  };

  const handleNetworkAction = async (action: 'start' | 'buzz' | 'answer' | 'rebound' | 'next' | 'rematch', payload?: any) => {
    if (!networkRoomCode) return;
    try {
      await sendDuelAction(networkRoomCode, networkRole, action, payload);
    } catch (err) {
      console.error(`Failed to send network action ${action}:`, err);
    }
  };

  // ===================== START DRILL DISPATCHER =====================

  const handleStartDrill = () => {
    if (mode === 'duel' && duelDeviceType === 'online') {
      if (onlineRole === 'host') {
        handleStartOnlineDuelHost();
      } else {
        handleJoinOnlineDuel();
      }
      return;
    }

    const shuffledPool = filterAndShufflePool(filters.category, filters.difficulty);
    if (shuffledPool.length === 0) return;

    evaluatedQuestionIndexRef.current = -1;

    if (mode === 'duel') {
      // Local Split Buzzer Duel
      const selectedPool = shuffledPool.slice(0, duelRounds);
      setPool(selectedPool);
      setIndex(0);
      setCurrentQuestion(selectedPool[0]);
      setDuelState({
        player1: {
          name: player1Name.trim() || 'Player 1',
          score: 0,
          correctCount: 0,
          buzzCount: 0,
          buzzTimes: []
        },
        player2: {
          name: player2Name.trim() || 'Player 2',
          score: 0,
          correctCount: 0,
          buzzCount: 0,
          buzzTimes: []
        },
        roundsTotal: Math.min(duelRounds, selectedPool.length),
        activeBuzzerPlayer: null,
        isRebound: false,
        reboundPlayer: null,
        hasReboundAttempted: false
      });
      setTranscription('');
      setVerdict(null);
      setIsTimedOut(false);
      setScreen('duel-buzzer');
    } else {
      // Solo Practice Drill
      setPool(shuffledPool);
      setIndex(0);
      setCurrentQuestion(shuffledPool[0]);
      setScore({
        correct: 0,
        total: 0,
        points: 0,
        byCategory: {}
      });
      setBuzzTimes([]);
      setTranscription('');
      setVerdict(null);
      setIsTimedOut(false);
      setScreen('buzzer');
    }
  };

  // ===================== SOLO PRACTICE HANDLERS =====================

  const handleSoloAnswerLocked = async (spokenText: string, reactionTime: number) => {
    if (!currentQuestion) return;

    if (evaluatedQuestionIndexRef.current === index) {
      return;
    }
    evaluatedQuestionIndexRef.current = index;

    setTranscription(spokenText);
    setLastBuzzTime(reactionTime);
    setBuzzTimes((prev) => [...prev, reactionTime]);
    setIsTimedOut(false);
    setVerdict(null);
    setScreen('verdict');

    try {
      const evaluation = await judgeAnswer(
        currentQuestion.question,
        currentQuestion.answer,
        spokenText
      );

      const pointCalc = calculatePoints(
        evaluation.correct,
        reactionTime,
        timeLimit,
        currentQuestion.difficulty
      );

      const evaluationWithPoints: Verdict = {
        ...evaluation,
        pointsEarned: pointCalc.totalPoints,
        basePoints: pointCalc.basePoints,
        speedBonus: pointCalc.speedBonus
      };
      setVerdict(evaluationWithPoints);

      const cat = currentQuestion.category;
      setScore((prev) => {
        const newPoints = prev.points + pointCalc.totalPoints;
        const catCurrent = prev.byCategory[cat] || { correct: 0, total: 0, points: 0 };

        const updatedHigh = saveStoredHighScore(newPoints);
        if (updatedHigh > highScore) {
          setHighScore(updatedHigh);
        }

        return {
          correct: prev.correct + (evaluation.correct ? 1 : 0),
          total: prev.total + 1,
          points: newPoints,
          byCategory: {
            ...prev.byCategory,
            [cat]: {
              correct: catCurrent.correct + (evaluation.correct ? 1 : 0),
              total: catCurrent.total + 1,
              points: catCurrent.points + pointCalc.totalPoints
            }
          }
        };
      });
    } catch {
      const fallbackVerdict: Verdict = {
        correct: false,
        reason: 'Could not reach answer judge.',
        pointsEarned: 0,
        basePoints: 0,
        speedBonus: 0
      };
      setVerdict(fallbackVerdict);
      setScore((prev) => ({
        ...prev,
        total: prev.total + 1
      }));
    }
  };

  const handleSoloTimeout = useCallback(() => {
    if (!currentQuestion) return;

    if (evaluatedQuestionIndexRef.current === index) {
      return;
    }
    evaluatedQuestionIndexRef.current = index;

    setIsTimedOut(true);
    setTranscription('');
    setLastBuzzTime(timeLimit);
    setBuzzTimes((prev) => [...prev, timeLimit]);

    const timeoutVerdict: Verdict = {
      correct: false,
      reason: `Time expired (${timeLimit}s elapsed).`,
      pointsEarned: 0,
      basePoints: 0,
      speedBonus: 0
    };
    setVerdict(timeoutVerdict);

    const cat = currentQuestion.category;
    setScore((prev) => {
      const catCurrent = prev.byCategory[cat] || { correct: 0, total: 0, points: 0 };
      return {
        correct: prev.correct,
        total: prev.total + 1,
        points: prev.points,
        byCategory: {
          ...prev.byCategory,
          [cat]: {
            correct: catCurrent.correct,
            total: catCurrent.total + 1,
            points: catCurrent.points
          }
        }
      };
    });

    setScreen('verdict');
  }, [currentQuestion, index, timeLimit]);

  const handleSoloNextQuestion = useCallback(() => {
    const nextIndex = index + 1;
    if (nextIndex < pool.length) {
      setIndex(nextIndex);
      setCurrentQuestion(pool[nextIndex]);
      setTranscription('');
      setVerdict(null);
      setIsTimedOut(false);
      setScreen('buzzer');
    } else {
      setScreen('summary');
    }
  }, [index, pool]);

  // ===================== LOCAL SPLIT DUEL HANDLERS =====================

  const handleDuelAnswerLocked = async (
    buzzingPlayer: 1 | 2,
    spokenText: string,
    reactionTime: number
  ) => {
    if (!currentQuestion) return;

    setTranscription(spokenText);
    setLastBuzzTime(reactionTime);
    setIsTimedOut(false);
    setVerdict(null);
    setDuelState((prev) => ({
      ...prev,
      activeBuzzerPlayer: buzzingPlayer
    }));
    setScreen('duel-verdict');

    try {
      const evaluation = await judgeAnswer(
        currentQuestion.question,
        currentQuestion.answer,
        spokenText
      );

      const pointCalc = calculatePoints(
        evaluation.correct,
        reactionTime,
        timeLimit,
        currentQuestion.difficulty
      );

      const evaluationWithPoints: Verdict = {
        ...evaluation,
        pointsEarned: pointCalc.totalPoints,
        basePoints: pointCalc.basePoints,
        speedBonus: pointCalc.speedBonus
      };
      setVerdict(evaluationWithPoints);

      setDuelState((prev) => {
        const isP1 = buzzingPlayer === 1;
        const p1 = prev.player1;
        const p2 = prev.player2;

        if (isP1) {
          return {
            ...prev,
            player1: {
              ...p1,
              score: p1.score + pointCalc.totalPoints,
              correctCount: p1.correctCount + (evaluation.correct ? 1 : 0),
              buzzCount: p1.buzzCount + 1,
              buzzTimes: [...p1.buzzTimes, reactionTime]
            }
          };
        } else {
          return {
            ...prev,
            player2: {
              ...p2,
              score: p2.score + pointCalc.totalPoints,
              correctCount: p2.correctCount + (evaluation.correct ? 1 : 0),
              buzzCount: p2.buzzCount + 1,
              buzzTimes: [...p2.buzzTimes, reactionTime]
            }
          };
        }
      });
    } catch {
      const fallbackVerdict: Verdict = {
        correct: false,
        reason: 'Could not connect to answer judge.',
        pointsEarned: 0,
        basePoints: 0,
        speedBonus: 0
      };
      setVerdict(fallbackVerdict);
    }
  };

  const handleDuelTimeout = useCallback(() => {
    if (!currentQuestion) return;

    setIsTimedOut(true);
    setTranscription('');
    setLastBuzzTime(timeLimit);

    const timeoutVerdict: Verdict = {
      correct: false,
      reason: `Countdown expired before either contestant buzzed in.`,
      pointsEarned: 0,
      basePoints: 0,
      speedBonus: 0
    };
    setVerdict(timeoutVerdict);
    setDuelState((prev) => ({
      ...prev,
      activeBuzzerPlayer: null
    }));

    setScreen('duel-verdict');
  }, [currentQuestion, timeLimit]);

  const handleDuelRebound = () => {
    if (!duelState.activeBuzzerPlayer) return;
    const stealingPlayer: 1 | 2 = duelState.activeBuzzerPlayer === 1 ? 2 : 1;

    setDuelState((prev) => ({
      ...prev,
      isRebound: true,
      reboundPlayer: stealingPlayer,
      hasReboundAttempted: true
    }));
    setTranscription('');
    setVerdict(null);
    setIsTimedOut(false);
    setScreen('duel-buzzer');
  };

  const handleDuelNextQuestion = useCallback(() => {
    const nextIndex = index + 1;
    if (nextIndex < pool.length && nextIndex < duelState.roundsTotal) {
      setIndex(nextIndex);
      setCurrentQuestion(pool[nextIndex]);
      setTranscription('');
      setVerdict(null);
      setIsTimedOut(false);
      setDuelState((prev) => ({
        ...prev,
        activeBuzzerPlayer: null,
        isRebound: false,
        reboundPlayer: null,
        hasReboundAttempted: false
      }));
      setScreen('duel-buzzer');
    } else {
      setScreen('duel-summary');
    }
  }, [index, pool, duelState.roundsTotal]);

  const handleDuelRematch = () => {
    handleStartDrill();
  };

  return (
    <div className="w-full min-h-screen relative">
      {/* Contestant Orientation & Name Entry Modal */}
      {showIntro && (
        <IntroModal
          initialName={playerName}
          onSave={handleSavePlayerName}
          onClose={() => setShowIntro(false)}
          isFirstVisit={!playerName}
        />
      )}

      {/* SETUP / HOME SCREEN */}
      {screen === 'setup' && (
        <SetupScreen
          mode={mode}
          selectedCategory={filters.category}
          selectedDifficulty={filters.difficulty}
          timeLimit={timeLimit}
          highScore={highScore}
          playerName={playerName}
          player1Name={player1Name}
          player2Name={player2Name}
          duelRounds={duelRounds}
          duelDeviceType={duelDeviceType}
          onlineRole={onlineRole}
          joinCode={joinCode}
          onlineJoinError={onlineJoinError}
          onChangeMode={(newMode) => setMode(newMode)}
          onChangeDuelDeviceType={(t) => setDuelDeviceType(t)}
          onChangeOnlineRole={(r) => setOnlineRole(r)}
          onChangeJoinCode={(c) => setJoinCode(c)}
          onSelectCategory={(cat) =>
            setFilters((prev) => ({ ...prev, category: cat }))
          }
          onSelectDifficulty={(diff) =>
            setFilters((prev) => ({ ...prev, difficulty: diff }))
          }
          onSelectTimeLimit={(seconds) => setTimeLimit(seconds)}
          onChangePlayer1Name={(name) => setPlayer1Name(name)}
          onChangePlayer2Name={(name) => setPlayer2Name(name)}
          onChangeDuelRounds={(r) => setDuelRounds(r)}
          onResetHighScore={handleResetHighScore}
          onEditName={() => setShowIntro(true)}
          onOpenIntro={() => setShowIntro(true)}
          onStart={handleStartDrill}
          onJoinOnlineDuel={handleJoinOnlineDuel}
        />
      )}

      {/* SOLO PRACTICE SCREENS */}
      {screen === 'buzzer' && currentQuestion && (
        <BuzzerScreen
          question={currentQuestion}
          questionNumber={index + 1}
          totalQuestions={pool.length}
          timeLimit={timeLimit}
          currentPoints={score.points}
          playerName={playerName}
          onAnswerLocked={handleSoloAnswerLocked}
          onTimeout={handleSoloTimeout}
          onHome={handleGoHome}
        />
      )}

      {screen === 'verdict' && currentQuestion && (
        <VerdictScreen
          verdict={verdict}
          transcription={transcription}
          correctAnswer={currentQuestion.answer}
          score={score}
          buzzTime={lastBuzzTime}
          explanation={currentQuestion.explanation}
          isTimedOut={isTimedOut}
          onNext={handleSoloNextQuestion}
          onHome={handleGoHome}
        />
      )}

      {screen === 'summary' && (
        <SummaryScreen
          score={score}
          buzzTimes={buzzTimes}
          highScore={highScore}
          playerName={playerName}
          onRestart={handleGoHome}
        />
      )}

      {/* LOCAL SPLIT DUEL SCREENS */}
      {screen === 'duel-buzzer' && currentQuestion && (
        <DuelBuzzerScreen
          question={currentQuestion}
          roundNumber={index + 1}
          totalRounds={duelState.roundsTotal}
          timeLimit={timeLimit}
          duelState={duelState}
          onAnswerLocked={handleDuelAnswerLocked}
          onTimeout={handleDuelTimeout}
          onHome={handleGoHome}
        />
      )}

      {screen === 'duel-verdict' && currentQuestion && (
        <DuelVerdictScreen
          verdict={verdict}
          transcription={transcription}
          correctAnswer={currentQuestion.answer}
          answeringPlayer={duelState.activeBuzzerPlayer}
          duelState={duelState}
          buzzTime={lastBuzzTime}
          explanation={currentQuestion.explanation}
          isTimedOut={isTimedOut}
          canRebound={
            Boolean(verdict && !verdict.correct && !duelState.hasReboundAttempted && duelState.activeBuzzerPlayer)
          }
          onNext={handleDuelNextQuestion}
          onRebound={handleDuelRebound}
          onHome={handleGoHome}
        />
      )}

      {screen === 'duel-summary' && (
        <DuelSummaryScreen
          duelState={duelState}
          totalRounds={duelState.roundsTotal}
          onRematch={handleDuelRematch}
          onNewMatch={handleGoHome}
        />
      )}

      {/* ONLINE NETWORK DUEL SCREENS (2 DEVICES VIA CODE) */}
      {screen === 'network-lobby' && networkRoomState && (
        <NetworkDuelLobby
          code={networkRoomCode}
          role={networkRole}
          hostName={networkRoomState.hostName}
          challengerName={networkRoomState.challengerName}
          settings={networkRoomState.settings}
          onStart={() => handleNetworkAction('start')}
          onCancel={handleGoHome}
        />
      )}

      {screen === 'network-buzzer' && networkRoomState && networkRoomState.currentQuestion && (
        <NetworkDuelBuzzerScreen
          roomState={networkRoomState}
          role={networkRole}
          onBuzz={(reactionTime) => handleNetworkAction('buzz', { reactionTime })}
          onAnswer={(text) => handleNetworkAction('answer', { text })}
          onHome={handleGoHome}
        />
      )}

      {screen === 'network-verdict' && networkRoomState && (
        <NetworkDuelVerdictScreen
          roomState={networkRoomState}
          role={networkRole}
          onRebound={() => handleNetworkAction('rebound')}
          onNext={() => handleNetworkAction('next')}
          onHome={handleGoHome}
        />
      )}

      {screen === 'network-summary' && networkRoomState && (
        <NetworkDuelSummaryScreen
          roomState={networkRoomState}
          role={networkRole}
          onRematch={() => handleNetworkAction('rematch')}
          onHome={handleGoHome}
        />
      )}
    </div>
  );
};
