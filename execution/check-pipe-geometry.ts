import {
  findPairEndJoin,
  makePipePair,
  mergeCenterlineOntoPair,
  snapPipePathAngles,
} from '../src/pipeGeometry';
import type { CanvasStroke } from '../src/types';

const size = { width: 400, height: 800 };

function stroke(id: string, pairId: string, kind: 'vorlauf' | 'ruecklauf', points: { x: number; y: number }[]): CanvasStroke {
  return { id, pairId, projectId: 'p', pipeKind: kind, points, createdAt: 't' };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const existingCenter = [
  { x: 0.5, y: 0.2 },
  { x: 0.5, y: 0.5 },
];
const [vl, rl] = makePipePair(existingCenter, size, 28);
const strokes = [
  stroke('vl', 'pair-1', 'vorlauf', vl),
  stroke('rl', 'pair-1', 'ruecklauf', rl),
];

const incoming = snapPipePathAngles(
  [
    { x: 0.53, y: 0.52 },
    { x: 0.82, y: 0.515 },
  ],
  size
);
const join = findPairEndJoin(incoming, strokes, size, 80);
assert(!!join, 'A jobbra toldást fel kell ismerni');
assert(join?.pairId === 'pair-1', 'A meglévő párhoz kell csatlakozni');

const merged = mergeCenterlineOntoPair(incoming, join!, strokes, size);
assert(!!merged, 'A toldásnak össze kell olvadnia');
const [nextVl, nextRl] = merged!;
assert(nextVl.length >= 3, `A VL-nek sarokkal kell folytatódnia, pontok: ${nextVl.length}`);
assert(nextRl.length === nextVl.length, 'VL és RL azonos töréspontszámú');

const startGap = Math.hypot(
  (nextVl[0].x - vl[0].x) * size.width,
  (nextVl[0].y - vl[0].y) * size.height
);
assert(startGap < 1.5, `A meglévő VL eleje nem csúszhat el (${startGap.toFixed(2)} px)`);

const last = nextVl[nextVl.length - 1];
assert(last.x > 0.7, 'A toldásnak jobbra kell nyúlnia');

const mid = nextVl[1];
const incomingDx = (last.x - mid.x) * size.width;
const incomingDy = (last.y - mid.y) * size.height;
const incomingAngle = Math.abs(Math.atan2(incomingDy, incomingDx));
assert(incomingAngle < 0.2, `A toldott szakasz legyen vízszintes, szög=${incomingAngle.toFixed(3)}`);

const leftIncoming = snapPipePathAngles(
  [
    { x: 0.2, y: 0.49 },
    { x: 0.48, y: 0.5 },
  ],
  size
);
const leftJoin = findPairEndJoin(leftIncoming, strokes, size, 80);
assert(!!leftJoin, 'A balra toldást fel kell ismerni');
const leftMerged = mergeCenterlineOntoPair(leftIncoming, leftJoin!, strokes, size);
assert(!!leftMerged, 'A balra toldásnak össze kell olvadnia');
const leftMinX = Math.min(...leftMerged![0].map((point) => point.x));
assert(leftMinX < 0.3, `A balra toldásnak balra kell nyúlnia (minX=${leftMinX})`);

const fromTop = snapPipePathAngles(
  [
    { x: 0.18, y: 0.2 },
    { x: 0.49, y: 0.2 },
  ],
  size
);
const topJoin = findPairEndJoin(fromTop, strokes, size, 80);
assert(!!topJoin, 'A felső véghez toldást fel kell ismerni');
const topMerged = mergeCenterlineOntoPair(fromTop, topJoin!, strokes, size);
assert(!!topMerged, 'A felső toldásnak össze kell olvadnia');
assert(topMerged![0][0].x < 0.28, 'A felső végre balról toldott szakasz elöl legyen');

const continueIncoming = snapPipePathAngles(
  [
    { x: 0.5, y: 0.52 },
    { x: 0.5, y: 0.78 },
  ],
  size
);
const continueJoin = findPairEndJoin(continueIncoming, strokes, size, 80);
assert(!!continueJoin, 'Az egyenes folytatást fel kell ismerni');
const continued = mergeCenterlineOntoPair(continueIncoming, continueJoin!, strokes, size);
assert(!!continued, 'Az egyenes folytatásnak össze kell olvadnia');
assert(continued![0][continued![0].length - 1].y > 0.7, 'Lefelé kell hosszabbodnia');

console.log('✔ Csőtoldás geometria rendben');
