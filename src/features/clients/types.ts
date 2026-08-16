export type Goal = 'volumen' | 'definición' | 'subir de peso' | 'bajar de peso' | 'mantenimiento' | 'recomposición';

export const GOALS: Goal[] = ['volumen', 'definición', 'subir de peso', 'bajar de peso', 'mantenimiento', 'recomposición'];

export type Client = {
  id: string;
  trainer_id: string;
  full_name: string;
  contact: string | null;
  age: number | null;
  goal: Goal | null;
  avatar_url?: string | null;
  /** Notas libres — tab Datos */
  notes: string | null;
  /** Notas médicas generales — tab Salud */
  medical_notes: string | null;
  /** Versión de plan vigente (null si aún no tiene plan) */
  current_plan_version: number | null;
  /** Última medición registrada (opcional en listado) */
  latest_measurement?: {
    weight_kg: number | null;
    body_fat_pct: number | null;
    measured_at: string;
  } | null;
  created_at: string;
};

export type TagKind = 'condicion' | 'alergia' | 'evita';

export type ClientTag = {
  id: string;
  client_id: string;
  kind: TagKind;
  label: string;
};

export type Measurement = {
  id: string;
  client_id: string;
  measured_at: string;
  // Composición corporal
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  muscle_mass_pct?: number | null;
  bone_mass_kg?: number | null;
  water_pct?: number | null;
  visceral_fat?: number | null;
  bmr_kcal?: number | null;
  // Perímetros corporales (cm)
  neck_cm?: number | null;
  shoulders_cm?: number | null;
  chest_cm?: number | null;
  waist_cm: number | null;
  abdomen_cm?: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  arm_right_cm?: number | null;
  arm_left_cm?: number | null;
  arm_flexed_right_cm?: number | null;
  arm_flexed_left_cm?: number | null;
  forearm_right_cm?: number | null;
  forearm_left_cm?: number | null;
  thigh_right_cm?: number | null;
  thigh_left_cm?: number | null;
  calf_right_cm?: number | null;
  calf_left_cm?: number | null;
  // Plicometría (mm)
  triceps_mm: number | null;
  biceps_mm?: number | null;
  subscapular_mm: number | null;
  suprailiac_mm?: number | null;
  supraspinal_mm?: number | null;
  abdominal_mm: number | null;
  thigh_mm?: number | null;
  calf_mm?: number | null;
  chest_mm?: number | null;
  midaxillary_mm?: number | null;
  /** Calculados server-side (columnas generadas) */
  bmi: number | null;
  waist_hip_ratio: number | null;
};

export type PlanVersion = {
  id: string;
  client_id: string;
  version: number;
  is_current: boolean;
  created_at: string;
};
