/**
 * Transition planning for OpenStage.
 *
 * - `planTransition`: which performer should take which spot in the next
 *   formation so the total walking distance is minimal — the classic
 *   assignment problem, solved with the Hungarian algorithm in O(n³).
 * - `findCrossings`: which straight walking paths intersect (collision
 *   warnings for the choreographer).
 */

export interface PathPoint {
  x: number;
  y: number;
}

export interface TransitionPlan {
  /** assignment[i] = index of the target spot performer i should take. */
  assignment: number[];
  /** Sum of straight-line distances under that assignment, in input units. */
  totalDistance: number;
}

/**
 * Hungarian algorithm (Kuhn–Munkres, potentials formulation), O(n³).
 * `cost[i][j]` = cost of assigning row i to column j. Requires a square
 * matrix. Returns for each row the assigned column.
 */
export function hungarian(cost: readonly (readonly number[])[]): number[] {
  const n = cost.length;
  if (n === 0) return [];
  for (const row of cost) {
    if (row.length !== n) throw new Error('hungarian: cost matrix must be square');
  }
  // 1-indexed internals (classic formulation); p[j] = row matched to column j.
  const INF = Number.POSITIVE_INFINITY;
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(n + 1).fill(0);
  const p = new Array<number>(n + 1).fill(0);
  const way = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(n + 1).fill(INF);
    const used = new Array<boolean>(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0] ?? 0;
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j] === true) continue;
        const cur = (cost[i0 - 1]?.[j - 1] ?? INF) - (u[i0] ?? 0) - (v[j] ?? 0);
        if (cur < (minv[j] ?? INF)) {
          minv[j] = cur;
          way[j] = j0;
        }
        if ((minv[j] ?? INF) < delta) {
          delta = minv[j] ?? INF;
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j] === true) {
          u[p[j] ?? 0] = (u[p[j] ?? 0] ?? 0) + delta;
          v[j] = (v[j] ?? 0) - delta;
        } else {
          minv[j] = (minv[j] ?? INF) - delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    // Augment along the found path.
    do {
      const j1 = way[j0] ?? 0;
      p[j0] = p[j1] ?? 0;
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array<number>(n).fill(-1);
  for (let j = 1; j <= n; j++) {
    const row = p[j] ?? 0;
    if (row >= 1) assignment[row - 1] = j - 1;
  }
  return assignment;
}

function distance(a: PathPoint, b: PathPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Minimal-total-travel matching between current spots and target spots.
 * Uses squared distances as costs (punishes one long walk more than several
 * short ones — reads better on stage), reports the real distance sum.
 */
export function planTransition(
  fromSpots: readonly PathPoint[],
  toSpots: readonly PathPoint[],
): TransitionPlan {
  if (fromSpots.length !== toSpots.length) {
    throw new Error('planTransition: spot counts must match');
  }
  const cost = fromSpots.map((from) =>
    toSpots.map((to) => {
      const d = distance(from, to);
      return d * d;
    }),
  );
  const assignment = hungarian(cost);
  const totalDistance = assignment.reduce((sum, target, i) => {
    const from = fromSpots[i];
    const to = toSpots[target];
    return from !== undefined && to !== undefined ? sum + distance(from, to) : sum;
  }, 0);
  return { assignment, totalDistance };
}

function orientation(a: PathPoint, b: PathPoint, c: PathPoint): number {
  const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(val) < 1e-12) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(a: PathPoint, b: PathPoint, c: PathPoint): boolean {
  return (
    Math.min(a.x, c.x) - 1e-12 <= b.x &&
    b.x <= Math.max(a.x, c.x) + 1e-12 &&
    Math.min(a.y, c.y) - 1e-12 <= b.y &&
    b.y <= Math.max(a.y, c.y) + 1e-12
  );
}

/** Do segments p1–p2 and p3–p4 intersect (including touching endpoints)? */
export function segmentsIntersect(
  p1: PathPoint,
  p2: PathPoint,
  p3: PathPoint,
  p4: PathPoint,
): boolean {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;
  return false;
}

export interface WalkPath {
  from: PathPoint;
  to: PathPoint;
}

/**
 * Index pairs of paths that cross each other. Paths sharing an endpoint
 * (e.g. two dancers leaving the same cluster) are not reported.
 *
 * ponytail: O(n²) pairwise checks — casts are tens of dancers, not
 * thousands; switch to a sweep line if that ever changes.
 */
export function findCrossings(paths: readonly WalkPath[]): [number, number][] {
  const crossings: [number, number][] = [];
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      const a = paths[i];
      const b = paths[j];
      if (a === undefined || b === undefined) continue;
      const sharesEndpoint =
        distance(a.from, b.from) < 1e-9 ||
        distance(a.from, b.to) < 1e-9 ||
        distance(a.to, b.from) < 1e-9 ||
        distance(a.to, b.to) < 1e-9;
      if (sharesEndpoint) continue;
      if (segmentsIntersect(a.from, a.to, b.from, b.to)) crossings.push([i, j]);
    }
  }
  return crossings;
}
