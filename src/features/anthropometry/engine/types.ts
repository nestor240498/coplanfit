/**
 * Tipos del motor de antropometría ISAK. Módulo puro (sin React, Expo ni alias `@/`):
 * también lo ejecuta `npm run check:anthro` en Node.
 */

export type Sex = 'hombre' | 'mujer';

export type SiteGroup = 'basicas' | 'pliegues' | 'perimetros' | 'diametros';

/** Cada punto se identifica con su columna en `measurements`. */
export type SiteId =
  | 'weight_kg'
  | 'height_cm'
  | 'sitting_height_cm'
  | 'arm_span_cm'
  | 'chest_mm'
  | 'midaxillary_mm'
  | 'triceps_mm'
  | 'subscapular_mm'
  | 'biceps_mm'
  | 'suprailiac_mm'
  | 'supraspinal_mm'
  | 'abdominal_mm'
  | 'thigh_mm'
  | 'calf_mm'
  | 'arm_right_cm'
  | 'arm_flexed_right_cm'
  | 'waist_cm'
  | 'hip_cm'
  | 'thigh_right_cm'
  | 'calf_right_cm'
  | 'humerus_breadth_cm'
  | 'wrist_breadth_cm'
  | 'femur_breadth_cm';

export type SiteValues = Partial<Record<SiteId, number | null | undefined>>;

/** Ecuaciones de % de grasa disponibles (consenso GREC/FEMEDE). */
export type FatEquation = 'dw_siri' | 'faulkner' | 'carter' | 'slaughter' | 'jp3' | 'jp7';

export type IsakInput = {
  sex: Sex | null;
  ageYears: number | null;
  sites: SiteValues;
  /** Si no se indica, se elige por edad (`defaultFatEquation`). */
  fatEquation?: FatEquation | null;
  /** Término de etnia de Lee 2000: 0 caucásico/hispano (por defecto), −2 asiático, 1,1 afroamericano. */
  ethnicity?: number;
};

/** Resultado que puede no calcularse si faltan medidas o datos del cliente. */
export type Block<T> =
  | { ok: true; value: T }
  | { ok: false; missing: SiteId[]; needs: ('sex' | 'age')[]; reason?: string };

export type Tone = 'good' | 'neutral' | 'warn' | 'bad';

/** Clasificación de un valor (banda) con su etiqueta en lenguaje llano. */
export type Band = { id: string; label: string; tone: Tone };

export type ValueWithBand = { value: number; band: Band | null };

export type MassPart = { kg: number; pct: number | null };

export type SomatotypeCategoryId =
  | 'central'
  | 'endomorfo_balanceado'
  | 'endomorfo_mesomorfico'
  | 'endomorfo_ectomorfico'
  | 'mesomorfo_balanceado'
  | 'mesomorfo_endomorfico'
  | 'mesomorfo_ectomorfico'
  | 'ectomorfo_balanceado'
  | 'ectomorfo_endomorfico'
  | 'ectomorfo_mesomorfico'
  | 'endo_mesomorfo'
  | 'meso_ectomorfo'
  | 'endo_ectomorfo';

export type Somatotype = {
  endo: number;
  meso: number;
  ecto: number;
  /** Coordenadas en la somatocarta: X = ecto − endo, Y = 2·meso − (endo + ecto). */
  x: number;
  y: number;
  category: SomatotypeCategoryId;
  categoryLabel: string;
};

export type PhantomRow = {
  id: string;
  label: string;
  group: 'basicas' | 'pliegues' | 'perimetros' | 'diametros' | 'corregidos' | 'masas';
  value: number | null;
  z: number | null;
};

export type FatResult = {
  equation: FatEquation;
  density: number | null;
  pct: number;
  fatKg: number | null;
  ffmKg: number | null;
};

export type IsakResults = {
  sum6: Block<number>;
  sum8: Block<number>;
  bmi: Block<ValueWithBand>;
  fat: Block<FatResult>;
  /** % grasa con cada ecuación que se pueda calcular (tabla «Otras ecuaciones»). */
  fatAlternatives: { equation: FatEquation; pct: number }[];
  adipose: Block<MassPart>;
  muscle: Block<MassPart>;
  bone: Block<MassPart>;
  residual: Block<MassPart>;
  adiposeMuscleIndex: Block<number>;
  muscleBoneIndex: Block<ValueWithBand>;
  adiposeDistribution: Block<{ superior: number; central: number; inferior: number }>;
  muscleDistribution: Block<{ arm: number; thigh: number; calf: number }>;
  correctedGirths: Block<{ arm: number; thigh: number; calf: number }>;
  somatotype: Block<Somatotype>;
  phantom: PhantomRow[];
  cormicIndex: Block<ValueWithBand>;
  manouvrierIndex: Block<ValueWithBand>;
  relativeSpan: Block<ValueWithBand>;
  waistHipRatio: Block<ValueWithBand>;
  conicityIndex: Block<ValueWithBand>;
  waistHeightRatio: Block<ValueWithBand>;
  fatDistributionIndex: Block<{ value: number; trunkPct: number; limbsPct: number }>;
  armFlexedDiff: Block<number>;
  warnings: string[];
};

/** Lecturas en bruto guardadas en `measurements.readings`. */
export type MeasurementReadings = {
  v: 1;
  rule: 'median';
  mode: 'guided' | 'transcribe';
  order: 'rounds' | 'consecutive';
  source?: 'isakmetry_pdf';
  sites: Partial<Record<SiteId, number[]>>;
  skipped: SiteId[];
};

/** Fórmulas usadas, guardadas en `measurements.equations`. */
export type MeasurementEquations = {
  v: 1;
  fat: FatEquation | null;
  muscle: 'lee2000';
  bone: 'rocha';
  adipose: 'kerr';
  ethnicity: number;
  sex: Sex | null;
  age: number | null;
};
