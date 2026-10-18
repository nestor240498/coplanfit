import { roundTo } from './numbers.ts';
import type { Band, Sex } from './types.ts';

/**
 * Clasificaciones con su fuente. Las comparaciones se hacen sobre el valor redondeado tal como se muestra,
 * para que la etiqueta coincida siempre con la cifra que ve el entrenador.
 */

/** IMC (OMS). */
export function bmiBand(bmi: number): Band {
  const v = roundTo(bmi, 1);
  if (v < 18.5) return { id: 'bajo_peso', label: 'Bajo peso', tone: 'warn' };
  if (v < 25) return { id: 'normopeso', label: 'Normopeso', tone: 'good' };
  if (v < 30) return { id: 'sobrepeso', label: 'Sobrepeso', tone: 'warn' };
  return { id: 'obesidad', label: 'Obesidad', tone: 'bad' };
}

/** Índice cintura/talla (Ashwell): < 0,5 bajo riesgo; 0,5-0,6 aumentado; ≥ 0,6 alto. */
export function waistHeightBand(ratio: number): Band {
  const v = roundTo(ratio, 2);
  if (v < 0.5) return { id: 'bajo', label: 'Riesgo bajo', tone: 'good' };
  if (v < 0.6) return { id: 'aumentado', label: 'Riesgo aumentado', tone: 'warn' };
  return { id: 'alto', label: 'Riesgo alto', tone: 'bad' };
}

/** Índice cintura/cadera (OMS): riesgo desde 0,90 en hombres y 0,85 en mujeres. */
export function waistHipBand(ratio: number, sex: Sex | null): Band | null {
  if (!sex) return null;
  const v = roundTo(ratio, 2);
  const limit = sex === 'hombre' ? 0.9 : 0.85;
  return v < limit
    ? { id: 'bajo', label: 'Riesgo bajo', tone: 'good' }
    : { id: 'aumentado', label: 'Riesgo aumentado', tone: 'bad' };
}

/** Umbral de riesgo del índice cintura/cadera según el sexo (para mostrar el rango). */
export function waistHipLimit(sex: Sex): number {
  return sex === 'hombre' ? 0.9 : 0.85;
}

/** Índice de conicidad (Pitanga y Lessa): riesgo desde 1,25 en hombres y 1,18 en mujeres. */
export function conicityBand(index: number, sex: Sex | null): Band | null {
  if (!sex) return null;
  const v = roundTo(index, 2);
  return v < conicityLimit(sex)
    ? { id: 'bajo', label: 'Riesgo cardiovascular bajo', tone: 'good' }
    : { id: 'aumentado', label: 'Riesgo cardiovascular aumentado', tone: 'bad' };
}

export function conicityLimit(sex: Sex): number {
  return sex === 'hombre' ? 1.25 : 1.18;
}

/** Índice músculo/óseo (rangos del informe ISAK). */
export function muscleBoneBand(index: number): Band {
  const v = roundTo(index, 2);
  if (v < 2.34) return { id: 'muy_bajo', label: 'Muy bajo', tone: 'bad' };
  if (v < 2.44) return { id: 'bajo', label: 'Bajo', tone: 'warn' };
  if (v <= 3.11) return { id: 'medio', label: 'Medio', tone: 'good' };
  if (v <= 3.29) return { id: 'alto', label: 'Alto', tone: 'good' };
  return { id: 'muy_alto', label: 'Muy alto', tone: 'good' };
}

export const MUSCLE_BONE_RANGES: readonly { label: string; range: string }[] = [
  { label: 'Muy bajo', range: '< 2,34' },
  { label: 'Bajo', range: '2,34 – 2,44' },
  { label: 'Medio', range: '2,44 – 3,11' },
  { label: 'Alto', range: '3,11 – 3,29' },
  { label: 'Muy alto', range: '> 3,29' },
];

/** Índice córmico (talla sentado / talla). */
export function cormicBand(index: number): Band {
  const v = roundTo(index, 2);
  if (v <= 0.51) return { id: 'braquicormico', label: 'Braquicórmico (tronco corto)', tone: 'neutral' };
  if (v <= 0.53) return { id: 'metriocormico', label: 'Metriocórmico (tronco medio)', tone: 'neutral' };
  return { id: 'macrocormico', label: 'Macrocórmico (tronco largo)', tone: 'neutral' };
}

/** Índice esquelético de Manouvrier ((talla − talla sentado) / talla sentado · 100). */
export function manouvrierBand(index: number): Band {
  const v = roundTo(index, 1);
  if (v < 85) return { id: 'braquiesquelico', label: 'Miembros inferiores cortos', tone: 'neutral' };
  if (v < 90) return { id: 'mesoesquelico', label: 'Miembros inferiores medianos', tone: 'neutral' };
  return { id: 'macroesquelico', label: 'Miembros inferiores largos', tone: 'neutral' };
}

/** Envergadura relativa (envergadura / talla). */
export function relativeSpanBand(ratio: number): Band {
  const v = roundTo(ratio, 2);
  if (v > 1) return { id: 'mayor', label: 'Envergadura mayor que la talla', tone: 'neutral' };
  if (v < 1) return { id: 'menor', label: 'Envergadura menor que la talla', tone: 'neutral' };
  return { id: 'igual', label: 'Envergadura igual a la talla', tone: 'neutral' };
}
