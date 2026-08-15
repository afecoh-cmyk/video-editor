import type { Size } from './pipeGeometry';
import {
  formatKindDims,
  partKindShort,
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
  nr: number | null;
};

export type MarkerGroup = {
  key: MarkerGroupKey;
  kind: PartKind | null;
  diameterMm: number | null;
  diameterToMm: number | null;
  count: number;
  nr: number | null;
  markerIds: string[];
};

export function partGroupKey(part: Pick<PartEntry, 'kind' | 'diameterMm' | 'diameterToMm'>): MarkerGroupKey {
  return `${part.kind}:${part.diameterMm}:${part.diameterToMm ?? ''}`;
}

export const OPEN_GROUP_KEY = 'open';

export function formatGroupChip(group: MarkerGroup): string {
  if (!group.kind || group.diameterMm == null) {
    return `X ×${group.count}`;
  }
  const dm = formatKindDims(group.kind, group.diameterMm, group.diameterToMm).replace(/^DM\s+/, '');
  const nr = group.nr != null ? `${group.nr}  ` : '';
  return `${nr}${dm} ${partKindShort(group.kind)} ×${group.count}`;
}

export function layoutCanvasMarkers(
  markers: CanvasMarker[],
  partsById: Map<string, PartEntry>,
  size: Size,
  view: ViewTransform,
  groups: MarkerGroup[]
): LaidOutMarker[] {
  const nrByKey = new Map(groups.map((group) => [group.key, group.nr]));
  return markers.map((marker) => {
    const part = marker.partId ? partsById.get(marker.partId) ?? null : null;
    const groupKey = part ? partGroupKey(part) : OPEN_GROUP_KEY;
    return {
      id: marker.id,
      pipeX: marker.x * size.width * view.scale + view.offsetX,
      pipeY: marker.y * size.height * view.scale + view.offsetY,
      groupKey,
      open: !part,
      nr: nrByKey.get(groupKey) ?? null,
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
      nr: null,
      markerIds: [marker.id],
    });
  }
  const rows = [...map.values()].sort((a, b) => {
    if (a.key === OPEN_GROUP_KEY) return -1;
    if (b.key === OPEN_GROUP_KEY) return 1;
    const kind = (a.kind ?? '').localeCompare(b.kind ?? '');
    if (kind !== 0) return kind;
    return (a.diameterMm ?? 0) - (b.diameterMm ?? 0);
  });
  let nr = 1;
  for (const row of rows) {
    if (row.key === OPEN_GROUP_KEY) continue;
    row.nr = nr;
    nr += 1;
  }
  return rows;
}
