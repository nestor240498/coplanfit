import { phantomScale } from './composition.ts';
import type { PhantomRow } from './types.ts';

/**
 * Estrategia Phantom (Ross & Wilson, 1974; Ross & Marfell-Jones, 1991): Z = (v · (170,18/talla)^d − P) / s,
 * con d = 1 en longitudes, pliegues, perímetros y diámetros y d = 3 en masas.
 */
export type PhantomRef = { id: string; label: string; group: PhantomRow['group']; P: number; s: number; d: 1 | 3 };

export const PHANTOM: readonly PhantomRef[] = [
  { id: 'weight_kg', label: 'Masa corporal', group: 'basicas', P: 64.58, s: 8.6, d: 3 },
  { id: 'sitting_height_cm', label: 'Talla sentado', group: 'basicas', P: 89.92, s: 4.5, d: 1 },
  { id: 'arm_span_cm', label: 'Envergadura', group: 'basicas', P: 172.35, s: 7.41, d: 1 },
  { id: 'triceps_mm', label: 'Tríceps', group: 'pliegues', P: 15.4, s: 4.47, d: 1 },
  { id: 'subscapular_mm', label: 'Subescapular', group: 'pliegues', P: 17.2, s: 5.07, d: 1 },
  { id: 'biceps_mm', label: 'Bíceps', group: 'pliegues', P: 8.0, s: 2.0, d: 1 },
  { id: 'suprailiac_mm', label: 'Cresta ilíaca', group: 'pliegues', P: 22.4, s: 6.8, d: 1 },
  { id: 'supraspinal_mm', label: 'Supraespinal', group: 'pliegues', P: 15.4, s: 4.47, d: 1 },
  { id: 'abdominal_mm', label: 'Abdominal', group: 'pliegues', P: 25.4, s: 7.78, d: 1 },
  { id: 'thigh_mm', label: 'Muslo anterior', group: 'pliegues', P: 27.0, s: 8.33, d: 1 },
  { id: 'calf_mm', label: 'Pierna medial', group: 'pliegues', P: 16.0, s: 4.67, d: 1 },
  { id: 'arm_right_cm', label: 'Brazo relajado', group: 'perimetros', P: 26.89, s: 2.33, d: 1 },
  { id: 'arm_flexed_right_cm', label: 'Brazo flexionado', group: 'perimetros', P: 29.41, s: 2.37, d: 1 },
  { id: 'waist_cm', label: 'Cintura', group: 'perimetros', P: 71.91, s: 4.45, d: 1 },
  { id: 'hip_cm', label: 'Cadera', group: 'perimetros', P: 94.67, s: 5.58, d: 1 },
  { id: 'thigh_right_cm', label: 'Muslo medio', group: 'perimetros', P: 53.2, s: 4.56, d: 1 },
  { id: 'calf_right_cm', label: 'Pierna', group: 'perimetros', P: 35.25, s: 2.3, d: 1 },
  { id: 'humerus_breadth_cm', label: 'Húmero', group: 'diametros', P: 6.48, s: 0.35, d: 1 },
  { id: 'wrist_breadth_cm', label: 'Biestiloideo', group: 'diametros', P: 5.21, s: 0.28, d: 1 },
  { id: 'femur_breadth_cm', label: 'Fémur', group: 'diametros', P: 9.52, s: 0.48, d: 1 },
  { id: 'corrected_arm', label: 'Brazo corregido', group: 'corregidos', P: 22.05, s: 1.91, d: 1 },
  { id: 'corrected_thigh', label: 'Muslo corregido', group: 'corregidos', P: 47.34, s: 3.59, d: 1 },
  { id: 'corrected_calf', label: 'Pierna corregida', group: 'corregidos', P: 30.22, s: 1.97, d: 1 },
  { id: 'fat_mass_kg', label: 'Masa grasa', group: 'masas', P: 12.13, s: 3.25, d: 3 },
  { id: 'adipose_kg', label: 'Tejido adiposo', group: 'masas', P: 25.6, s: 5.85, d: 3 },
  { id: 'muscle_kg', label: 'Tejido muscular', group: 'masas', P: 25.55, s: 2.99, d: 3 },
  { id: 'bone_kg', label: 'Tejido óseo', group: 'masas', P: 10.49, s: 1.57, d: 3 },
];

export function phantomZ(value: number, heightCm: number, ref: Pick<PhantomRef, 'P' | 's' | 'd'>): number {
  return (value * phantomScale(heightCm) ** ref.d - ref.P) / ref.s;
}

/** Filas Phantom para los valores disponibles (z = null si falta el valor o la talla). */
export function phantomRows(values: Record<string, number | null | undefined>, heightCm: number | null): PhantomRow[] {
  return PHANTOM.map((ref) => {
    const value = values[ref.id] ?? null;
    return {
      id: ref.id,
      label: ref.label,
      group: ref.group,
      value,
      z: value != null && heightCm != null && heightCm > 0 ? phantomZ(value, heightCm, ref) : null,
    };
  });
}
