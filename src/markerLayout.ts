import { pipeFrameAtPoint, strokePairs, type Size } from './pipeGeometry';
import {
  formatPartDims,
  kindNeedsSecondDm,
  partKindShort,
  type CanvasMarker,
  type CanvasStroke,
  type PartEntry,
} from './types';

export type ViewTransform = { scale: number; offsetX: number; offsetY: number };

export type LaidOutMarker = {
  id: string;
  pipeX: number;
  pipeY: number;
  labelX: number;
  labelY: number;
  width: number;
  height: number;
  caption: string | null;
  twoDims: boolean;
};

function partnerStroke(stroke: CanvasStroke, strokes: CanvasStroke[]): CanvasStroke | undefined {
  if (!stroke.pairId) return undefined;
  const pair = strokePairs(strokes).find((item) => item.pairId === stroke.pairId);
  if (!pair) return undefined;
  return pair.vorlauf.id === stroke.id ? pair.ruecklauf : pair.vorlauf;
}

function captionFor(part: PartEntry): string {
  return `${partKindShort(part.kind)} ${formatPartDims(part).replace(/^DM\s+/, '')}`;
}

function labelSize(caption: string, twoDims: boolean, scale: number): { width: number; height: number } {
  const zoom = Math.max(0.78, Math.min(1.12, scale));
  const char = 6.4 * zoom;
  const width = Math.min(twoDims ? 86 : 52, Math.max(30, Math.ceil(caption.length * char + 10)));
  const height = Math.ceil(15 * zoom);
  return { width, height };
}

function overlap(
  a: { labelX: number; labelY: number; width: number; height: number },
  b: { labelX: number; labelY: number; width: number; height: number },
  pad = 3
): boolean {
  return (
    a.labelX < b.labelX + b.width + pad &&
    a.labelX + a.width + pad > b.labelX &&
    a.labelY < b.labelY + b.height + pad &&
    a.labelY + a.height + pad > b.labelY
  );
}

function resolveOverlaps(items: LaidOutMarker[]): void {
  const labeled = items.filter((item) => item.caption);
  for (let round = 0; round < 8; round += 1) {
    let moved = false;
    for (let i = 0; i < labeled.length; i += 1) {
      for (let j = i + 1; j < labeled.length; j += 1) {
        const a = labeled[i];
        const b = labeled[j];
        if (!overlap(a, b)) continue;
        const acx = a.labelX + a.width / 2;
        const acy = a.labelY + a.height / 2;
        const bcx = b.labelX + b.width / 2;
        const bcy = b.labelY + b.height / 2;
        let dx = acx - bcx;
        let dy = acy - bcy;
        const length = Math.hypot(dx, dy);
        if (length < 0.4) {
          dx = a.pipeX - b.pipeX || 1;
          dy = a.pipeY - b.pipeY;
        }
        const norm = Math.hypot(dx, dy) || 1;
        const step = 5;
        dx = (dx / norm) * step;
        dy = (dy / norm) * step;
        a.labelX += dx;
        a.labelY += dy;
        b.labelX -= dx;
        b.labelY -= dy;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

export function layoutCanvasMarkers(
  markers: CanvasMarker[],
  strokes: CanvasStroke[],
  partsById: Map<string, PartEntry>,
  size: Size,
  view: ViewTransform
): LaidOutMarker[] {
  const strokeById = new Map(strokes.map((stroke) => [stroke.id, stroke]));
  const laid = markers.map((marker) => {
    const pipeX = marker.x * size.width * view.scale + view.offsetX;
    const pipeY = marker.y * size.height * view.scale + view.offsetY;
    const part = marker.partId ? partsById.get(marker.partId) ?? null : null;
    if (!part) {
      return {
        id: marker.id,
        pipeX,
        pipeY,
        labelX: pipeX - 9,
        labelY: pipeY - 9,
        width: 18,
        height: 18,
        caption: null,
        twoDims: false,
      };
    }

    const caption = captionFor(part);
    const twoDims = kindNeedsSecondDm(part.kind);
    const box = labelSize(caption, twoDims, view.scale);
    const stroke = marker.strokeId ? strokeById.get(marker.strokeId) : undefined;
    const partner = stroke ? partnerStroke(stroke, strokes) : undefined;
    const frame = stroke
      ? pipeFrameAtPoint({ x: marker.x, y: marker.y }, stroke, partner, size)
      : { tangent: { x: 1, y: 0 }, outward: { x: 0, y: -1 } };
    const gap = 11 + box.height / 2;
    return {
      id: marker.id,
      pipeX,
      pipeY,
      labelX: pipeX + frame.outward.x * gap - box.width / 2,
      labelY: pipeY + frame.outward.y * gap - box.height / 2,
      width: box.width,
      height: box.height,
      caption,
      twoDims,
    };
  });

  resolveOverlaps(laid);
  return laid;
}
