import React, { useState } from 'react';

interface IntroModalProps {
  initialName: string;
  onSave: (name: string) => void;
  onClose?: () => void;
  isFirstVisit?: boolean;
}

export const IntroModal: React.FC<IntroModalProps> = ({
  initialName,
  onSave,
  onClose,
  isFirstVisit = false,
}) => {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    } else {
      onSave('Contestant');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/90 flex items-center justify-center p-4">
      <div className="bg-paper text-ink border-2 border-ink max-w-lg w-full p-6 md:p-8 space-y-6 shadow-none">
        {/* Title */}
        <div className="space-y-1 border-b border-rule pb-4">
          <div className="font-mono text-xs text-mute tracking-widest uppercase">
            Official Practice Simulation
          </div>
          <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tight">
            University Duel
          </h2>
        </div>

        {/* Orientation Content */}
        <div className="space-y-3 font-mono text-xs md:text-sm text-ink leading-relaxed">
          <p>
            Welcome to the solo buzzer drill. Here you rehearse live competition questions
            under real tournament pressure using your voice or keyboard.
          </p>
          <div className="p-3 bg-surface text-paper space-y-1.5 font-mono text-xs">
            <div className="font-bold text-paper tracking-wide uppercase">
              Championship Rules:
            </div>
            <div>• Buzz in quickly: countdown pauses the instant you buzz.</div>
            <div>• Answer with voice or keyboard evaluated live by Claude 4.6.</div>
            <div>• Score up to 100 points per question (faster answers = higher speed bonus).</div>
          </div>
        </div>

        {/* Name Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label
              htmlFor="contestant-name"
              className="block font-mono text-xs text-mute uppercase tracking-wider"
            >
              Contestant Name
            </label>
            <input
              id="contestant-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name (e.g. Chidi, Aminat, Emeka)..."
              autoFocus
              className="w-full bg-paper border border-ink px-4 py-3 font-mono text-sm text-ink focus:border-2 focus:border-ink placeholder:text-mute/60"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 bg-ink text-paper font-mono text-sm tracking-wider font-bold border border-ink hover:bg-ink active:opacity-90 select-none uppercase"
            >
              {isFirstVisit ? 'ENTER PRACTICE' : 'SAVE NAME'}
            </button>
            {!isFirstVisit && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="py-3.5 px-4 border border-rule font-mono text-xs text-mute hover:text-ink hover:border-ink select-none"
              >
                CANCEL
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
