import { describe, expect, it } from 'vitest';
import {
  analyzeTransition,
  findCrossings,
  hungarian,
  planTransition,
  segmentsIntersect,
} from './index';
import type { PathPoint } from './index';

/** Brute-force optimal assignment for small n, to validate hungarian(). */
function bruteForce(cost: number[][]): number {
  const n = cost.length;
  const perm = Array.from({ length: n }, (_, i) => i);
  let best = Number.POSITIVE_INFINITY;
  const walk = (k: number): void => {
    if (k === n) {
      const total = perm.reduce((s, j, i) => s + (cost[i]?.[j] ?? 0), 0);
      best = Math.min(best, total);
      return;
    }
    for (let i = k; i < n; i++) {
      [perm[k], perm[i]] = [perm[i] ?? 0, perm[k] ?? 0];
      walk(k + 1);
      [perm[k], perm[i]] = [perm[i] ?? 0, perm[k] ?? 0];
    }
  };
  walk(0);
  return best;
}

function totalOf(cost: number[][], assignment: number[]): number {
  return assignment.reduce((s, j, i) => s + (cost[i]?.[j] ?? 0), 0);
}

describe('hungarian', () => {
  it('solves a known 3x3 instance optimally', () => {
    const cost = [
      [4, 1, 3],
      [2, 0, 5],
      [3, 2, 2],
    ];
    const assignment = hungarian(cost);
    expect(totalOf(cost, assignment)).toBe(5); // 1 + 2 + 2
  });

  it('matches brute force on random matrices (n=2..6)', () => {
    let seed = 42;
    const rand = (): number => {
      // deterministic LCG so failures reproduce
      seed = (seed * 1664525 + 1013904223) % 2 ** 32;
      return seed / 2 ** 32;
    };
    for (let n = 2; n <= 6; n++) {
      for (let trial = 0; trial < 5; trial++) {
        const cost = Array.from({ length: n }, () =>
          Array.from({ length: n }, () => Math.round(rand() * 100)),
        );
        const assignment = hungarian(cost);
        // valid permutation
        expect(new Set(assignment).size).toBe(n);
        expect(totalOf(cost, assignment)).toBe(bruteForce(cost));
      }
    }
  });

  it('handles n=0 and n=1', () => {
    expect(hungarian([])).toEqual([]);
    expect(hungarian([[7]])).toEqual([0]);
  });

  it('rejects non-square matrices', () => {
    expect(() => hungarian([[1, 2]])).toThrow();
  });
});

describe('planTransition', () => {
  it('keeps everyone in place when formations are identical', () => {
    const spots: PathPoint[] = [
      { x: 1, y: 1 },
      { x: 5, y: 5 },
    ];
    const plan = planTransition(spots, spots);
    expect(plan.assignment).toEqual([0, 1]);
    expect(plan.totalDistance).toBe(0);
  });

  it('untangles a swap: straight-across beats crossing', () => {
    // Two dancers on a line; targets are directly ahead of each.
    const from: PathPoint[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ];
    const to: PathPoint[] = [
      { x: 4, y: 4 }, // nearer to dancer 1
      { x: 0, y: 4 }, // nearer to dancer 0
    ];
    const plan = planTransition(from, to);
    expect(plan.assignment).toEqual([1, 0]); // no crossing
    expect(plan.totalDistance).toBeCloseTo(8);
  });

  it('rejects mismatched counts', () => {
    expect(() => planTransition([{ x: 0, y: 0 }], [])).toThrow();
  });
});

describe('segmentsIntersect / findCrossings', () => {
  it('detects a plain crossing', () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }, { x: 4, y: 0 })).toBe(
      true,
    );
  });

  it('detects touching endpoints and collinear overlap', () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 0 })).toBe(
      true,
    );
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 0 }, { x: 6, y: 0 })).toBe(
      true,
    );
  });

  it('clears parallel and distant segments', () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 1 }, { x: 4, y: 1 })).toBe(
      false,
    );
  });

  it('findCrossings reports crossing pairs but ignores shared endpoints', () => {
    const paths = [
      { from: { x: 0, y: 0 }, to: { x: 4, y: 4 } },
      { from: { x: 0, y: 4 }, to: { x: 4, y: 0 } }, // crosses path 0
      { from: { x: 4, y: 4 }, to: { x: 8, y: 8 } }, // shares an endpoint with 0
      { from: { x: 10, y: 10 }, to: { x: 11, y: 11 } }, // far away
    ];
    expect(findCrossings(paths)).toEqual([[0, 1]]);
  });

  it('catches curves that cross only because of their bends', () => {
    // Straight versions (y=0 and y=3) never meet; the bends swap them.
    const paths = [
      { from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, control: { x: 5, y: 5 } },
      { from: { x: 0, y: 3 }, to: { x: 10, y: 3 }, control: { x: 5, y: -2 } },
    ];
    expect(findCrossings(paths)).toEqual([[0, 1]]);
  });

  it('clears curves that bend away from each other', () => {
    const paths = [
      { from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, control: { x: 5, y: 2 } }, // stays y <= 1
      { from: { x: 0, y: 3 }, to: { x: 10, y: 3 }, control: { x: 5, y: 5 } }, // stays y >= 3
    ];
    expect(findCrossings(paths)).toEqual([]);
  });

  it('catches a curve sweeping through a straight line', () => {
    const paths = [
      { from: { x: 0, y: 2 }, to: { x: 10, y: 2 } }, // straight at y=2
      { from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, control: { x: 5, y: 6 } }, // peaks at y=3
    ];
    expect(findCrossings(paths)).toEqual([[0, 1]]);
  });
});

describe('analyzeTransition', () => {
  it('flags two dancers passing through the same spot at the same moment', () => {
    // Head-on swap along the same line: they meet in the middle.
    const paths = [
      { from: { x: 0, y: 0 }, to: { x: 10, y: 0 } },
      { from: { x: 10, y: 0 }, to: { x: 0, y: 0 } },
    ];
    const result = analyzeTransition(paths, 8000);
    expect(result.collisions).toEqual([[0, 1]]);
  });

  it('does not flag parallel walkers with a safe gap', () => {
    const paths = [
      { from: { x: 0, y: 0 }, to: { x: 10, y: 0 } },
      { from: { x: 0, y: 2 }, to: { x: 10, y: 2 } },
    ];
    expect(analyzeTransition(paths, 8000).collisions).toEqual([]);
  });

  it('crossing paths at DIFFERENT times are not a collision', () => {
    // B starts where A ends; they trade x-lanes but at offset positions.
    const paths = [
      { from: { x: 0, y: 0 }, to: { x: 10, y: 0 } },
      { from: { x: 10, y: 0.6 }, to: { x: 0, y: 0.6 } },
    ];
    // They DO meet mid-way (same x at t=0.5, 0.6m apart) — gap just above
    // the default 0.45m threshold, so no collision.
    expect(analyzeTransition(paths, 8000).collisions).toEqual([]);
  });

  it('flags a dancer who must run', () => {
    // 12m in 3s = 4 m/s, way over the 2 m/s default.
    const paths = [
      { from: { x: 0, y: 0 }, to: { x: 12, y: 0 } },
      { from: { x: 0, y: 2 }, to: { x: 2, y: 2 } }, // 2m in 3s is fine
    ];
    const result = analyzeTransition(paths, 3000);
    expect(result.tooFast.map((f) => f.index)).toEqual([0]);
    expect(result.tooFast[0]?.speedMps).toBeCloseTo(4, 1);
  });

  it('measures curve length along the bend, not the chord', () => {
    // Chord is 10m, but the bend makes it noticeably longer.
    const paths = [{ from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, control: { x: 5, y: 8 } }];
    const result = analyzeTransition(paths, 5000, { maxSpeedMps: 2.05 });
    // straight would be exactly 2.0 m/s -> pass; the curve pushes it over
    expect(result.tooFast).toHaveLength(1);
  });

  it('zero-duration transitions skip the speed check', () => {
    const paths = [{ from: { x: 0, y: 0 }, to: { x: 10, y: 0 } }];
    expect(analyzeTransition(paths, 0).tooFast).toEqual([]);
  });
});
