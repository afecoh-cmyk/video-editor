import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type {
  AppData,
  CanvasMarker,
  CanvasPoint,
  CanvasStroke,
  PartEntry,
  PartKind,
  PipeLineKind,
  Project,
} from './types';

const STORAGE_KEY = 'muffe-plan:v2';
const LEGACY_KEY = 'muffe-plan:v1';

const emptyData = (): AppData => ({
  projects: [],
  parts: [],
  canvasMarkers: [],
  canvasStrokes: [],
});

type LegacyMuff = {
  id: string;
  projectId: string;
  diameterMm: number;
  muffCount: number;
  fittingsCount: number | null;
  testPressureBar: number | null;
  note: string;
  sortOrder: number;
  createdAt: string;
};

async function migrateIfNeeded(): Promise<void> {
  const current = await AsyncStorage.getItem(STORAGE_KEY);
  if (current) return;

  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (!legacy) return;

  try {
    const parsed = JSON.parse(legacy) as { projects?: Project[]; muffs?: LegacyMuff[] };
    const parts: PartEntry[] = (parsed.muffs ?? []).map((m) => ({
      id: m.id,
      projectId: m.projectId,
      kind: 'muffe' as PartKind,
      diameterMm: m.diameterMm,
      diameterToMm: null,
      count: m.muffCount,
      testPressureBar: m.testPressureBar,
      note: m.note ?? '',
      sortOrder: m.sortOrder,
      createdAt: m.createdAt,
    }));
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        projects: parsed.projects ?? [],
        parts,
        canvasMarkers: [],
        canvasStrokes: [],
      })
    );
  } catch {
    // ignore corrupt legacy
  }
}

async function read(): Promise<AppData> {
  await migrateIfNeeded();
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    const parsed = JSON.parse(raw) as AppData & { muffs?: LegacyMuff[] };
    // tolerate accidental old shape
    if (parsed.parts) {
      return {
        projects: parsed.projects ?? [],
        parts: parsed.parts,
        canvasMarkers: parsed.canvasMarkers ?? [],
        canvasStrokes: parsed.canvasStrokes ?? [],
      };
    }
    if (parsed.muffs) {
      return {
        projects: parsed.projects ?? [],
        parts: parsed.muffs.map((m) => ({
          id: m.id,
          projectId: m.projectId,
          kind: 'muffe' as PartKind,
          diameterMm: m.diameterMm,
          diameterToMm: null,
          count: m.muffCount,
          testPressureBar: m.testPressureBar,
          note: m.note ?? '',
          sortOrder: m.sortOrder,
          createdAt: m.createdAt,
        })),
        canvasMarkers: [],
        canvasStrokes: [],
      };
    }
    return emptyData();
  } catch {
    return emptyData();
  }
}

async function write(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function touchProject(data: AppData, projectId: string) {
  const project = data.projects.find((p) => p.id === projectId);
  if (project) project.updatedAt = new Date().toISOString();
}

export async function newId(): Promise<string> {
  return Crypto.randomUUID();
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function listProjects(): Promise<Project[]> {
  const data = await read();
  return [...data.projects].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string): Promise<Project | null> {
  const data = await read();
  return data.projects.find((p) => p.id === id) ?? null;
}

export async function saveProject(
  input: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    id?: string;
    status?: Project['status'];
  }
): Promise<Project> {
  const data = await read();
  const now = new Date().toISOString();

  if (input.id) {
    const idx = data.projects.findIndex((p) => p.id === input.id);
    if (idx === -1) throw new Error('Projekt nem található');
    const updated: Project = {
      ...data.projects[idx],
      betreiber: input.betreiber.trim(),
      verlegefirma: input.verlegefirma.trim(),
      baustellenort: input.baustellenort.trim(),
      date: input.date,
      remarks: input.remarks.trim(),
      status: input.status ?? data.projects[idx].status,
      updatedAt: now,
    };
    data.projects[idx] = updated;
    await write(data);
    return updated;
  }

  const project: Project = {
    id: await newId(),
    betreiber: input.betreiber.trim(),
    verlegefirma: input.verlegefirma.trim(),
    baustellenort: input.baustellenort.trim(),
    date: input.date,
    remarks: input.remarks.trim(),
    status: input.status ?? 'draft',
    createdAt: now,
    updatedAt: now,
  };
  data.projects.push(project);
  await write(data);
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  const data = await read();
  data.projects = data.projects.filter((p) => p.id !== id);
  data.parts = data.parts.filter((m) => m.projectId !== id);
  data.canvasMarkers = data.canvasMarkers.filter((m) => m.projectId !== id);
  data.canvasStrokes = data.canvasStrokes.filter((s) => s.projectId !== id);
  await write(data);
}

export async function getCanvas(projectId: string): Promise<{
  markers: CanvasMarker[];
  strokes: CanvasStroke[];
}> {
  const data = await read();
  return {
    markers: data.canvasMarkers.filter((m) => m.projectId === projectId),
    strokes: data.canvasStrokes.filter((s) => s.projectId === projectId),
  };
}

export async function addCanvasMarker(
  projectId: string,
  point: CanvasPoint
): Promise<CanvasMarker> {
  const data = await read();
  const marker: CanvasMarker = {
    id: await newId(),
    projectId,
    x: point.x,
    y: point.y,
    partId: null,
    createdAt: new Date().toISOString(),
  };
  data.canvasMarkers.push(marker);
  touchProject(data, projectId);
  await write(data);
  return marker;
}

export async function addCanvasStroke(
  projectId: string,
  points: CanvasPoint[],
  pipeKind: PipeLineKind = 'vorlauf'
): Promise<CanvasStroke | null> {
  if (points.length < 2) return null;
  const data = await read();
  const stroke: CanvasStroke = {
    id: await newId(),
    projectId,
    points,
    pipeKind,
    createdAt: new Date().toISOString(),
  };
  data.canvasStrokes.push(stroke);
  touchProject(data, projectId);
  await write(data);
  return stroke;
}

export async function addCanvasStrokePair(
  projectId: string,
  vorlaufPoints: CanvasPoint[],
  ruecklaufPoints: CanvasPoint[]
): Promise<void> {
  if (vorlaufPoints.length < 2 || ruecklaufPoints.length < 2) return;
  const data = await read();
  const pairId = await newId();
  const createdAt = new Date().toISOString();
  data.canvasStrokes.push(
    {
      id: await newId(),
      pairId,
      projectId,
      points: vorlaufPoints,
      pipeKind: 'vorlauf',
      createdAt,
    },
    {
      id: await newId(),
      pairId,
      projectId,
      points: ruecklaufPoints,
      pipeKind: 'ruecklauf',
      createdAt,
    }
  );
  touchProject(data, projectId);
  await write(data);
}

export async function undoCanvasAction(projectId: string): Promise<void> {
  const data = await read();
  const markers = data.canvasMarkers.filter((m) => m.projectId === projectId);
  const strokes = data.canvasStrokes.filter((s) => s.projectId === projectId);
  const marker = markers.at(-1);
  const stroke = strokes.at(-1);
  if (!marker && !stroke) return;
  if (marker && (!stroke || marker.createdAt >= stroke.createdAt)) {
    if (marker.partId) data.parts = data.parts.filter((p) => p.id !== marker.partId);
    data.canvasMarkers = data.canvasMarkers.filter((m) => m.id !== marker.id);
  } else if (stroke) {
    data.canvasStrokes = data.canvasStrokes.filter((s) =>
      stroke.pairId ? s.pairId !== stroke.pairId : s.id !== stroke.id
    );
  }
  touchProject(data, projectId);
  await write(data);
}

export async function convertMarkersToParts(input: {
  projectId: string;
  markerIds: string[];
  kind: PartKind;
  diameterMm: number;
  diameterToMm?: number | null;
}): Promise<void> {
  const data = await read();
  const markerIds = new Set(input.markerIds);
  const selected = data.canvasMarkers.filter(
    (m) => m.projectId === input.projectId && markerIds.has(m.id) && !m.partId
  );
  let sortOrder = data.parts.filter((p) => p.projectId === input.projectId).length;
  for (const marker of selected) {
    const part: PartEntry = {
      id: await newId(),
      projectId: input.projectId,
      kind: input.kind,
      diameterMm: input.diameterMm,
      diameterToMm: input.diameterToMm ?? null,
      count: 1,
      testPressureBar: null,
      note: '',
      sortOrder: sortOrder++,
      createdAt: new Date().toISOString(),
    };
    data.parts.push(part);
    marker.partId = part.id;
  }
  touchProject(data, input.projectId);
  await write(data);
}

export async function listParts(projectId: string): Promise<PartEntry[]> {
  const data = await read();
  return data.parts
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

/** @deprecated use listParts */
export const listMuffs = listParts;

export async function addPart(input: {
  projectId: string;
  kind: PartKind;
  diameterMm: number;
  diameterToMm?: number | null;
  count: number;
  testPressureBar?: number | null;
  note?: string;
}): Promise<PartEntry> {
  const data = await read();
  const siblings = data.parts.filter((m) => m.projectId === input.projectId);
  const entry: PartEntry = {
    id: await newId(),
    projectId: input.projectId,
    kind: input.kind,
    diameterMm: input.diameterMm,
    diameterToMm: input.diameterToMm ?? null,
    count: input.count,
    testPressureBar: input.testPressureBar ?? null,
    note: input.note?.trim() ?? '',
    sortOrder: siblings.length,
    createdAt: new Date().toISOString(),
  };
  data.parts.push(entry);
  touchProject(data, input.projectId);
  await write(data);
  return entry;
}

/** @deprecated use addPart */
export async function addMuff(input: {
  projectId: string;
  diameterMm: number;
  muffCount: number;
  testPressureBar?: number | null;
  note?: string;
}): Promise<PartEntry> {
  return addPart({
    projectId: input.projectId,
    kind: 'muffe',
    diameterMm: input.diameterMm,
    count: input.muffCount,
    testPressureBar: input.testPressureBar,
    note: input.note,
  });
}

export async function updatePart(
  id: string,
  patch: Partial<Pick<PartEntry, 'kind' | 'diameterMm' | 'diameterToMm' | 'count' | 'testPressureBar' | 'note'>>
): Promise<PartEntry> {
  const data = await read();
  const idx = data.parts.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error('Tétel nem található');
  data.parts[idx] = { ...data.parts[idx], ...patch };
  touchProject(data, data.parts[idx].projectId);
  await write(data);
  return data.parts[idx];
}

/** @deprecated use updatePart */
export async function updateMuff(
  id: string,
  patch: Partial<Pick<PartEntry, 'diameterMm' | 'count' | 'testPressureBar' | 'note'>> & { muffCount?: number }
): Promise<PartEntry> {
  const { muffCount, ...rest } = patch;
  return updatePart(id, { ...rest, ...(muffCount != null ? { count: muffCount } : {}) });
}

export async function adjustPartCount(id: string, delta: number): Promise<PartEntry | null> {
  const data = await read();
  const idx = data.parts.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const next = data.parts[idx].count + delta;
  if (next <= 0) {
    const projectId = data.parts[idx].projectId;
    data.parts.splice(idx, 1);
    touchProject(data, projectId);
    await write(data);
    return null;
  }
  data.parts[idx] = { ...data.parts[idx], count: next };
  touchProject(data, data.parts[idx].projectId);
  await write(data);
  return data.parts[idx];
}

export async function deletePart(id: string): Promise<void> {
  const data = await read();
  const entry = data.parts.find((m) => m.id === id);
  data.parts = data.parts.filter((m) => m.id !== id);
  if (entry) touchProject(data, entry.projectId);
  await write(data);
}

/** @deprecated use deletePart */
export const deleteMuff = deletePart;

export type KindSummary = {
  kind: PartKind;
  count: number;
  entryCount: number;
};

export type DiameterSummary = {
  kind: PartKind;
  diameterMm: number;
  diameterToMm: number | null;
  count: number;
  entryCount: number;
};

export async function dailySummary(date: string): Promise<{
  byKind: KindSummary[];
  byDiameter: DiameterSummary[];
  totalParts: number;
  totalMuffs: number;
  projectCount: number;
  projects: Project[];
}> {
  const data = await read();
  const projects = data.projects.filter((p) => p.date === date);
  const projectIds = new Set(projects.map((p) => p.id));
  const parts = data.parts.filter((m) => projectIds.has(m.projectId));

  const kindMap = new Map<PartKind, KindSummary>();
  const dimMap = new Map<string, DiameterSummary>();

  for (const m of parts) {
    const k = kindMap.get(m.kind) ?? { kind: m.kind, count: 0, entryCount: 0 };
    k.count += m.count;
    k.entryCount += 1;
    kindMap.set(m.kind, k);

    const key = `${m.kind}:${m.diameterMm}:${m.diameterToMm ?? ''}`;
    const d =
      dimMap.get(key) ??
      ({
        kind: m.kind,
        diameterMm: m.diameterMm,
        diameterToMm: m.diameterToMm,
        count: 0,
        entryCount: 0,
      } satisfies DiameterSummary);
    d.count += m.count;
    d.entryCount += 1;
    dimMap.set(key, d);
  }

  const byKind = [...kindMap.values()].sort((a, b) => a.kind.localeCompare(b.kind));
  const byDiameter = [...dimMap.values()].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.diameterMm - b.diameterMm
  );
  const totalParts = byKind.reduce((sum, row) => sum + row.count, 0);
  const totalMuffs = kindMap.get('muffe')?.count ?? 0;

  return { byKind, byDiameter, totalParts, totalMuffs, projectCount: projects.length, projects };
}

export async function projectPartTotals(projectId: string): Promise<{
  total: number;
  muffe: number;
  reduzir: number;
  abzweig: number;
}> {
  const parts = await listParts(projectId);
  const out = { total: 0, muffe: 0, reduzir: 0, abzweig: 0 };
  for (const p of parts) {
    out.total += p.count;
    out[p.kind] += p.count;
  }
  return out;
}

/** @deprecated use projectPartTotals */
export async function projectMuffTotal(projectId: string): Promise<number> {
  const t = await projectPartTotals(projectId);
  return t.total;
}
