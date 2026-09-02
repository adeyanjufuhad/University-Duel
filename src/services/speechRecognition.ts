// Web Speech API interface definitions
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

export interface SpeechController {
  stop: () => void;
  abort: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export function startSpeechRecognition(
  onTranscriptChange: (text: string) => void,
  onComplete: (finalTranscript: string) => void,
  onError?: (err: string) => void
): SpeechController {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    if (onError) onError('Speech recognition is not supported in this browser.');
    return { stop: () => {}, abort: () => {} };
  }

  let recognition: SpeechRecognitionInstance | null = null;
  let silenceTimer: number | null = null;
  let currentTranscript = '';
  let isFinished = false;
  let restartCount = 0;
  const MAX_RESTARTS = 3;

  const cleanupTimers = () => {
    if (silenceTimer !== null) {
      window.clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  const finish = () => {
    if (isFinished) return;
    isFinished = true;
    cleanupTimers();

    try {
      recognition?.abort();
    } catch {
      // Ignore
    }

    onComplete(currentTranscript.trim());
  };

  // Snappy silence detector: 2.2s after user stops speaking
  const resetSilenceTimer = (durationMs = 2200) => {
    cleanupTimers();
    silenceTimer = window.setTimeout(() => {
      if (!isFinished && currentTranscript.trim().length > 0) {
        finish();
      }
    }, durationMs);
  };

  const initRecognition = (lang = 'en-NG') => {
    try {
      recognition = new SpeechRecognitionClass() as SpeechRecognitionInstance;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = lang;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (isFinished) return;

        let accumulated = '';
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            accumulated += item[0].transcript + ' ';
          }
        }

        const cleaned = accumulated.trim();
        if (cleaned.length > 0) {
          currentTranscript = cleaned;
          onTranscriptChange(currentTranscript);
          // When words are spoken, wait 2.2s of silence before auto-submitting
          resetSilenceTimer(2200);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (isFinished) return;
        // If language not supported, fallback to en-US
        if (event.error === 'language-not-supported' && lang !== 'en-US') {
          try {
            recognition?.abort();
          } catch {}
          initRecognition('en-US');
          return;
        }

        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          if (onError) onError(event.error);
        }
      };

      recognition.onend = () => {
        if (isFinished) return;

        // If browser ended recognition prematurely but user already spoke, submit
        if (currentTranscript.trim().length > 0) {
          finish();
        } else if (restartCount < MAX_RESTARTS) {
          // Restart to keep listening if no speech was captured yet
          restartCount++;
          try {
            recognition?.start();
          } catch {
            finish();
          }
        } else {
          finish();
        }
      };

      recognition.start();
      // Initial 8s idle timer if user says nothing at all
      resetSilenceTimer(8000);
    } catch (err: any) {
      if (lang !== 'en-US') {
        initRecognition('en-US');
      } else if (onError) {
        onError(err.message || 'Failed to initialize microphone');
      }
    }
  };

  initRecognition('en-NG');

  return {
    stop: finish,
    abort: () => {
      isFinished = true;
      cleanupTimers();
      try {
        recognition?.abort();
      } catch {}
    }
  };
}
