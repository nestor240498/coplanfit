import type { MeasurementEquations, MeasurementReadings, Sex } from '../anthropometry/engine';
import { EquipmentAccess, TrainingGoal, TrainingLevel } from '../workouts/types';

export type { Sex };

export type Goal = 'volumen' | 'definición' | 'subir de peso' | 'bajar de peso' | 'mantenimiento' | 'recomposición';

export const GOALS: Goal[] = ['volumen', 'definición', 'subir de peso', 'bajar de peso', 'mantenimiento', 'recomposición'];

export type Client = {
  id: string;
  trainer_id: string;
  full_name: string;
  contact: string | null;
  /** Teléfono internacional solo con dígitos (p. ej. 584121234567), para abrir WhatsApp. */
  phone?: string | null;
  age: number | null;
  birth_date?: string | null;
  /** Sexo para las ecuaciones de composición corporal (migración 015). */
  sex?: Sex | null;
  /** Deporte que practica (informe ISAK; sugiere ecuaciones de deportistas). */
  sport?: string | null;
  goal: Goal | null;
  avatar_url?: string | null;
  /** Cuándo aceptó el cliente que se guarden y envíen sus datos (lo declara el entrenador; migración 019). */
  consent_at?: string | null;
  consent_method?: ConsentMethod | null;
  /** Notas libres — tab Datos */
  notes: string | null;
  /** Notas médicas generales — tab Salud */
  medical_notes: string | null;

  /** Perfil de entrenamiento — tab Entrenamiento */
  training_goal?: TrainingGoal | null;
  training_level?: TrainingLevel | null;
  equipment_access?: EquipmentAccess | null;
  days_per_week?: number | null;
  session_duration_min?: number | null;
  training_notes?: string | null;

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

/** Cómo obtuvo el entrenador el consentimiento del cliente. */
export type ConsentMethod = 'escrito' | 'whatsapp' | 'verbal';

export const CONSENT_METHODS: { id: ConsentMethod; label: string }[] = [
  { id: 'whatsapp', label: 'Por WhatsApp' },
  { id: 'escrito', label: 'Por escrito' },
  { id: 'verbal', label: 'Verbal' },
];

export type TagKind = 'condicion' | 'alergia' | 'evita';

export type ClientTag = {
  id: string;
  client_id: string;
  kind: TagKind;
  label: string;
};

export type MeasurementProtocol = 'manual' | 'isak_restricted' | 'skinfolds' | 'import';

export type Measurement = {
  id: string;
  client_id: string;
  measured_at: string;
  created_at?: string;
  /** manual (registro rápido) · isak_restricted (evaluación ISAK) · import (Excel/CSV) */
  protocol?: MeasurementProtocol;
  /** Lecturas en bruto de la sesión ISAK (2-3 por punto). */
  readings?: MeasurementReadings | null;
  /** Fórmulas usadas al guardar (ISAK). */
  equations?: MeasurementEquations | null;
  // Medidas básicas ISAK (cm)
  sitting_height_cm?: number | null;
  arm_span_cm?: number | null;
  // Diámetros óseos ISAK (cm)
  humerus_breadth_cm?: number | null;
  wrist_breadth_cm?: number | null;
  femur_breadth_cm?: number | null;
  // Composición corporal
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  muscle_mass_pct?: number | null;
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
  /** Fotos de progreso asociadas a la medición */
  photos?: string[] | null;
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
