export type ProjectStatus = 'draft' | 'closed';

/** Fitting / part kinds used on site */
export type PartKind =
  | 'muffe'
  | 'reduzir'
  | 'abzweig'
  | 'bogenmuffe'
  | 'montagemuffe'
  | 'reduzirmuffe'
  | 'endmuffe'
  | 'montageabzweig'
  | 'montagebogen';

export const PART_KINDS: { id: PartKind; label: string; short: string }[] = [
  { id: 'muffe', label: 'Muffe', short: 'M' },
  { id: 'reduzir', label: 'Reduzir', short: 'R' },
  { id: 'abzweig', label: 'Abzweig', short: 'A' },
  { id: 'bogenmuffe', label: 'Bogenmuffe', short: 'BM' },
  { id: 'montagemuffe', label: 'Montagemuffe', short: 'MM' },
  { id: 'reduzirmuffe', label: 'Reduzirmuffe', short: 'RM' },
  { id: 'endmuffe', label: 'Endmuffe', short: 'EM' },
  { id: 'montageabzweig', label: 'Montageabzweig', short: 'MA' },
  { id: 'montagebogen', label: 'Montagebogen', short: 'MB' },
];

export const KIND_GROUPS: { id: 'schrumpf' | 'hegesztett'; label: string; kinds: PartKind[] }[] = [
  { id: 'schrumpf', label: 'Schrumpf', kinds: ['muffe', 'reduzir', 'abzweig'] },
  {
    id: 'hegesztett',
    label: 'Hegesztett',
    kinds: ['bogenmuffe', 'montagemuffe', 'reduzirmuffe', 'endmuffe', 'montageabzweig'],
  },
];

export type PartKindTotals = { total: number } & Record<PartKind, number>;

export function emptyKindTotals(): PartKindTotals {
  return {
    total: 0,
    muffe: 0,
    reduzir: 0,
    abzweig: 0,
    bogenmuffe: 0,
    montagemuffe: 0,
    reduzirmuffe: 0,
    endmuffe: 0,
    montageabzweig: 0,
    montagebogen: 0,
  };
}

export function kindNeedsSecondDm(kind: PartKind): boolean {
  return kindUsesReduceDims(kind) || kindUsesBranchDims(kind);
}

export function kindUsesReduceDims(kind: PartKind): boolean {
  return kind === 'reduzir' || kind === 'reduzirmuffe';
}

export function kindUsesBranchDims(kind: PartKind): boolean {
  return kind === 'abzweig' || kind === 'montageabzweig';
}

export function kindPrimaryDmLabel(kind: PartKind): string {
  if (kindUsesBranchDims(kind)) return 'Haupt DM';
  if (kindUsesReduceDims(kind)) return 'DM von';
  return 'DM';
}

export function kindSecondDmLabel(kind: PartKind): string {
  if (kindUsesBranchDims(kind)) return 'Abzweig DM';
  if (kindUsesReduceDims(kind)) return 'DM bis (→)';
  return '2. DM';
}

export function formatKindCountLine(totals: PartKindTotals): string {
  const bits = KIND_GROUPS.flatMap((g) => g.kinds)
    .filter((id) => totals[id] > 0)
    .map((id) => {
      const meta = PART_KINDS.find((k) => k.id === id);
      return `${meta?.short ?? id} ${totals[id]}`;
    });
  return bits.length ? bits.join(' · ') : '—';
}

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
 * - muffe / bogenmuffe / montagemuffe / endmuffe: diameterMm only
 * - reduzir / reduzirmuffe: diameterMm → diameterToMm (pl. 315→250)
 * - abzweig / montageabzweig: diameterMm main, diameterToMm = Abzweig DM
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

export type CanvasPairUndo = {
  pairId: string;
  projectId: string;
  vorlauf: CanvasPoint[];
  ruecklauf: CanvasPoint[];
  createdAt: string;
};

export type AppData = {
  projects: Project[];
  parts: PartEntry[];
  canvasMarkers: CanvasMarker[];
  canvasStrokes: CanvasStroke[];
  /** Utolsó csőtoldás előtti állapot, hogy a visszavonás ne törölje a teljes párt. */
  canvasPairUndo?: CanvasPairUndo | null;
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

export function partKindShort(kind: PartKind): string {
  return PART_KINDS.find((k) => k.id === kind)?.short ?? kind;
}

export function formatPartDims(entry: Pick<PartEntry, 'kind' | 'diameterMm' | 'diameterToMm'>): string {
  if (kindUsesReduceDims(entry.kind) && entry.diameterToMm != null) {
    return `DM ${entry.diameterMm}→${entry.diameterToMm}`;
  }
  if (kindUsesBranchDims(entry.kind) && entry.diameterToMm != null) {
    return `DM ${entry.diameterMm}/${entry.diameterToMm}`;
  }
  return `DM ${entry.diameterMm}`;
}

export function formatKindDims(
  kind: PartKind,
  diameterMm: string | number,
  diameterToMm?: string | number | null
): string {
  if (kindUsesReduceDims(kind)) return `DM ${diameterMm}→${diameterToMm ?? '—'}`;
  if (kindUsesBranchDims(kind)) return `DM ${diameterMm}/${diameterToMm ?? '—'}`;
  return `DM ${diameterMm}`;
}
