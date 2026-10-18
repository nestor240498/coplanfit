import { toUnits } from './numbers.ts';
import type { SomatotypeCategoryId } from './types.ts';

/** Heath-Carter (1990). Todos los componentes con un mínimo de 0,1. */

/** Endomorfia con X = (tríceps + subescapular + supraespinal) · 170,18 / talla. */
export function endomorphy(triceps: number, subscapular: number, supraspinal: number, heightCm: number): number {
  const x = (triceps + subscapular + supraspinal) * (170.18 / heightCm);
  return Math.max(0.1, -0.7182 + 0.1451 * x - 0.00068 * x ** 2 + 0.0000014 * x ** 3);
}

/** Mesomorfia con perímetros corregidos por el pliegue (en cm: pliegue mm / 10). */
export function mesomorphy(input: {
  humerusCm: number;
  femurCm: number;
  armFlexedCm: number;
  tricepsMm: number;
  calfGirthCm: number;
  calfSkinfoldMm: number;
  heightCm: number;
}): number {
  const { humerusCm, femurCm, armFlexedCm, tricepsMm, calfGirthCm, calfSkinfoldMm, heightCm } = input;
  const value =
    0.858 * humerusCm +
    0.601 * femurCm +
    0.188 * (armFlexedCm - tricepsMm / 10) +
    0.161 * (calfGirthCm - calfSkinfoldMm / 10) -
    0.131 * heightCm +
    4.5;
  return Math.max(0.1, value);
}

/** Ectomorfia a partir del índice ponderal HWR = talla / ∛masa. */
export function ectomorphy(heightCm: number, weightKg: number): number {
  const hwr = heightCm / Math.cbrt(weightKg);
  if (hwr >= 40.75) return Math.max(0.1, 0.732 * hwr - 28.58);
  if (hwr > 38.25) return Math.max(0.1, 0.463 * hwr - 17.63);
  return 0.1;
}

/** Coordenadas en la somatocarta. */
export function somatochartXY(endo: number, meso: number, ecto: number): { x: number; y: number } {
  return { x: ecto - endo, y: 2 * meso - (endo + ecto) };
}

const CATEGORY_LABELS: Record<SomatotypeCategoryId, string> = {
  central: 'Central',
  endomorfo_balanceado: 'Endomorfo balanceado',
  endomorfo_mesomorfico: 'Endomorfo mesomórfico',
  endomorfo_ectomorfico: 'Endomorfo ectomórfico',
  mesomorfo_balanceado: 'Mesomorfo balanceado',
  mesomorfo_endomorfico: 'Mesomorfo endomórfico',
  mesomorfo_ectomorfico: 'Mesomorfo ectomórfico',
  ectomorfo_balanceado: 'Ectomorfo balanceado',
  ectomorfo_endomorfico: 'Ectomorfo endomórfico',
  ectomorfo_mesomorfico: 'Ectomorfo mesomórfico',
  endo_mesomorfo: 'Endo-mesomorfo',
  meso_ectomorfo: 'Meso-ectomorfo',
  endo_ectomorfo: 'Endo-ectomorfo',
};

export function somatotypeCategoryLabel(id: SomatotypeCategoryId): string {
  return CATEGORY_LABELS[id];
}

type Comp = 'endo' | 'meso' | 'ecto';

const DOMINANT: Record<Comp, string> = { endo: 'endomorfo', meso: 'mesomorfo', ecto: 'ectomorfo' };
const MODIFIER: Record<Comp, string> = { endo: 'endomorfico', meso: 'mesomorfico', ecto: 'ectomorfico' };

/**
 * Categoría según Carter: las comparaciones se hacen en décimas enteras (0,5 → 5) para que
 * «iguales con ±0,5» no dependa de errores de coma flotante.
 */
export function somatotypeCategory(endo: number, meso: number, ecto: number): SomatotypeCategoryId {
  const comps = [
    { id: 'endo' as Comp, u: toUnits(endo, 1) },
    { id: 'meso' as Comp, u: toUnits(meso, 1) },
    { id: 'ecto' as Comp, u: toUnits(ecto, 1) },
  ].sort((a, b) => b.u - a.u);
  const [a, b, c] = comps;
  if (a.u - c.u <= 10) return 'central';
  if (a.u - b.u <= 5) {
    const pair = [a.id, b.id].sort((x, y) => ['endo', 'meso', 'ecto'].indexOf(x) - ['endo', 'meso', 'ecto'].indexOf(y));
    if (pair[0] === 'endo' && pair[1] === 'meso') return 'endo_mesomorfo';
    if (pair[0] === 'meso' && pair[1] === 'ecto') return 'meso_ectomorfo';
    return 'endo_ectomorfo';
  }
  if (b.u - c.u <= 5) return `${DOMINANT[a.id]}_balanceado` as SomatotypeCategoryId;
  return `${DOMINANT[a.id]}_${MODIFIER[b.id]}` as SomatotypeCategoryId;
}
