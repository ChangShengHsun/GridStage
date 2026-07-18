/**
 * M3 first cut (docs/video-to-formation-killer-app.md): rehearsal review.
 * Given dancer positions DETECTED in a calibrated video frame and the
 * PLANNED positions at the same timeline moment, report per-dancer drift,
 * whether the designated C-spot dancer is actually on the center line, and
 * how symmetric the real formation is about that line.
 *
 * Pure math — capture/UI live elsewhere.
 */
import { hungarian } from '@gridstage/path-planner';

export interface DancerDrift {
  performerId: string;
  /** Straight-line drift from the planned spot, meters. */
  offsetM: number;
  /** Signed drift components: +x = stage right of plan, +y = downstage. */
  dxM: number;
  dyM: number;
}

export interface ReviewReport {
  /** One entry per dancer detected AND planned, worst drift first. */
  perDancer: DancerDrift[];
  meanOffsetM: number;
  /** Center check: signed distance of the C dancer from the center line. */
  centerPerformerId: string | null;
  centerDxM: number | null;
  /**
   * Mean distance between the detected formation and its own mirror image
   * about the center line (Hungarian-matched). 0 = perfectly symmetric.
   * Null with fewer than 2 dancers.
   */
  asymmetryM: number | null;
}

interface Point2 {
  x: number;
  y: number;
}

export function reviewFrame(
  detected: Readonly<Record<string, Point2>>,
  plan: Readonly<Record<string, Point2>>,
  options: { axisX: number; centerPerformerId?: string | null },
): ReviewReport {
  const perDancer: DancerDrift[] = [];
  for (const [performerId, actual] of Object.entries(detected)) {
    const planned = plan[performerId];
    if (planned === undefined) continue;
    const dxM = actual.x - planned.x;
    const dyM = actual.y - planned.y;
    perDancer.push({ performerId, offsetM: Math.hypot(dxM, dyM), dxM, dyM });
  }
  perDancer.sort((a, b) => b.offsetM - a.offsetM);
  const meanOffsetM =
    perDancer.length === 0
      ? 0
      : perDancer.reduce((sum, d) => sum + d.offsetM, 0) / perDancer.length;

  const centerId = options.centerPerformerId ?? null;
  const center = centerId !== null ? detected[centerId] : undefined;
  const centerDxM = center === undefined ? null : center.x - options.axisX;

  return {
    perDancer,
    meanOffsetM,
    centerPerformerId: center === undefined ? null : centerId,
    centerDxM,
    asymmetryM: asymmetry(Object.values(detected), options.axisX),
  };
}

/** Match the point set against its own mirror image; mean matched distance. */
export function asymmetry(points: readonly Point2[], axisX: number): number | null {
  if (points.length < 2) return null;
  const mirrored = points.map((p) => ({ x: 2 * axisX - p.x, y: p.y }));
  const cost = points.map((p) => mirrored.map((m) => Math.hypot(p.x - m.x, p.y - m.y)));
  const assignment = hungarian(cost);
  let total = 0;
  assignment.forEach((j, i) => {
    const p = points[i];
    const m = mirrored[j];
    if (p !== undefined && m !== undefined) total += Math.hypot(p.x - m.x, p.y - m.y);
  });
  return total / points.length;
}
