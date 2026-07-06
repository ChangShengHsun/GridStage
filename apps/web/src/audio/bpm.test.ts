import { describe, expect, it } from 'vitest';
import { detectBpm } from './bpm';

const RATE = 22050;

/** Deterministic white-noise generator in [-1, 1] (mulberry32 — reproducible failures). */
function makeNoise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return (((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** Deterministic click track: a sharp decaying 1kHz burst on every beat. */
function clickTrack(bpm: number, seconds: number, clickGain = 0.8, noiseGain = 0): Float32Array {
  const samples = new Float32Array(Math.floor(RATE * seconds));
  const beatPeriodS = 60 / bpm;
  const noise = makeNoise(42);
  for (let i = 0; i < samples.length; i++) {
    const tS = i / RATE;
    const sinceBeatS = tS % beatPeriodS;
    const click =
      sinceBeatS < 0.05
        ? Math.sin(2 * Math.PI * 1000 * sinceBeatS) * Math.exp(-sinceBeatS * 80) * clickGain
        : 0;
    samples[i] = click + noiseGain * noise();
  }
  return samples;
}

describe('detectBpm', () => {
  it('finds 120 BPM on a clean click track within ±2', () => {
    const result = detectBpm(clickTrack(120, 10), RATE);
    expect(result).not.toBeNull();
    expect(Math.abs((result?.bpm ?? 0) - 120)).toBeLessThanOrEqual(2);
  });

  it('finds 90 BPM within ±2', () => {
    const result = detectBpm(clickTrack(90, 10), RATE);
    expect(result).not.toBeNull();
    expect(Math.abs((result?.bpm ?? 0) - 90)).toBeLessThanOrEqual(2);
  });

  it('finds 160 BPM within ±2 (prior must not fold it to 80)', () => {
    const result = detectBpm(clickTrack(160, 10), RATE);
    expect(result).not.toBeNull();
    expect(Math.abs((result?.bpm ?? 0) - 160)).toBeLessThanOrEqual(2);
  });

  it('finds 72 BPM within ±2 (slow end of the window)', () => {
    const result = detectBpm(clickTrack(72, 12), RATE);
    expect(result).not.toBeNull();
    expect(Math.abs((result?.bpm ?? 0) - 72)).toBeLessThanOrEqual(2);
  });

  it('survives a noise floor under the clicks', () => {
    const result = detectBpm(clickTrack(128, 10, 0.8, 0.1), RATE);
    expect(result).not.toBeNull();
    expect(Math.abs((result?.bpm ?? 0) - 128)).toBeLessThanOrEqual(2);
  });

  it('returns null for silence', () => {
    expect(detectBpm(new Float32Array(RATE * 8), RATE)).toBeNull();
  });

  it('returns null for a steady tone (no rhythm)', () => {
    const samples = new Float32Array(RATE * 8);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((2 * Math.PI * 440 * i) / RATE) * 0.5;
    }
    expect(detectBpm(samples, RATE)).toBeNull();
  });

  it('returns null for unstructured noise', () => {
    const samples = new Float32Array(RATE * 8);
    const noise = makeNoise(7);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = noise() * 0.5;
    }
    expect(detectBpm(samples, RATE)).toBeNull();
  });

  it('returns null when the clip is too short to analyze', () => {
    expect(detectBpm(clickTrack(120, 2), RATE)).toBeNull();
  });
});
