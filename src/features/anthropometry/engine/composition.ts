import type { FatEquation, Sex, SiteId } from './types.ts';

/**
 * Ecuaciones de composición corporal (consenso GREC/FEMEDE 2009 y fuentes originales).
 * Unidades: pliegues en mm, perímetros y talla en cm, masa en kg, salvo donde se indique.
 */

/** Durnin & Womersley (1974): coeficientes c y m de D = c − m·log10(Σ4) por sexo y edad. */
const DW_TABLE: Record<Sex, { maxAge: number; c: number; m: number }[]> = {
  hombre: [
    { maxAge: 19, c: 1.162, m: 0.063 },
    { maxAge: 29, c: 1.1631, m: 0.0632 },
    { maxAge: 39, c: 1.1422, m: 0.0544 },
    { maxAge: 49, c: 1.162, m: 0.07 },
    // El consenso GREC imprime 0,0799: errata frente al original (0,0779)
    { maxAge: Infinity, c: 1.1715, m: 0.0779 },
  ],
  mujer: [
    { maxAge: 19, c: 1.1549, m: 0.0678 },
    { maxAge: 29, c: 1.1599, m: 0.0717 },
    { maxAge: 39, c: 1.1423, m: 0.0632 },
    { maxAge: 49, c: 1.1333, m: 0.0612 },
    { maxAge: Infinity, c: 1.1339, m: 0.0645 },
  ],
};

/** Edad mínima de la muestra de Durnin-Womersley (16-72 años); por debajo se usa Slaughter. */
export const DW_MIN_AGE = 17;
export const DW_MAX_AGE = 72;

/** Densidad corporal (g/cm³) con Σ4 = bíceps + tríceps + subescapular + cresta ilíaca. */
export function durninWomersleyDensity(sex: Sex, age: number, sum4: number): number {
  const row = DW_TABLE[sex].find((r) => age <= r.maxAge) ?? DW_TABLE[sex][DW_TABLE[sex].length - 1];
  return row.c - row.m * Math.log10(sum4);
}

/** Siri (1961): % grasa a partir de la densidad. */
export function siriFatPct(density: number): number {
  return 495 / density - 450;
}

/** Faulkner (1968), deportistas. Σ4 = tríceps + subescapular + supraespinal + abdominal. */
export function faulknerFatPct(sex: Sex, sum4: number): number {
  return sex === 'hombre' ? 0.153 * sum4 + 5.783 : 0.213 * sum4 + 7.9;
}

/** Carter (1982), deportistas. Σ6 = tríceps + subescapular + supraespinal + abdominal + muslo + pierna. */
export function carterFatPct(sex: Sex, sum6: number): number {
  return sex === 'hombre' ? 0.1051 * sum6 + 2.58 : 0.1548 * sum6 + 3.58;
}

/** Slaughter (1988), 8-18 años (forma simplificada del consenso): tríceps + pierna medial. */
export function slaughterFatPct(sex: Sex, tricepsPlusCalf: number): number {
  return sex === 'hombre' ? 0.735 * tricepsPlusCalf + 1.0 : 0.61 * tricepsPlusCalf + 5.1;
}

/** Ecuación de % grasa recomendada por edad: menores de 18 → Slaughter; adultos → Durnin-Womersley + Siri. */
export function defaultFatEquation(age: number | null): FatEquation {
  return age != null && age < 18 ? 'slaughter' : 'dw_siri';
}

/** Puntos de Jackson-Pollock de 3 pliegues (cambian según el sexo). El suprailíaco se toma con el supraespinal ISAK. */
export function jacksonPollock3Sites(sex: Sex): SiteId[] {
  return sex === 'hombre' ? ['chest_mm', 'abdominal_mm', 'thigh_mm'] : ['triceps_mm', 'supraspinal_mm', 'thigh_mm'];
}

export const JACKSON_POLLOCK_7_SITES: SiteId[] = [
  'chest_mm',
  'midaxillary_mm',
  'triceps_mm',
  'subscapular_mm',
  'abdominal_mm',
  'supraspinal_mm',
  'thigh_mm',
];

/** Jackson-Pollock (1978, 1980): densidad corporal con la suma de 3 o 7 pliegues y la edad. */
export function jacksonPollockDensity(kind: 3 | 7, sex: Sex, age: number, sum: number): number {
  if (kind === 3) {
    return sex === 'hombre'
      ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age
      : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * age;
  }
  return sex === 'hombre'
    ? 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age
    : 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age;
}

export const FAT_EQUATION_LABELS: Record<FatEquation, string> = {
  jp3: 'Jackson-Pollock 3 pliegues + Siri',
  jp7: 'Jackson-Pollock 7 pliegues + Siri',
  dw_siri: 'Durnin-Womersley (1974) + Siri',
  faulkner: 'Faulkner (deportistas)',
  carter: 'Carter (deportistas)',
  slaughter: 'Slaughter (8-18 años)',
};

/** Perímetro corregido por el pliegue: perímetro (cm) − π · pliegue (mm) / 10. */
export function correctedGirth(girthCm: number, skinfoldMm: number): number {
  return girthCm - (Math.PI * skinfoldMm) / 10;
}

/** Proporcionalidad de Ross: k = 170,18 / talla. */
export function phantomScale(heightCm: number): number {
  return 170.18 / heightCm;
}

/** Kerr (1988): masa de tejido adiposo a partir de Σ6 pliegues (estrategia Phantom). */
export function kerrAdiposeKg(sum6: number, heightCm: number): number {
  const k = phantomScale(heightCm);
  const z = (sum6 * k - 116.41) / 34.79;
  return (z * 5.85 + 25.6) / k ** 3;
}

/**
 * Lee et al. (2000): masa muscular esquelética.
 * talla_m · (0,00744·CAG² + 0,00088·CTG² + 0,00441·CCG²) + 2,4·sexo − 0,048·edad + etnia + 7,8
 */
export function leeMuscleKg(input: {
  heightCm: number;
  correctedArm: number;
  correctedThigh: number;
  correctedCalf: number;
  sex: Sex;
  age: number;
  ethnicity: number;
}): number {
  const { heightCm, correctedArm, correctedThigh, correctedCalf, sex, age, ethnicity } = input;
  return (
    (heightCm / 100) *
      (0.00744 * correctedArm ** 2 + 0.00088 * correctedThigh ** 2 + 0.00441 * correctedCalf ** 2) +
    2.4 * (sex === 'hombre' ? 1 : 0) -
    0.048 * age +
    ethnicity +
    7.8
  );
}

/** Rocha (1975): masa ósea = 3,02 · (talla² · muñeca · fémur · 400)^0,712, todo en metros. */
export function rochaBoneKg(heightCm: number, wristCm: number, femurCm: number): number {
  const h = heightCm / 100;
  return 3.02 * (h * h * (wristCm / 100) * (femurCm / 100) * 400) ** 0.712;
}
