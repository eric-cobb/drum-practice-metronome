// Synthesized click sounds. No samples in v1 (see ARCHITECTURE.md).
//
// Pure synthesis given an AudioContext and a sample-accurate start time.
// The scheduler owns the AudioContext and the timing; this module only
// knows how to make a single click happen at a precise moment.

export type ClickType = 'accent' | 'beat' | 'sub';

interface ClickSpec {
  /** Oscillator frequency in Hz. */
  freq: number;
  /** Peak gain (0..1). */
  gain: number;
}

const CLICKS: Record<ClickType, ClickSpec> = {
  accent: { freq: 1500, gain: 0.4 }, // beat 1 / accented beats: louder + higher
  beat: { freq: 1000, gain: 0.25 }, // normal main beat
  sub: { freq: 800, gain: 0.15 }, // subdivision click: lower + quieter
};

/**
 * Schedule a single click at `time` (an AudioContext.currentTime value).
 * The short exponential gain ramp gives a crisp, percussive click.
 */
export function playClick(
  ctx: AudioContext,
  time: number,
  type: ClickType,
): void {
  const { freq, gain } = CLICKS[type];

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode).connect(ctx.destination);

  osc.type = 'square';
  osc.frequency.value = freq;

  gainNode.gain.setValueAtTime(gain, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

  osc.start(time);
  osc.stop(time + 0.05);
}

// Ascending A-major triad (A5 / C#6 / E6) — a brief, pleasant chime that's
// clearly distinct from the clicks, played when a rep target is reached.
const COMPLETION_NOTES = [880, 1108.73, 1318.51];
const COMPLETION_STEP_SEC = 0.13; // spacing between notes
const COMPLETION_NOTE_SEC = 0.32; // ring-out per note

/**
 * Schedule a short completion chime starting at `time`. Uses a softer triangle
 * tone with a gentle decay, unlike the percussive square-wave clicks.
 */
export function playCompletion(ctx: AudioContext, time: number): void {
  COMPLETION_NOTES.forEach((freq, i) => {
    const start = time + i * COMPLETION_STEP_SEC;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode).connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.value = freq;

    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      start + COMPLETION_NOTE_SEC,
    );

    osc.start(start);
    osc.stop(start + COMPLETION_NOTE_SEC);
  });
}
