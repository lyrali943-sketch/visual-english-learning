/**
 * Audio feedback service using Web Audio API
 * Generates short UI sounds programmatically - no external files needed
 */

let audioContext: AudioContext | null = null;
let soundEnabled = true;

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.15): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail
  }
}

export const sounds = {
  click(): void {
    playTone(800, 0.08, 'sine', 0.08);
  },

  generateStart(): void {
    playTone(440, 0.15, 'sine', 0.1);
    setTimeout(() => playTone(660, 0.15, 'sine', 0.1), 100);
  },

  scroll(): void {
    playTone(1200, 0.03, 'sine', 0.04);
  },

  lock(): void {
    playTone(523, 0.12, 'sine', 0.12);
    setTimeout(() => playTone(784, 0.12, 'sine', 0.12), 120);
    setTimeout(() => playTone(1047, 0.2, 'sine', 0.12), 240);
  },

  countdownEnd(): void {
    playTone(880, 0.25, 'square', 0.08);
  },

  recordingStart(): void {
    playTone(600, 0.1, 'sine', 0.1);
    setTimeout(() => playTone(800, 0.15, 'sine', 0.1), 100);
  },

  recordingStop(): void {
    playTone(800, 0.1, 'sine', 0.1);
    setTimeout(() => playTone(600, 0.15, 'sine', 0.1), 100);
  },
};
