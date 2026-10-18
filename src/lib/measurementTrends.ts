import { Goal } from '@/features/clients/types';

export type TrendDirection = 'up' | 'down' | 'neutral';

/**
 * Dirección favorable de cada métrica según el objetivo del cliente.
 * - % Grasa, pliegues y cintura siempre favorecen "down" (reducción de grasa).
 * - Masa muscular siempre favorece "up".
 * - Peso/IMC: "up" en volumen/subir de peso, "down" en definición/bajar de peso, "neutral" en mantenimiento/recomposición.
 * - Perímetros musculares (brazo, pecho, etc.): "up" en volumen/recomposición, "neutral" en definición/mantenimiento.
 */
function weightFavorable(goal: Goal | null): TrendDirection {
  if (goal === 'volumen' || goal === 'subir de peso') return 'up';
  if (goal === 'definición' || goal === 'bajar de peso') return 'down';
  return 'neutral';
}

function musclePerimeterFavorable(goal: Goal | null): TrendDirection {
  if (goal === 'volumen' || goal === 'subir de peso' || goal === 'recomposición') return 'up';
  return 'neutral';
}

const FAVORABLE_BY_METRIC: Record<string, (goal: Goal | null) => TrendDirection> = {
  // Composición
  weight_kg: weightFavorable,
  bmi: weightFavorable,
  body_fat_pct: () => 'down',
  muscle_mass_pct: () => 'up',
  visceral_fat: () => 'down',
  
  // Perímetros de grasa / cintura
  waist_cm: () => 'down',
  abdomen_cm: () => 'down',
  waist_hip_ratio: () => 'down',
  hip_cm: () => 'neutral',

  // Perímetros musculares
  neck_cm: () => 'neutral',
  shoulders_cm: musclePerimeterFavorable,
  chest_cm: musclePerimeterFavorable,
  arm_cm: musclePerimeterFavorable,
  arm_right_cm: musclePerimeterFavorable,
  arm_left_cm: musclePerimeterFavorable,
  arm_flexed_right_cm: musclePerimeterFavorable,
  arm_flexed_left_cm: musclePerimeterFavorable,
  forearm_right_cm: musclePerimeterFavorable,
  forearm_left_cm: musclePerimeterFavorable,
  thigh_right_cm: musclePerimeterFavorable,
  thigh_left_cm: musclePerimeterFavorable,
  calf_right_cm: musclePerimeterFavorable,
  calf_left_cm: musclePerimeterFavorable,

  // Plicometría / Pliegues cutáneos (siempre favorable que bajen)
  triceps_mm: () => 'down',
  biceps_mm: () => 'down',
  subscapular_mm: () => 'down',
  supraspinal_mm: () => 'down',
  suprailiac_mm: () => 'down',
  abdominal_mm: () => 'down',
  thigh_mm: () => 'down',
  calf_mm: () => 'down',
  chest_mm: () => 'down',

  // Derivados del análisis ISAK
  sum6_mm: () => 'down',
  sum8_mm: () => 'down',
  fat_mass_kg: () => 'down',
  adipose_kg: () => 'down',
  muscle_kg: () => 'up',
};

/** true si `next` respecto a `prev` va en la dirección favorable para ese objetivo; null si es neutro. */
export function isChangeFavorable(metric: string, prev: number, next: number, goal: Goal | null): boolean | null {
  const favorable = FAVORABLE_BY_METRIC[metric]?.(goal) ?? 'neutral';
  if (favorable === 'neutral' || next === prev) return null;
  const wentUp = next > prev;
  return favorable === 'up' ? wentUp : !wentUp;
}

// Métricas que resumen el avance tras guardar (en este orden); solo se citan las que cambian
const SUMMARY_METRICS: { key: string; label: string; unit: string; decimals: number }[] = [
  { key: 'weight_kg', label: 'peso', unit: ' kg', decimals: 1 },
  { key: 'sum6_mm', label: 'Σ6 pliegues', unit: ' mm', decimals: 1 },
  { key: 'body_fat_pct', label: 'grasa', unit: ' %', decimals: 1 },
  { key: 'muscle_mass_pct', label: 'músculo', unit: ' %', decimals: 1 },
  { key: 'waist_cm', label: 'cintura', unit: ' cm', decimals: 1 },
];

function formatDelta(delta: number, decimals: number, unit: string): string {
  const abs = Math.abs(delta).toFixed(decimals).replace('.', ',').replace(/,0$/, '');
  return `${delta > 0 ? '+' : '−'}${abs}${unit}`;
}

/**
 * Frase para el aviso tras guardar una medición: qué cambió desde la anterior, en tono cercano
 * y sin exagerar (solo se felicita si la mayoría de cambios van en la dirección del objetivo).
 */
export function describeMeasurementChange(
  prev: Record<string, unknown> | null,
  next: Record<string, unknown>,
  goal: Goal | null
): { message: string; favorable: boolean } {
  if (!prev) {
    return { message: 'Primera medición guardada. A partir de aquí verás su progreso.', favorable: false };
  }
  const parts: string[] = [];
  let good = 0;
  let bad = 0;
  // % de grasa y de músculo calculados con métodos distintos (báscula vs pliegues) no son comparables
  const sameMethod = fatMethod(prev) === fatMethod(next);
  const withSums: { prev: Record<string, unknown>; next: Record<string, unknown> } = {
    prev: { ...prev, sum6_mm: sum6(prev) },
    next: { ...next, sum6_mm: sum6(next) },
  };
  for (const { key, label, unit, decimals } of SUMMARY_METRICS) {
    if (!sameMethod && (key === 'body_fat_pct' || key === 'muscle_mass_pct')) continue;
    const a = withSums.prev[key];
    const b = withSums.next[key];
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    const delta = Number((b - a).toFixed(decimals));
    if (delta === 0) continue;
    parts.push(`${label} ${formatDelta(delta, decimals, unit)}`);
    const favorable = isChangeFavorable(key, a, b, goal);
    if (favorable === true) good++;
    if (favorable === false) bad++;
  }
  if (parts.length === 0) {
    return { message: 'Medición guardada. Sin cambios en peso, grasa, músculo ni cintura.', favorable: false };
  }
  const favorable = good > 0 && good > bad;
  const lead = favorable ? 'Buen avance desde la anterior' : 'Medición guardada. Desde la anterior';
  return { message: `${lead}: ${parts.join(', ')}.`, favorable };
}

const SUM6_KEYS = ['triceps_mm', 'subscapular_mm', 'supraspinal_mm', 'abdominal_mm', 'thigh_mm', 'calf_mm'];

/** Σ6 pliegues si están los seis; si no, undefined (no se cita). */
function sum6(m: Record<string, unknown>): number | undefined {
  let total = 0;
  for (const key of SUM6_KEYS) {
    const v = m[key];
    if (typeof v !== 'number') return undefined;
    total += v;
  }
  return total;
}

/** Método del % de grasa: la ecuación en evaluaciones ISAK, «medido» en el resto. */
function fatMethod(m: Record<string, unknown>): string {
  if (m.protocol !== 'isak_restricted' && m.protocol !== 'skinfolds') return 'medido';
  const equations = m.equations as { fat?: string | null } | null | undefined;
  return equations?.fat ?? 'isak';
}
