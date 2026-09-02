import React, { useState } from 'react';

interface NetworkDuelLobbyProps {
  code: string;
  role: 'host' | 'challenger';
  hostName: string;
  challengerName: string | null;
  settings: {
    category: string;
    difficulty: string;
    timeLimit: number;
    rounds: number;
  };
  onStart: () => void;
  onCancel: () => void;
}

export const NetworkDuelLobby: React.FC<NetworkDuelLobbyProps> = ({
  code,
  role,
  hostName,
  challengerName,
  settings,
  onStart,
  onCancel,
}) => {
  const [copied, setCopied] = useState(false);

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}` : '';

  const copyInfo = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`Join my University Duel practice match! Open ${joinUrl} and enter code: ${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between p-6 md:p-12 max-w-2xl mx-auto">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-rule pb-4">
          <div>
            <div className="font-mono text-xs text-mute uppercase tracking-widest">
              Networked 1v1 Arena
            </div>
            <h1 className="font-display text-3xl md:text-4xl uppercase tracking-tight">
              {role === 'host' ? 'Duel Host Lobby' : 'Challenger Lobby'}
            </h1>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="border border-rule px-3 py-1 font-mono text-xs text-mute hover:border-ink hover:text-ink select-none"
          >
            ← EXIT
          </button>
        </div>

        {/* 4-Digit Room Code Card */}
        <div className="p-6 md:p-8 border-2 border-ink bg-paper text-center space-y-3">
          <div className="font-mono text-xs text-mute uppercase tracking-widest">
            Room Code
          </div>
          <div className="font-display text-5xl md:text-7xl tracking-widest text-ink select-all">
            {code}
          </div>
          <p className="font-mono text-xs text-mute max-w-md mx-auto">
            Share this 4-digit code with the person on the other device.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={copyInfo}
              className="py-2 px-4 border border-ink font-mono text-xs text-ink hover:bg-ink hover:text-paper select-none"
            >
              {copied ? '[ COPIED TO CLIPBOARD! ]' : '[ COPY CODE & LINK ]'}
            </button>
          </div>
        </div>

        {/* Competitor Status */}
        <div className="space-y-3 p-4 bg-surface text-paper border border-rule font-mono text-xs">
          <div className="flex justify-between items-center border-b border-rule/50 pb-2">
            <span className="text-mute uppercase">Host (Player 1):</span>
            <span className="font-bold text-paper text-sm">{hostName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-mute uppercase">Challenger (Player 2):</span>
            {challengerName ? (
              <span className="font-bold text-paper text-sm">{challengerName}</span>
            ) : (
              <span className="text-mute flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-paper animate-mic-pulse" />
                Waiting for challenger to enter code...
              </span>
            )}
          </div>
        </div>

        {/* Match Settings Preview */}
        <div className="font-mono text-xs text-mute space-y-1">
          <div>• Category: {settings.category} · Difficulty: {settings.difficulty}</div>
          <div>• Time Limit: {settings.timeLimit}s · Match Length: {settings.rounds} questions</div>
          <div>• First device to buzz locks out opponent in real time</div>
        </div>
      </div>

      {/* Action Area */}
      <div className="pt-8">
        {role === 'host' ? (
          <button
            type="button"
            onClick={onStart}
            disabled={!challengerName}
            className="w-full py-4 px-6 bg-ink text-paper font-mono text-base tracking-wider border border-ink hover:bg-ink active:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed select-none font-bold uppercase"
          >
            {challengerName ? 'START DUEL MATCH' : 'WAITING FOR CHALLENGER…'}
          </button>
        ) : (
          <div className="text-center font-mono text-xs text-mute py-4 border border-rule">
            Connected! Waiting for host ({hostName}) to start the match…
          </div>
        )}
      </div>
    </div>
  );
};
