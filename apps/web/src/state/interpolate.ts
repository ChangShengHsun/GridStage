import type { Formation, FormationPosition } from '@openstage/shared-types';
import type { PositionMap } from './store';

export interface StagePose {
  x: number;
  y: number;
  rotation: number;
}

export function byOrder(formations: readonly Formation[]): Formation[] {
  return [...formations].sort((a, b) => a.orderIndex - b.orderIndex);
}

/** Shortest-arc interpolation between two angles in degrees (ties go clockwise). */
export function lerpAngle(a: number, b: number, t: number): number {
  let delta = (((b - a) % 360) + 360) % 360; // [0, 360)
  if (delta > 180) delta -= 360; // (-180, 180]
  return (((a + delta * t) % 360) + 360) % 360;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function quadBezier(p0: number, c: number, p1: number, t: number): number {
  const inv = 1 - t;
  return inv * inv * p0 + 2 * inv * t * c + t * t * p1;
}

function poseOf(pos: FormationPosition): StagePose {
  return { x: pos.x, y: pos.y, rotation: pos.rotation };
}

/**
 * Where is every performer at time `tMs`?
 *
 * Inside a formation's hold window the pose is that formation's stored
 * position; between one formation's hold end and the next formation's start
 * the pose interpolates linearly (rotation via shortest arc). Before the
 * first formation and after the last, poses are pinned to the nearest one.
 */
export function posesAtTime(
  formations: readonly Formation[],
  positions: PositionMap,
  tMs: number,
): Map<string, StagePose> {
  const result = new Map<string, StagePose>();
  const ordered = byOrder(formations);
  const first = ordered[0];
  if (first === undefined) return result;

  // Find the last formation whose start is <= t (or the first one).
  let currentIndex = 0;
  for (let i = 0; i < ordered.length; i++) {
    const f = ordered[i];
    if (f !== undefined && f.startTimeMs <= tMs) currentIndex = i;
  }
  const current = ordered[currentIndex];
  const next = ordered[currentIndex + 1];
  if (current === undefined) return result;

  const currentPositions = positions[current.id] ?? {};
  const holdEnd = current.startTimeMs + current.durationMs;

  for (const [performerId, pos] of Object.entries(currentPositions)) {
    if (next === undefined || tMs <= holdEnd) {
      result.set(performerId, poseOf(pos));
      continue;
    }
    const nextPos = positions[next.id]?.[performerId];
    if (nextPos === undefined) {
      result.set(performerId, poseOf(pos));
      continue;
    }
    const span = next.startTimeMs - holdEnd;
    const t = span <= 0 ? 1 : Math.min((tMs - holdEnd) / span, 1);
    // 'curve' transitions travel along a quadratic Bézier through the
    // performer's control point (stored on the position being LEFT).
    const control = current.transitionType === 'curve' ? pos.curveControlPoints?.[0] : undefined;
    result.set(performerId, {
      x:
        control !== undefined
          ? quadBezier(pos.x, control.x, nextPos.x, t)
          : lerp(pos.x, nextPos.x, t),
      y:
        control !== undefined
          ? quadBezier(pos.y, control.y, nextPos.y, t)
          : lerp(pos.y, nextPos.y, t),
      rotation: lerpAngle(pos.rotation, nextPos.rotation, t),
    });
  }
  return result;
}

/** End of the show: last formation's hold end (0 when no formations). */
export function showEndMs(formations: readonly Formation[]): number {
  const ordered = byOrder(formations);
  const last = ordered[ordered.length - 1];
  return last === undefined ? 0 : last.startTimeMs + last.durationMs;
}

/** "m:ss.t" — timeline and topbar timecode. */
export function formatTimecode(ms: number): string {
  const clamped = Math.max(0, ms);
  const minutes = Math.floor(clamped / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const tenths = Math.floor((clamped % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

/** Dance 8-count label for a time, e.g. "8ct 3 · 5" (third eight, count 5). */
export function formatEightCount(ms: number, bpm: number): string {
  const beatMs = 60_000 / bpm;
  const beat = Math.floor(Math.max(0, ms) / beatMs);
  const eight = Math.floor(beat / 8) + 1;
  const count = (beat % 8) + 1;
  return `8ct ${eight} · ${count}`;
}
