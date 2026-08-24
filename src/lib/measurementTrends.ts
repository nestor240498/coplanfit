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
};

/** true si `next` respecto a `prev` va en la dirección favorable para ese objetivo; null si es neutro. */
export function isChangeFavorable(metric: string, prev: number, next: number, goal: Goal | null): boolean | null {
  const favorable = FAVORABLE_BY_METRIC[metric]?.(goal) ?? 'neutral';
  if (favorable === 'neutral' || next === prev) return null;
  const wentUp = next > prev;
  return favorable === 'up' ? wentUp : !wentUp;
}
