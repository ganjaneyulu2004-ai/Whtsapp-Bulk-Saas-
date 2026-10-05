/**
 * Web Audio API synthesizer for interactive button sounds and celebration chimes.
 * No external audio files or downloads required.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Pleasant modern click / pop sound for interactive chips and buttons
 */
export function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch {}
}

/**
 * Joyous celebration fanfare / victory chime for test message success
 */
export function playCelebrationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.25 }, // C5
      { freq: 659.25, time: 0.09, dur: 0.25 }, // E5
      { freq: 783.99, time: 0.18, dur: 0.35 }, // G5
      { freq: 1046.50, time: 0.28, dur: 0.65 }, // C6 (grand finish)
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
    masterGain.connect(ctx.destination);

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.value = note.freq;

      const startTime = ctx.currentTime + note.time;
      const endTime = startTime + note.dur;

      noteGain.gain.setValueAtTime(0.001, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.03);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(endTime);
    });

    // Add extra chime shimmer after 0.3s
    setTimeout(() => {
      if (!ctx) return;
      const sparkleOsc = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkleOsc.type = "sine";
      sparkleOsc.frequency.setValueAtTime(1318.5, ctx.currentTime); // E6
      sparkleGain.gain.setValueAtTime(0.2, ctx.currentTime);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(ctx.destination);
      sparkleOsc.start();
      sparkleOsc.stop(ctx.currentTime + 0.4);
    }, 320);
  } catch {}
}
