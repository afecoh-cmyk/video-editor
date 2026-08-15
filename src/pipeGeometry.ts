import type { CanvasPoint, CanvasStroke } from './types';

export type Size = { width: number; height: number };

export type PairEndJoin = {
  pairId: string;
  existingJoinIndex: number;
  incomingJoinIndex: number;
  spacingPx: number;
};

export function distancePx(a: CanvasPoint, b: CanvasPoint, size: Size): number {
  return Math.hypot((a.x - b.x) * size.width, (a.y - b.y) * size.height);
}

export function midpoint(a: CanvasPoint, b: CanvasPoint): CanvasPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function reversePoints(points: CanvasPoint[]): CanvasPoint[] {
  return [...points].reverse();
}

export function pairCenterline(vorlauf: CanvasPoint[], ruecklauf: CanvasPoint[]): CanvasPoint[] {
  const count = Math.min(vorlauf.length, ruecklauf.length);
  return Array.from({ length: count }, (_, index) => midpoint(vorlauf[index], ruecklauf[index]));
}

export function pairSpacingPx(vorlauf: CanvasPoint[], ruecklauf: CanvasPoint[], size: Size): number {
  const first = distancePx(vorlauf[0], ruecklauf[0], size);
  const last = distancePx(
    vorlauf[vorlauf.length - 1],
    ruecklauf[ruecklauf.length - 1],
    size
  );
  return Math.max(12, Math.min(80, (first + last) / 2));
}

export function pointToSegmentDistance(
  point: CanvasPoint,
  start: CanvasPoint,
  end: CanvasPoint,
  size: Size
): number {
  const px = point.x * size.width;
  const py = point.y * size.height;
  const ax = start.x * size.width;
  const ay = start.y * size.height;
  const bx = end.x * size.width;
  const by = end.y * size.height;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const ratio =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + ratio * dx), py - (ay + ratio * dy));
}

/** Ramer–Douglas–Peucker: a kézremegést eltávolítja, a valódi sarkokat megtartja. */
export function simplifyPipePath(
  points: CanvasPoint[],
  size: Size,
  tolerancePx: number
): CanvasPoint[] {
  if (points.length <= 2) return points;
  let farthestIndex = 0;
  let farthestDistance = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = pointToSegmentDistance(points[index], points[0], points[points.length - 1], size);
    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthestIndex = index;
    }
  }
  if (farthestDistance <= tolerancePx) return [points[0], points[points.length - 1]];
  const left = simplifyPipePath(points.slice(0, farthestIndex + 1), size, tolerancePx);
  const right = simplifyPipePath(points.slice(farthestIndex), size, tolerancePx);
  return [...left.slice(0, -1), ...right];
}

/** A megtartott töréspontokat a legközelebbi 30°-os tervrajzi irányra igazítja. */
export function snapPipePathAngles(points: CanvasPoint[], size: Size): CanvasPoint[] {
  if (points.length < 2) return points;
  const result: CanvasPoint[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const current = result[result.length - 1];
    const target = points[index];
    const dx = (target.x - current.x) * size.width;
    const dy = (target.y - current.y) * size.height;
    const length = Math.hypot(dx, dy);
    const angleStep = Math.PI / 6;
    const angle = Math.round(Math.atan2(dy, dx) / angleStep) * angleStep;
    const next = {
      x: current.x + (Math.cos(angle) * length) / size.width,
      y: current.y + (Math.sin(angle) * length) / size.height,
    };
    if (length >= 6) result.push(next);
  }

  if (result.length < 3) return result;
  const cleaned: CanvasPoint[] = [result[0]];
  for (let index = 1; index < result.length - 1; index += 1) {
    const before = cleaned[cleaned.length - 1];
    const current = result[index];
    const after = result[index + 1];
    const firstAngle = Math.round(
      Math.atan2((current.y - before.y) * size.height, (current.x - before.x) * size.width) /
        (Math.PI / 6)
    );
    const secondAngle = Math.round(
      Math.atan2((after.y - current.y) * size.height, (after.x - current.x) * size.width) /
        (Math.PI / 6)
    );
    if (firstAngle !== secondAngle) cleaned.push(current);
  }
  cleaned.push(result[result.length - 1]);
  return cleaned;
}

export function offsetPipe(points: CanvasPoint[], offsetPx: number, size: Size): CanvasPoint[] {
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const incomingX = (point.x - previous.x) * size.width;
    const incomingY = (point.y - previous.y) * size.height;
    const outgoingX = (next.x - point.x) * size.width;
    const outgoingY = (next.y - point.y) * size.height;
    const incomingLength = Math.hypot(incomingX, incomingY);
    const outgoingLength = Math.hypot(outgoingX, outgoingY);

    const firstX = incomingLength ? incomingX / incomingLength : outgoingX / (outgoingLength || 1);
    const firstY = incomingLength ? incomingY / incomingLength : outgoingY / (outgoingLength || 1);
    const secondX = outgoingLength ? outgoingX / outgoingLength : firstX;
    const secondY = outgoingLength ? outgoingY / outgoingLength : firstY;
    const firstNormal = { x: -firstY, y: firstX };
    const secondNormal = { x: -secondY, y: secondX };
    const sumX = firstNormal.x + secondNormal.x;
    const sumY = firstNormal.y + secondNormal.y;
    const sumLength = Math.hypot(sumX, sumY);
    const miter = sumLength > 0.001 ? { x: sumX / sumLength, y: sumY / sumLength } : secondNormal;
    const denominator = miter.x * secondNormal.x + miter.y * secondNormal.y;
    const miterLength =
      Math.abs(denominator) > 0.1
        ? Math.max(-Math.abs(offsetPx) * 3, Math.min(Math.abs(offsetPx) * 3, offsetPx / denominator))
        : offsetPx;
    return {
      x: point.x + (miter.x * miterLength) / size.width,
      y: point.y + (miter.y * miterLength) / size.height,
    };
  });
}

export function makePipePair(
  points: CanvasPoint[],
  size: Size,
  spacingPx = 28
): [CanvasPoint[], CanvasPoint[]] {
  return [offsetPipe(points, -spacingPx / 2, size), offsetPipe(points, spacingPx / 2, size)];
}

export function strokePairs(strokes: CanvasStroke[]): {
  pairId: string;
  vorlauf: CanvasStroke;
  ruecklauf: CanvasStroke;
}[] {
  const byId = new Map<string, CanvasStroke[]>();
  for (const stroke of strokes) {
    if (!stroke.pairId) continue;
    const list = byId.get(stroke.pairId) ?? [];
    list.push(stroke);
    byId.set(stroke.pairId, list);
  }
  return [...byId.entries()]
    .map(([pairId, list]) => ({
      pairId,
      vorlauf: list.find((item) => item.pipeKind === 'vorlauf') ?? list[0],
      ruecklauf: list.find((item) => item.pipeKind === 'ruecklauf') ?? list[1] ?? list[0],
    }))
    .filter((pair) => pair.vorlauf.points.length > 1 && pair.ruecklauf.points.length > 1);
}

function closestOnPolyline(
  point: CanvasPoint,
  points: CanvasPoint[],
  size: Size
): { point: CanvasPoint; distance: number; segmentIndex: number; ratio: number } | null {
  let best: { point: CanvasPoint; distance: number; segmentIndex: number; ratio: number } | null =
    null;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const dx = (end.x - start.x) * size.width;
    const dy = (end.y - start.y) * size.height;
    const lengthSquared = dx * dx + dy * dy;
    const px = (point.x - start.x) * size.width;
    const py = (point.y - start.y) * size.height;
    const ratio =
      lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared));
    const projected = {
      x: start.x + ratio * (end.x - start.x),
      y: start.y + ratio * (end.y - start.y),
    };
    const distance = distancePx(point, projected, size);
    if (!best || distance < best.distance) {
      best = { point: projected, distance, segmentIndex: index - 1, ratio };
    }
  }
  return best;
}

function interpolate(points: CanvasPoint[], segmentIndex: number, ratio: number): CanvasPoint {
  const start = points[segmentIndex] ?? points[0];
  const end = points[segmentIndex + 1] ?? start;
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
}

function segmentDirection(from: CanvasPoint, to: CanvasPoint, size: Size): { x: number; y: number } {
  const x = (to.x - from.x) * size.width;
  const y = (to.y - from.y) * size.height;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function preserveVorlaufSide(
  nextVl: CanvasPoint[],
  nextRl: CanvasPoint[],
  originalVl: CanvasPoint,
  candidateVl: CanvasPoint,
  candidateRl: CanvasPoint,
  size: Size
): [CanvasPoint[], CanvasPoint[]] {
  return distancePx(candidateVl, originalVl, size) <= distancePx(candidateRl, originalVl, size)
    ? [nextVl, nextRl]
    : [nextRl, nextVl];
}

const END_VERTEX_PX = 32;

function incomingEndDirection(
  points: CanvasPoint[],
  index: number,
  size: Size
): { x: number; y: number } {
  if (index === 0) return segmentDirection(points[1], points[0], size);
  return segmentDirection(points[points.length - 2], points[points.length - 1], size);
}

/** Jobbra/balra toldás: csak a tényleges csővég, nem a szár közepén lévő T-ág. */
export function findPairEndJoin(
  incomingCenter: CanvasPoint[],
  strokes: CanvasStroke[],
  size: Size,
  maxDistancePx: number
): PairEndJoin | null {
  if (incomingCenter.length < 2) return null;
  let best: (PairEndJoin & { score: number }) | null = null;

  for (const existing of strokePairs(strokes)) {
    const center = pairCenterline(existing.vorlauf.points, existing.ruecklauf.points);
    if (center.length < 2) continue;
    const spacingPx = pairSpacingPx(existing.vorlauf.points, existing.ruecklauf.points, size);
    const incomingEnds = [
      { index: 0, point: incomingCenter[0] },
      { index: incomingCenter.length - 1, point: incomingCenter[incomingCenter.length - 1] },
    ];

    for (const incomingEnd of incomingEnds) {
      const hit = closestOnPolyline(incomingEnd.point, center, size);
      if (!hit || hit.distance > maxDistancePx) continue;
      const startDist = distancePx(hit.point, center[0], size);
      const endDist = distancePx(hit.point, center[center.length - 1], size);
      const existingJoinIndex = startDist <= endDist ? 0 : center.length - 1;
      const hitToEnd = Math.min(startDist, endDist);
      const existingDir = segmentDirection(
        center[hit.segmentIndex],
        center[hit.segmentIndex + 1],
        size
      );
      const incomingDir = incomingEndDirection(incomingCenter, incomingEnd.index, size);
      const alignment = Math.abs(
        incomingDir.x * existingDir.x + incomingDir.y * existingDir.y
      );
      // Merőleges T a szárra: ne húzza a cső végére, még rövid szakaszon sem.
      if (alignment <= 0.5 && hitToEnd > 16) continue;
      if (hitToEnd > END_VERTEX_PX) continue;
      const score = hit.distance + hitToEnd;
      if (!best || score < best.score) {
        best = {
          pairId: existing.pairId,
          existingJoinIndex,
          incomingJoinIndex: incomingEnd.index,
          spacingPx,
          score,
        };
      }
    }
  }

  return best;
}

/**
 * A toldást a meglévő pár középvonalába fűzi, majd újra mitereli.
 * Így a 90°-os / 30°-os könyök nem „eltolt ferde” csatlakozás lesz.
 */
export function mergeCenterlineOntoPair(
  incomingCenter: CanvasPoint[],
  join: PairEndJoin,
  strokes: CanvasStroke[],
  size: Size
): [CanvasPoint[], CanvasPoint[]] | null {
  const existing = strokePairs(strokes).find((item) => item.pairId === join.pairId);
  if (!existing) return null;
  const existingCenter = pairCenterline(existing.vorlauf.points, existing.ruecklauf.points);
  if (existingCenter.length < 2 || incomingCenter.length < 2) return null;

  const existJoin = existingCenter[join.existingJoinIndex];
  const incomingJoin = incomingCenter[join.incomingJoinIndex];
  const shifted = incomingCenter.map((point) => ({
    x: point.x + existJoin.x - incomingJoin.x,
    y: point.y + existJoin.y - incomingJoin.y,
  }));
  const outward =
    join.incomingJoinIndex === 0 ? shifted : reversePoints(shifted);

  const snappedNew = snapPipePathAngles([existJoin, ...outward.slice(1)], size);
  const combined =
    join.existingJoinIndex === 0
      ? [...reversePoints(snappedNew).slice(0, -1), ...existingCenter]
      : [...existingCenter.slice(0, -1), ...snappedNew];

  if (combined.length < 2) return null;
  const [nextVl, nextRl] = makePipePair(combined, size, join.spacingPx);
  const originalAnchor =
    join.existingJoinIndex === 0
      ? existing.vorlauf.points[existing.vorlauf.points.length - 1]
      : existing.vorlauf.points[0];
  const nextAnchorIndex = join.existingJoinIndex === 0 ? nextVl.length - 1 : 0;
  return preserveVorlaufSide(
    nextVl,
    nextRl,
    originalAnchor,
    nextVl[nextAnchorIndex],
    nextRl[nextAnchorIndex],
    size
  );
}

type BranchHit = {
  newIndex: number;
  vl: CanvasPoint;
  rl: CanvasPoint;
  spacingPx: number;
  score: number;
};

function findBranchHit(
  incomingCenter: CanvasPoint[],
  strokes: CanvasStroke[],
  size: Size,
  maxDistancePx: number
): BranchHit | null {
  if (incomingCenter.length < 2) return null;
  const incomingEnds = [
    { index: 0, point: incomingCenter[0] },
    { index: incomingCenter.length - 1, point: incomingCenter[incomingCenter.length - 1] },
  ];
  let best: BranchHit | null = null;

  for (const existing of strokePairs(strokes)) {
    const center = pairCenterline(existing.vorlauf.points, existing.ruecklauf.points);
    if (center.length < 2) continue;
    const spacingPx = pairSpacingPx(existing.vorlauf.points, existing.ruecklauf.points, size);
    for (const incoming of incomingEnds) {
      const hit = closestOnPolyline(incoming.point, center, size);
      if (!hit || hit.distance > maxDistancePx) continue;
      const startDist = distancePx(hit.point, center[0], size);
      const endDist = distancePx(hit.point, center[center.length - 1], size);
      if (Math.min(startDist, endDist) <= 16) continue;
      const existingDir = segmentDirection(
        center[hit.segmentIndex],
        center[hit.segmentIndex + 1],
        size
      );
      const incomingDir = incomingEndDirection(incomingCenter, incoming.index, size);
      const alignment = Math.abs(
        incomingDir.x * existingDir.x + incomingDir.y * existingDir.y
      );
      if (alignment > 0.5) continue;
      if (!best || hit.distance < best.score) {
        best = {
          newIndex: incoming.index,
          vl: interpolate(existing.vorlauf.points, hit.segmentIndex, hit.ratio),
          rl: interpolate(existing.ruecklauf.points, hit.segmentIndex, hit.ratio),
          spacingPx,
          score: hit.distance,
        };
      }
    }
  }
  return best;
}

function applyBranchHit(
  pair: [CanvasPoint[], CanvasPoint[]],
  hit: BranchHit,
  size: Size
): [CanvasPoint[], CanvasPoint[]] {
  const [vorlauf, ruecklauf] = pair;
  const index = hit.newIndex;
  const oldCenter = midpoint(vorlauf[index], ruecklauf[index]);
  const newCenter = midpoint(hit.vl, hit.rl);
  const dx = newCenter.x - oldCenter.x;
  const dy = newCenter.y - oldCenter.y;
  const nextVl = vorlauf.map((point) => ({ x: point.x + dx, y: point.y + dy }));
  const nextRl = ruecklauf.map((point) => ({ x: point.x + dx, y: point.y + dy }));
  const swapped =
    distancePx(nextVl[index], hit.vl, size) + distancePx(nextRl[index], hit.rl, size) >
    distancePx(nextVl[index], hit.rl, size) + distancePx(nextRl[index], hit.vl, size);
  nextVl[index] = swapped ? hit.rl : hit.vl;
  nextRl[index] = swapped ? hit.vl : hit.rl;
  return [nextVl, nextRl];
}

/** Abzweig: közel merőleges ág a főpár ugyanazon pontjára ül VL→VL, RL→RL. */
export function snapBranchPairToExisting(
  pair: [CanvasPoint[], CanvasPoint[]],
  strokes: CanvasStroke[],
  size: Size,
  maxDistancePx: number
): [CanvasPoint[], CanvasPoint[]] {
  const [vorlauf, ruecklauf] = pair;
  if (vorlauf.length < 2 || ruecklauf.length < 2) return pair;
  const incomingCenter = pairCenterline(vorlauf, ruecklauf);
  const hit = findBranchHit(incomingCenter, strokes, size, maxDistancePx);
  return hit ? applyBranchHit(pair, hit, size) : pair;
}

export type MovedPairResult =
  | { action: 'merge'; targetPairId: string; vorlauf: CanvasPoint[]; ruecklauf: CanvasPoint[] }
  | { action: 'branch'; vorlauf: CanvasPoint[]; ruecklauf: CanvasPoint[] }
  | { action: 'move'; vorlauf: CanvasPoint[]; ruecklauf: CanvasPoint[] };

/** Kijelölt pár elengedése: toldás a végre, T/Abzweig a szárra, vagy szabad helyen marad. */
export function resolveMovedPair(
  movedVl: CanvasPoint[],
  movedRl: CanvasPoint[],
  otherStrokes: CanvasStroke[],
  size: Size,
  scale: number
): MovedPairResult {
  const center = pairCenterline(movedVl, movedRl);
  const endJoin = findPairEndJoin(center, otherStrokes, size, 80 / scale);
  if (endJoin) {
    const merged = mergeCenterlineOntoPair(center, endJoin, otherStrokes, size);
    if (merged) {
      return {
        action: 'merge',
        targetPairId: endJoin.pairId,
        vorlauf: merged[0],
        ruecklauf: merged[1],
      };
    }
  }
  const branch = findBranchHit(center, otherStrokes, size, 72 / scale);
  if (branch) {
    const [vorlauf, ruecklauf] = applyBranchHit([movedVl, movedRl], branch, size);
    return { action: 'branch', vorlauf, ruecklauf };
  }
  return { action: 'move', vorlauf: movedVl, ruecklauf: movedRl };
}

export type DrawnStrokeResult =
  | { action: 'extend'; pairId: string; vorlauf: CanvasPoint[]; ruecklauf: CanvasPoint[] }
  | { action: 'add'; vorlauf: CanvasPoint[]; ruecklauf: CanvasPoint[] };

/** Elengedett vonal: toldás a végre, T-ág a szárra, vagy új önálló pár. */
export function resolveDrawnStroke(
  incomingCenter: CanvasPoint[],
  strokes: CanvasStroke[],
  size: Size,
  scale: number
): DrawnStrokeResult | null {
  if (incomingCenter.length < 2) return null;
  const endJoin = findPairEndJoin(incomingCenter, strokes, size, 80 / scale);
  if (endJoin) {
    const merged = mergeCenterlineOntoPair(incomingCenter, endJoin, strokes, size);
    if (merged) {
      return { action: 'extend', pairId: endJoin.pairId, vorlauf: merged[0], ruecklauf: merged[1] };
    }
  }
  const branch = findBranchHit(incomingCenter, strokes, size, 72 / scale);
  const pair = makePipePair(incomingCenter, size, branch?.spacingPx ?? 28);
  if (branch) {
    const [vorlauf, ruecklauf] = applyBranchHit(pair, branch, size);
    return { action: 'add', vorlauf, ruecklauf };
  }
  return { action: 'add', vorlauf: pair[0], ruecklauf: pair[1] };
}
