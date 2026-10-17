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
  | 'gemelos'
  | 'trapecio'
  | 'antebrazos'
  | 'lumbar'
  | 'aductores'
  | 'abductores'
  | 'cuerpo_completo';

export const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: 'pecho', label: 'Pecho' },
  { id: 'espalda', label: 'Espalda' },
  { id: 'hombros', label: 'Hombros' },
  { id: 'biceps', label: 'Bíceps' },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'cuadriceps', label: 'Cuádriceps' },
  { id: 'isquiotibiales', label: 'Isquiosurales / Femoral' },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'core', label: 'Core / Abdomen' },
  { id: 'gemelos', label: 'Gemelos / Pantorrillas' },
  { id: 'trapecio', label: 'Trapecio' },
  { id: 'antebrazos', label: 'Antebrazos' },
  { id: 'lumbar', label: 'Lumbar' },
  { id: 'aductores', label: 'Aductores' },
  { id: 'abductores', label: 'Abductores' },
  { id: 'cuerpo_completo', label: 'Cuerpo completo' },
];

export function muscleLabel(id: string): string {
  return MUSCLE_GROUPS.find((m) => m.id === id)?.label ?? id;
}

/** Equipamiento de un ejercicio del banco (no confundir con EQUIPMENT_OPTIONS: acceso del cliente). */
export const EXERCISE_EQUIPMENT: { id: string; label: string }[] = [
  { id: 'barra', label: 'Barra' },
  { id: 'mancuernas', label: 'Mancuernas' },
  { id: 'polea', label: 'Polea' },
  { id: 'maquina', label: 'Máquina' },
  { id: 'peso_corporal', label: 'Peso corporal' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'multipower', label: 'Multipower / Smith' },
  { id: 'barra_z', label: 'Barra Z' },
  { id: 'bandas', label: 'Bandas' },
  { id: 'trx', label: 'TRX / Suspensión' },
  { id: 'landmine', label: 'Landmine' },
  { id: 'disco', label: 'Disco' },
  { id: 'balon_medicinal', label: 'Balón medicinal' },
  { id: 'fitball', label: 'Fitball' },
  { id: 'banco', label: 'Banco' },
  { id: 'cajon', label: 'Cajón / step' },
  { id: 'barra_dominadas', label: 'Barra de dominadas' },
  { id: 'cardio', label: 'Máquina de cardio' },
  { id: 'otro', label: 'Otro' },
];

export function equipmentLabel(id: string): string {
  return EXERCISE_EQUIPMENT.find((e) => e.id === id)?.label ?? id;
}

export type ExerciseType =
  | 'fuerza'
  | 'aislamiento'
  | 'cardio'
  | 'movilidad'
  | 'pliometria'
  | 'calentamiento'
  | 'rehabilitacion';

export const EXERCISE_TYPES: { id: ExerciseType; label: string }[] = [
  { id: 'fuerza', label: 'Fuerza (multiarticular)' },
  { id: 'aislamiento', label: 'Aislamiento / accesorio' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'movilidad', label: 'Movilidad / estiramiento' },
  { id: 'pliometria', label: 'Pliometría / potencia' },
  { id: 'calentamiento', label: 'Activación / calentamiento' },
  { id: 'rehabilitacion', label: 'Rehabilitación / prevención' },
];

/** Cómo se mide y prescribe el ejercicio. */
export type ExerciseMetric = 'reps_peso' | 'reps' | 'tiempo' | 'distancia' | 'reps_asistencia';

export const EXERCISE_METRICS: { id: ExerciseMetric; label: string; hint: string }[] = [
  { id: 'reps_peso', label: 'Reps + peso', hint: '3 × 10 con 60 kg' },
  { id: 'reps', label: 'Solo reps', hint: '3 × 15 (peso corporal)' },
  { id: 'tiempo', label: 'Tiempo', hint: '3 × 30 s' },
  { id: 'distancia', label: 'Distancia', hint: '4 × 200 m' },
  { id: 'reps_asistencia', label: 'Reps + asistencia', hint: '3 × 8 con −20 kg' },
];

export type Laterality = 'bilateral' | 'unilateral' | 'alternado';

export const LATERALITIES: { id: Laterality; label: string; suffix: string }[] = [
  { id: 'bilateral', label: 'Bilateral', suffix: '' },
  { id: 'unilateral', label: 'Unilateral', suffix: 'por lado' },
  { id: 'alternado', label: 'Alternado', suffix: 'por lado, alternando' },
];

export type MovementPattern =
  | 'empuje_horizontal'
  | 'empuje_vertical'
  | 'traccion_horizontal'
  | 'traccion_vertical'
  | 'sentadilla'
  | 'bisagra'
  | 'zancada'
  | 'core_estabilidad'
  | 'core_flexion'
  | 'acarreo'
  | 'aislamiento'
  | 'cardio'
  | 'movilidad';

export const MOVEMENT_PATTERNS: { id: MovementPattern; label: string }[] = [
  { id: 'empuje_horizontal', label: 'Empuje horizontal' },
  { id: 'empuje_vertical', label: 'Empuje vertical' },
  { id: 'traccion_horizontal', label: 'Tracción horizontal' },
  { id: 'traccion_vertical', label: 'Tracción vertical' },
  { id: 'sentadilla', label: 'Dominante de rodilla' },
  { id: 'bisagra', label: 'Bisagra de cadera' },
  { id: 'zancada', label: 'Zancada / una pierna' },
  { id: 'core_estabilidad', label: 'Core: estabilidad' },
  { id: 'core_flexion', label: 'Core: flexión / rotación' },
  { id: 'acarreo', label: 'Acarreo / carga' },
  { id: 'aislamiento', label: 'Aislamiento' },
  { id: 'cardio', label: 'Cardio / locomoción' },
  { id: 'movilidad', label: 'Movilidad' },
];

function labelOf<T extends { id: string; label: string }>(list: T[], id: string | null | undefined): string | null {
  if (!id) return null;
  return list.find((item) => item.id === id)?.label ?? id;
}

export const exerciseTypeLabel = (id: string | null | undefined) => labelOf(EXERCISE_TYPES, id);
export const metricLabel = (id: string | null | undefined) => labelOf(EXERCISE_METRICS, id);
export const lateralityLabel = (id: string | null | undefined) => labelOf(LATERALITIES, id);
export const patternLabel = (id: string | null | undefined) => labelOf(MOVEMENT_PATTERNS, id);

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
  /** Qué es y qué trabaja, en una frase: se ve en la tarjeta del banco (migración 013). */
  description?: string | null;
  instructions?: string | null;
  tips?: string | null;
  images?: string[] | null; // URLs de fotos de los pasos (Paso 1, Paso 2, Paso 3)
  steps?: ExerciseStep[] | null;
  image_url?: string | null;
  is_custom: boolean;
  created_by?: string | null;
  created_at: string;
  /** Archivado: ya no aparece en el banco, pero las rutinas que lo usan lo conservan. */
  archived_at?: string | null;
  exercise_type?: ExerciseType | null;
  metric?: ExerciseMetric;
  laterality?: Laterality;
  movement_pattern?: MovementPattern | null;
  /** Equipo adicional al principal (p. ej. banco). */
  extra_equipment?: string[];
  /** Indicaciones breves para decir en sala. */
  cues?: string[];
  /** Condiciones o lesiones con las que conviene evitarlo o adaptarlo. */
  contraindications?: string[];
  /** Otros nombres con los que se busca. */
  aliases?: string[];
  /** Variante de otro ejercicio del banco. */
  parent_id?: string | null;
  /** Vídeo demostrativo propio (ruta en el bucket privado exercise-media). */
  video_path?: string | null;
};

export type SingleExerciseExecution = {
  exercise_id?: string;
  name: string;
  /** Copiados del ejercicio al añadirlo; se pueden cambiar solo en esta rutina. */
  metric?: ExerciseMetric;
  laterality?: Laterality;
  weight?: string | null; // ej: "60 kg", "20 kg / mancuerna", "4 placas"
  reps: string; // ej: "10-12", "12", "Al fallo"
  rir?: string | null; // ej: "1-2"
  tempo?: string | null; // ej: "3-0-1-0"
  notes?: string | null;
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
  /** Músculos que se trabajan ese día: guían la propuesta de ejercicios del banco. */
  muscles?: MuscleGroup[];
  blocks: WorkoutBlock[];
};

/** Cómo arma la propuesta la IA (lo decide el entrenador en el paso 1). */
export type RoutineGenerationSettings = {
  exercisesPerDay: number;
  allowSupersets: boolean;
};

export type WorkoutPlanData = {
  weekly_schedule: WorkoutDay[];
  notes?: string;
  generation?: RoutineGenerationSettings;
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
