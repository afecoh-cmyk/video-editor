export type ProjectStatus = 'draft' | 'closed';

/** Fitting / part kinds used on site */
export type PartKind = 'muffe' | 'reduzir' | 'abzweig';

export const PART_KINDS: { id: PartKind; label: string; short: string }[] = [
  { id: 'muffe', label: 'Muffe', short: 'Muffe' },
  { id: 'reduzir', label: 'Reduzir', short: 'Red.' },
  { id: 'abzweig', label: 'Abzweig', short: 'Abz.' },
];

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

/**
 * One countable line on a project.
 * - muffe: diameterMm only
 * - reduzir: diameterMm → diameterToMm (pl. 315→250)
 * - abzweig: diameterMm main, diameterToMm = Abzweig DM
 */
export type PartEntry = {
  id: string;
  projectId: string;
  kind: PartKind;
  diameterMm: number;
  diameterToMm: number | null;
  count: number;
  testPressureBar: number | null;
  note: string;
  sortOrder: number;
  createdAt: string;
};

export type CanvasPoint = {
  x: number;
  y: number;
};

export type PipeLineKind = 'vorlauf' | 'ruecklauf';

/** Szabadkézi csővonal a projekt nagyítható rajzlapján, relatív világkoordinátákkal. */
export type CanvasStroke = {
  id: string;
  projectId: string;
  points: CanvasPoint[];
  /** Vorlauf = folytonos, Rücklauf = szaggatott. Régi rajznál hiányozhat. */
  pipeKind?: PipeLineKind;
  /** Az egy mozdulattal rajzolt VL/RL pár közös azonosítója. */
  pairId?: string;
  createdAt: string;
};

/** Egy X helye; átalakítás után egy konkrét tételhez kapcsolódik. */
export type CanvasMarker = {
  id: string;
  projectId: string;
  x: number;
  y: number;
  /** Az a fizikai VL/RL vonal, amelyre az X illeszkedik. */
  strokeId?: string;
  partId: string | null;
  createdAt: string;
};

/** @deprecated use PartEntry — kept alias for older imports */
export type MuffEntry = PartEntry;

export type AppData = {
  projects: Project[];
  parts: PartEntry[];
  canvasMarkers: CanvasMarker[];
  canvasStrokes: CanvasStroke[];
};

export const COMMON_DIAMETERS = [
  90,
  110,
  125,
  140,
  160,
  180,
  200,
  225,
  250,
  280,
  315,
  355,
  400,
  450,
  500,
  560,
  630,
  710,
] as const;

export function partKindLabel(kind: PartKind): string {
  return PART_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

export function formatPartDims(entry: Pick<PartEntry, 'kind' | 'diameterMm' | 'diameterToMm'>): string {
  if (entry.kind === 'reduzir' && entry.diameterToMm != null) {
    return `DM ${entry.diameterMm}→${entry.diameterToMm}`;
  }
  if (entry.kind === 'abzweig' && entry.diameterToMm != null) {
    return `DM ${entry.diameterMm} / Abz. ${entry.diameterToMm}`;
  }
  return `DM ${entry.diameterMm}`;
}
