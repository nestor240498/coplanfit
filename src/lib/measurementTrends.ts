import { Goal } from '@/features/clients/types';

export type TrendDirection = 'up' | 'down' | 'neutral';

/**
 * Dirección favorable de cada métrica según el objetivo del cliente.
 * Peso/brazo/IMC dependen del objetivo (ganar vs. perder masa);
 * grasa/cintura/relación cintura-cadera/pliegues siempre favorecen "menos";
 * cadera es puramente informativa (sin favorabilidad).
 */
function weightFavorable(goal: Goal | null): TrendDirection {
  if (goal === 'volumen' || goal === 'subir de peso') return 'up';
  if (goal === 'definición' || goal === 'bajar de peso') return 'down';
  return 'neutral';
}

const FAVORABLE_BY_METRIC: Record<string, (goal: Goal | null) => TrendDirection> = {
  weight_kg: weightFavorable,
  arm_cm: weightFavorable,
  bmi: weightFavorable,
  body_fat_pct: () => 'down',
  waist_cm: () => 'down',
  waist_hip_ratio: () => 'down',
  triceps_mm: () => 'down',
  abdominal_mm: () => 'down',
  subscapular_mm: () => 'down',
  hip_cm: () => 'neutral',
};

/** true si `next` respecto a `prev` va en la dirección favorable para ese objetivo. */
export function isChangeFavorable(metric: string, prev: number, next: number, goal: Goal | null): boolean | null {
  const favorable = FAVORABLE_BY_METRIC[metric]?.(goal) ?? 'neutral';
  if (favorable === 'neutral' || next === prev) return null;
  const wentUp = next > prev;
  return favorable === 'up' ? wentUp : !wentUp;
}
