import { describe, expect, it } from 'vitest';
import { beatsInWindow } from './metronome';
import type { CountSegment } from '@openstage/shared-types';

// 120 BPM = one beat every 500ms.
const BPM = 120;

describe('beatsInWindow', () => {
  it('returns beats crossed in (prev, curr], with 1-based counts cycling by 8', () => {
    const beats = beatsInWindow(400, 1600, BPM, []);
    expect(beats.map((b) => b.ms)).toEqual([500, 1000, 1500]);
    expect(beats.map((b) => b.count)).toEqual([2, 3, 4]);
  });

  it('is exclusive of prev and inclusive of curr', () => {
    expect(beatsInWindow(500, 1000, BPM, []).map((b) => b.ms)).toEqual([1000]);
  });

  it('beat 0 fires when playback starts before it', () => {
    const beats = beatsInWindow(-1, 10, BPM, []);
    expect(beats).toEqual([{ ms: 0, count: 1 }]);
  });

  it('count 1 lands on a segment start, and nothing clicks outside segments', () => {
    const segments: CountSegment[] = [{ id: 's', startMs: 2000, endMs: 3200 }];
    const beats = beatsInWindow(0, 5000, BPM, segments);
    expect(beats.map((b) => b.ms)).toEqual([2000, 2500, 3000]);
    expect(beats[0]?.count).toBe(1);
  });

  it('returns nothing for a non-advancing window or missing bpm', () => {
    expect(beatsInWindow(1000, 1000, BPM, [])).toEqual([]);
    expect(beatsInWindow(0, 1000, 0, [])).toEqual([]);
  });

  it('counts restart per segment', () => {
    const segments: CountSegment[] = [
      { id: 'a', startMs: 0, endMs: 1000 },
      { id: 'b', startMs: 1000, endMs: 2000 },
    ];
    const beats = beatsInWindow(0, 1600, BPM, segments);
    expect(beats.map((b) => b.ms)).toEqual([500, 1000, 1500]);
    // 1000ms belongs to segment b (a is half-open), so its count restarts at 1.
    expect(beats.map((b) => b.count)).toEqual([2, 1, 2]);
  });
});
