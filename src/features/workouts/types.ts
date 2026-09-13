export type TrainingGoal =
  | 'hipertrofia'
  | 'fuerza'
  | 'definicion'
  | 'resistencia'
  | 'mantenimiento';

export const TRAINING_GOALS: { id: TrainingGoal; label: string; description: string }[] = [
  { id: 'hipertrofia', label: 'Hipertrofia', description: 'Ganancia y desarrollo de masa muscular' },
  { id: 'fuerza', label: 'Fuerza', description: 'Aumento de fuerza máxima y rendimiento' },
  { id: 'definicion', label: 'Definición / Quema de grasa', description: 'Preservación muscular con alto gasto calórico' },
  { id: 'resistencia', label: 'Resistencia muscular', description: 'Acondicionamiento físico y resistencia' },
  { id: 'mantenimiento', label: 'Mantenimiento / Salud', description: 'Tono muscular, movilidad y salud general' },
];

export type TrainingLevel = 'principiante' | 'intermedio' | 'avanzado';

export const TRAINING_LEVELS: { id: TrainingLevel; label: string; description: string }[] = [
  { id: 'principiante', label: 'Principiante', description: 'Menos de 1 año entrenando de forma constante' },
  { id: 'intermedio', label: 'Intermedio', description: '1 a 3 años de experiencia con buena técnica' },
  { id: 'avanzado', label: 'Avanzado', description: 'Más de 3 años de entrenamiento estructurado' },
];

export type EquipmentAccess =
  | 'gimnasio_completo'
  | 'mancuernas_casa'
  | 'calistenia'
  | 'basico_casa';

export const EQUIPMENT_OPTIONS: { id: EquipmentAccess; label: string; description: string }[] = [
  { id: 'gimnasio_completo', label: 'Gimnasio completo', description: 'Barras, mancuernas, poleas y máquinas guiadas' },
  { id: 'mancuernas_casa', label: 'Mancuernas en casa', description: 'Mancuernas ajustables y banco' },
  { id: 'calistenia', label: 'Calistenia / Peso corporal', description: 'Barra de dominadas, fondos y suelo' },
  { id: 'basico_casa', label: 'Básico en casa (Bandas y peso libre)', description: 'Bandas elásticas y accesorios mínimos' },
];

export type MuscleGroup =
  | 'pecho'
  | 'espalda'
  | 'cuadriceps'
  | 'isquiotibiales'
  | 'hombros'
  | 'biceps'
  | 'triceps'
  | 'gluteos'
  | 'core'
  | 'gemelos';

export const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: 'pecho', label: 'Pecho' },
  { id: 'espalda', label: 'Espalda' },
  { id: 'cuadriceps', label: 'Cuádriceps' },
  { id: 'isquiotibiales', label: 'Isquiosurales / Femoral' },
  { id: 'hombros', label: 'Hombros' },
  { id: 'biceps', label: 'Bíceps' },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'core', label: 'Core / Abdomen' },
  { id: 'gemelos', label: 'Gemelos / Pantorrillas' },
];

export type ExerciseStep = {
  step: number; // 1, 2, 3
  title: string; // ej: "Posición Inicial & Setup", "Fase Excéntrica", "Fase Concéntrica & Bloqueo"
  description: string;
  image_url?: string | null;
};

export type Exercise = {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscles?: MuscleGroup[];
  equipment: string;
  difficulty: TrainingLevel;
  instructions?: string | null;
  tips?: string | null;
  images?: string[] | null; // URLs de fotos de los pasos (Paso 1, Paso 2, Paso 3)
  steps?: ExerciseStep[] | null;
  image_url?: string | null;
  lottie_url?: string | null;
  is_custom: boolean;
  created_by?: string | null;
  created_at: string;
};

export type SingleExerciseExecution = {
  exercise_id?: string;
  name: string;
  weight?: string | null; // ej: "60 kg", "20 kg / mancuerna", "4 placas"
  reps: string; // ej: "10-12", "12", "Al fallo"
  rir?: string | null; // ej: "1-2"
  tempo?: string | null; // ej: "3-0-1-0"
  notes?: string | null;
  lottie_url?: string | null;
};

export type WorkoutBlock =
  | {
      type: 'single';
      id: string;
      exercise: SingleExerciseExecution;
      sets: number;
      rest_seconds: number;
    }
  | {
      type: 'superset';
      id: string;
      title: string; // ej: "Superserie A"
      sets: number;
      rest_seconds: number; // Descanso tras completar la ronda combinada
      exercises: SingleExerciseExecution[];
    };

export type WorkoutDay = {
  id: string;
  day_name: string; // ej: "Día 1: Empuje (Pecho, Hombro, Tríceps)"
  focus?: string; // ej: "Fuerza / Hipertrofia"
  blocks: WorkoutBlock[];
};

export type WorkoutPlanData = {
  weekly_schedule: WorkoutDay[];
  notes?: string;
  savedStep?: number;
  is_draft?: boolean;
};

export type WorkoutPlanVersion = {
  id: string;
  client_id: string;
  version: number;
  is_current: boolean;
  name: string;
  data: WorkoutPlanData;
  created_at: string;
};
