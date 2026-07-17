import { describe, expect, it } from 'vitest';
import { meanDisplacement, segmentHeldFormations } from './scan';
import type { ScanSample } from './scan';

const sample = (timelineMs: number, spots: Record<string, [number, number]>): ScanSample => ({
  timelineMs,
  positions: Object.fromEntries(Object.entries(spots).map(([id, [x, y]]) => [id, { x, y }])),
});

describe('meanDisplacement', () => {
  it('averages distances over shared dancers', () => {
    const d = meanDisplacement(
      { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
      { a: { x: 3, y: 4 }, b: { x: 10, y: 0 } },
    );
    expect(d).toBeCloseTo(2.5); // (5 + 0) / 2
  });

  it('is Infinity with no shared dancers', () => {
    expect(meanDisplacement({ a: { x: 0, y: 0 } }, { b: { x: 0, y: 0 } })).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe('segmentHeldFormations', () => {
  it('finds two holds separated by a transition', () => {
    const samples = [
      // Hold A: 0–2s at (2,3)/(10,5)
      sample(0, { a: [2, 3], b: [10, 5] }),
      sample(1000, { a: [2.1, 3], b: [10, 5.1] }),
      sample(2000, { a: [2, 3.1], b: [9.9, 5] }),
      // Transition: everyone moving
      sample(3000, { a: [4, 4], b: [8, 5.5] }),
      sample(4000, { a: [6, 5], b: [6, 6] }),
      // Hold B: 5–7s at (8,6)/(4,6.5)
      sample(5000, { a: [8, 6], b: [4, 6.5] }),
      sample(6000, { a: [8.1, 6], b: [4, 6.4] }),
      sample(7000, { a: [8, 6.1], b: [3.9, 6.5] }),
    ];
    const held = segmentHeldFormations(samples);
    expect(held).toHaveLength(2);
    expect(held[0]?.startTimeMs).toBe(0);
    expect(held[0]?.endTimeMs).toBe(2000);
    // Positions are the mean over the hold — near the nominal spot.
    expect(held[0]?.positions['a']?.x ?? NaN).toBeCloseTo(2.03, 1);
    expect(held[1]?.startTimeMs).toBe(5000);
    expect(held[1]?.positions['a']?.x ?? NaN).toBeCloseTo(8.03, 1);
  });

  it('never emits a single-sample "hold" (mid-transition snapshots)', () => {
    const held = segmentHeldFormations([
      sample(0, { a: [1, 1] }),
      sample(1000, { a: [4, 4] }),
      sample(2000, { a: [8, 8] }),
    ]);
    expect(held).toHaveLength(0);
  });

  it('merges a wobble back into the same formation', () => {
    const held = segmentHeldFormations([
      sample(0, { a: [5, 5] }),
      sample(1000, { a: [5.1, 5] }),
      // One jittery sample (detector noise), then still again at the SAME spot.
      sample(2000, { a: [5.8, 5.6] }),
      sample(3000, { a: [5.05, 5.02] }),
      sample(4000, { a: [5.1, 5.05] }),
    ]);
    expect(held).toHaveLength(1);
    expect(held[0]?.endTimeMs).toBe(4000);
  });

  it('handles the empty input', () => {
    expect(segmentHeldFormations([])).toEqual([]);
  });
});
