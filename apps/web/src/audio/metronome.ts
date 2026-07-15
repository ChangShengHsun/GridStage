import type { CountSegment } from '@gridstage/shared-types';
import { effectiveCountSegments } from '../state/interpolate';

/**
 * Rehearsal metronome: clicks on every beat while the show plays, anchored
 * the same way the 8-count ruler is (count 1 on each segment's start; no
 * segments = counted from 0). Count 1 gets a higher-pitched accent.
 */

/** Beats falling in the half-open window (prevMs, currMs]. */
export function beatsInWindow(
  prevMs: number,
  currMs: number,
  bpm: number,
  segments: readonly CountSegment[],
): { ms: number; count: number }[] {
  if (bpm <= 0 || currMs <= prevMs) return [];
  const beatMs = 60_000 / bpm;
  const beats: { ms: number; count: number }[] = [];
  for (const seg of effectiveCountSegments(segments, Number.POSITIVE_INFINITY)) {
    const from = Math.max(prevMs, seg.startMs);
    const to = Math.min(currMs, seg.endMs);
    if (to < from) continue;
    const firstIndex = Math.max(0, Math.floor((from - seg.startMs) / beatMs));
    for (let i = firstIndex; seg.startMs + i * beatMs <= to; i++) {
      const ms = seg.startMs + i * beatMs;
      if (ms > prevMs && ms <= currMs && ms < seg.endMs) {
        beats.push({ ms, count: (i % 8) + 1 });
      }
    }
  }
  return beats;
}

let audioCtx: AudioContext | null = null;

function click(accent: boolean): void {
  audioCtx ??= new AudioContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = accent ? 1100 : 740;
  gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.07);
}

/**
 * Call once per playback frame with the previous and new playhead times.
 * ponytail: clicks fire on the frame they are crossed (≤ one frame of
 * jitter); move to AudioContext-scheduled lookahead if that ever bothers.
 */
export function tickMetronome(
  prevMs: number,
  currMs: number,
  bpm: number,
  segments: readonly CountSegment[],
): void {
  for (const beat of beatsInWindow(prevMs, currMs, bpm, segments)) {
    click(beat.count === 1);
  }
}
