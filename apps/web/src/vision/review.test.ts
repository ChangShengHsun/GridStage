import { describe, expect, it } from 'vitest';
import { asymmetry, reviewFrame } from './review';

describe('reviewFrame', () => {
  it('reports per-dancer drift sorted worst-first, with signed components', () => {
    const report = reviewFrame(
      { a: { x: 3.5, y: 4 }, b: { x: 9, y: 5.2 } },
      { a: { x: 3, y: 4 }, b: { x: 9, y: 4 } },
      { axisX: 6 },
    );
    expect(report.perDancer.map((d) => d.performerId)).toEqual(['b', 'a']);
    expect(report.perDancer[0]?.offsetM).toBeCloseTo(1.2);
    expect(report.perDancer[0]?.dyM).toBeCloseTo(1.2); // drifted downstage
    expect(report.perDancer[1]?.dxM).toBeCloseTo(0.5); // drifted stage-right
    expect(report.meanOffsetM).toBeCloseTo((1.2 + 0.5) / 2);
  });

  it('ignores dancers missing from the plan', () => {
    const report = reviewFrame(
      { a: { x: 1, y: 1 }, ghost: { x: 5, y: 5 } },
      { a: { x: 1, y: 1 } },
      { axisX: 6 },
    );
    expect(report.perDancer).toHaveLength(1);
    expect(report.meanOffsetM).toBe(0);
  });

  it('measures the C dancer against the center line', () => {
    const report = reviewFrame(
      { c: { x: 6.7, y: 4 }, l: { x: 2, y: 4 } },
      { c: { x: 6, y: 4 }, l: { x: 2, y: 4 } },
      { axisX: 6, centerPerformerId: 'c' },
    );
    expect(report.centerPerformerId).toBe('c');
    expect(report.centerDxM).toBeCloseTo(0.7);
  });

  it('has no center reading when the C dancer was not detected', () => {
    const report = reviewFrame(
      { a: { x: 1, y: 1 } },
      { a: { x: 1, y: 1 } },
      {
        axisX: 6,
        centerPerformerId: 'c',
      },
    );
    expect(report.centerPerformerId).toBeNull();
    expect(report.centerDxM).toBeNull();
  });
});

describe('asymmetry', () => {
  it('is 0 for a mirror-symmetric formation', () => {
    const points = [
      { x: 4, y: 3 },
      { x: 8, y: 3 },
      { x: 6, y: 5 }, // on the axis
    ];
    expect(asymmetry(points, 6)).toBeCloseTo(0);
  });

  it('grows when one wing drifts', () => {
    const value = asymmetry(
      [
        { x: 4, y: 3 },
        { x: 8.8, y: 3 }, // should be at 8 to mirror the left dancer
      ],
      6,
    );
    expect(value).toBeGreaterThan(0.3);
  });

  it('is null with fewer than 2 dancers', () => {
    expect(asymmetry([{ x: 6, y: 4 }], 6)).toBeNull();
  });
});
