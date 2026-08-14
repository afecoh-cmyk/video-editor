import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { AppData, MuffEntry, Project } from './types';

const STORAGE_KEY = 'muffe-plan:v1';

const emptyData = (): AppData => ({ projects: [], muffs: [] });

async function read(): Promise<AppData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    const parsed = JSON.parse(raw) as AppData;
    return {
      projects: parsed.projects ?? [],
      muffs: parsed.muffs ?? [],
    };
  } catch {
    return emptyData();
  }
}

async function write(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
  data.muffs = data.muffs.filter((m) => m.projectId !== id);
  await write(data);
}

export async function listMuffs(projectId: string): Promise<MuffEntry[]> {
  const data = await read();
  return data.muffs
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export async function addMuff(input: {
  projectId: string;
  diameterMm: number;
  muffCount: number;
  testPressureBar?: number | null;
  note?: string;
}): Promise<MuffEntry> {
  const data = await read();
  const siblings = data.muffs.filter((m) => m.projectId === input.projectId);
  const entry: MuffEntry = {
    id: await newId(),
    projectId: input.projectId,
    diameterMm: input.diameterMm,
    muffCount: input.muffCount,
    fittingsCount: null,
    testPressureBar: input.testPressureBar ?? null,
    note: input.note?.trim() ?? '',
    sortOrder: siblings.length,
    createdAt: new Date().toISOString(),
  };
  data.muffs.push(entry);

  const project = data.projects.find((p) => p.id === input.projectId);
  if (project) project.updatedAt = new Date().toISOString();

  await write(data);
  return entry;
}

export async function updateMuff(
  id: string,
  patch: Partial<Pick<MuffEntry, 'diameterMm' | 'muffCount' | 'testPressureBar' | 'note'>>
): Promise<MuffEntry> {
  const data = await read();
  const idx = data.muffs.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error('Muff nem található');
  data.muffs[idx] = { ...data.muffs[idx], ...patch };
  const project = data.projects.find((p) => p.id === data.muffs[idx].projectId);
  if (project) project.updatedAt = new Date().toISOString();
  await write(data);
  return data.muffs[idx];
}

export async function deleteMuff(id: string): Promise<void> {
  const data = await read();
  const entry = data.muffs.find((m) => m.id === id);
  data.muffs = data.muffs.filter((m) => m.id !== id);
  if (entry) {
    const project = data.projects.find((p) => p.id === entry.projectId);
    if (project) project.updatedAt = new Date().toISOString();
  }
  await write(data);
}

export type DiameterSummary = {
  diameterMm: number;
  muffCount: number;
  entryCount: number;
};

export async function dailySummary(date: string): Promise<{
  byDiameter: DiameterSummary[];
  totalMuffs: number;
  projectCount: number;
  projects: Project[];
}> {
  const data = await read();
  const projects = data.projects.filter((p) => p.date === date);
  const projectIds = new Set(projects.map((p) => p.id));
  const muffs = data.muffs.filter((m) => projectIds.has(m.projectId));

  const map = new Map<number, DiameterSummary>();
  for (const m of muffs) {
    const cur = map.get(m.diameterMm) ?? { diameterMm: m.diameterMm, muffCount: 0, entryCount: 0 };
    cur.muffCount += m.muffCount;
    cur.entryCount += 1;
    map.set(m.diameterMm, cur);
  }

  const byDiameter = [...map.values()].sort((a, b) => a.diameterMm - b.diameterMm);
  const totalMuffs = byDiameter.reduce((sum, row) => sum + row.muffCount, 0);

  return { byDiameter, totalMuffs, projectCount: projects.length, projects };
}

export async function projectMuffTotal(projectId: string): Promise<number> {
  const muffs = await listMuffs(projectId);
  return muffs.reduce((sum, m) => sum + m.muffCount, 0);
}
