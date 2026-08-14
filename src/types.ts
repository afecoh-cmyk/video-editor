export type ProjectStatus = 'draft' | 'closed';

export type Project = {
  id: string;
  betreiber: string;
  verlegefirma: string;
  baustellenort: string;
  date: string; // YYYY-MM-DD
  remarks: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type MuffEntry = {
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

export type AppData = {
  projects: Project[];
  muffs: MuffEntry[];
};

export const COMMON_DIAMETERS = [90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400] as const;
