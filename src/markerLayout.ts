import type { Size } from './pipeGeometry';
import {
  formatKindDims,
  partKindLabel,
  type CanvasMarker,
  type PartEntry,
  type PartKind,
} from './types';

export type ViewTransform = { scale: number; offsetX: number; offsetY: number };

export type MarkerGroupKey = string;

export type LaidOutMarker = {
  id: string;
  pipeX: number;
  pipeY: number;
  groupKey: MarkerGroupKey;
  open: boolean;
};

export type MarkerGroup = {
  key: MarkerGroupKey;
  kind: PartKind | null;
  diameterMm: number | null;
  diameterToMm: number | null;
  count: number;
  markerIds: string[];
};

export function partGroupKey(part: Pick<PartEntry, 'kind' | 'diameterMm' | 'diameterToMm'>): MarkerGroupKey {
  return `${part.kind}:${part.diameterMm}:${part.diameterToMm ?? ''}`;
}

export const OPEN_GROUP_KEY = 'open';

export function formatGroupChip(group: MarkerGroup): string {
  if (!group.kind || group.diameterMm == null) {
    return `${group.count} db aktuális X`;
  }
  const dm = formatKindDims(group.kind, group.diameterMm, group.diameterToMm).replace(/^DM\s+/, '');
  return `${group.count} db ${dm} ${partKindLabel(group.kind)}`;
}

export function layoutCanvasMarkers(
  markers: CanvasMarker[],
  partsById: Map<string, PartEntry>,
  size: Size,
  view: ViewTransform
): LaidOutMarker[] {
  return markers.map((marker) => {
    const part = marker.partId ? partsById.get(marker.partId) ?? null : null;
    return {
      id: marker.id,
      pipeX: marker.x * size.width * view.scale + view.offsetX,
      pipeY: marker.y * size.height * view.scale + view.offsetY,
      groupKey: part ? partGroupKey(part) : OPEN_GROUP_KEY,
      open: !part,
    };
  });
}

export function groupCanvasMarkers(
  markers: CanvasMarker[],
  partsById: Map<string, PartEntry>
): MarkerGroup[] {
  const map = new Map<MarkerGroupKey, MarkerGroup>();
  for (const marker of markers) {
    const part = marker.partId ? partsById.get(marker.partId) ?? null : null;
    const key = part ? partGroupKey(part) : OPEN_GROUP_KEY;
    const existing = map.get(key);
    if (existing) {
      existing.count += part?.count ?? 1;
      existing.markerIds.push(marker.id);
      continue;
    }
    map.set(key, {
      key,
      kind: part?.kind ?? null,
      diameterMm: part?.diameterMm ?? null,
      diameterToMm: part?.diameterToMm ?? null,
      count: part?.count ?? 1,
      markerIds: [marker.id],
    });
  }
  return [...map.values()].sort((a, b) => {
    if (a.key === OPEN_GROUP_KEY) return -1;
    if (b.key === OPEN_GROUP_KEY) return 1;
    const kind = (a.kind ?? '').localeCompare(b.kind ?? '');
    if (kind !== 0) return kind;
    return (a.diameterMm ?? 0) - (b.diameterMm ?? 0);
  });
}
