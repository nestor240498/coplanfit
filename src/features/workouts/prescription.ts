import { Exercise, ExerciseMetric, LATERALITIES, Laterality, SingleExerciseExecution } from './types';

/** Prescripción inicial al añadir un ejercicio a una rutina, según cómo se mide. */
const DEFAULTS: Record<ExerciseMetric, Pick<SingleExerciseExecution, 'reps' | 'rir'>> = {
  reps_peso: { reps: '10-12', rir: '1-2' },
  reps: { reps: '12-15', rir: '1-2' },
  tiempo: { reps: '30 s', rir: null },
  distancia: { reps: '200 m', rir: null },
  reps_asistencia: { reps: '8-10', rir: '1-2' },
};

/** Crea la ejecución de un ejercicio del banco para una rutina (hereda métrica y lateralidad). */
export function executionFromExercise(ex: Exercise): SingleExerciseExecution {
  const metric = ex.metric ?? 'reps_peso';
  return {
    // Los ejercicios de respaldo en memoria (default-N) no existen en BD: no se enlazan por id
    exercise_id: ex.id.startsWith('default-') ? undefined : ex.id,
    name: ex.name,
    metric,
    laterality: ex.laterality ?? 'bilateral',
    ...DEFAULTS[metric],
    // Las notas son del cliente en esta rutina; la técnica general se ve en el detalle del ejercicio
    notes: null,
  };
}

/** "por lado", "por lado, alternando" o "" según la lateralidad. */
export function lateralitySuffix(laterality: Laterality | undefined): string {
  return LATERALITIES.find((l) => l.id === laterality)?.suffix ?? '';
}

/** Texto de la prescripción según cómo se mide: "10-12 reps por lado", "30 s", "200 m". */
export function formatPrescription(ex: Pick<SingleExerciseExecution, 'reps' | 'metric' | 'laterality'>): string {
  const target = ex.reps?.trim() || '—';
  const metric = ex.metric ?? 'reps_peso';
  const unitless = /^[\d\s\-–,.]+$/.test(target);
  let text = target;
  if (metric === 'tiempo') text = unitless ? `${target} s` : target;
  else if (metric === 'distancia') text = unitless ? `${target} m` : target;
  else text = unitless ? `${target} reps` : target;
  if (metric === 'reps_asistencia') text += ' (asistida)';
  const suffix = lateralitySuffix(ex.laterality);
  return suffix ? `${text} ${suffix}` : text;
}

/** Etiqueta del campo objetivo en los formularios de la rutina. */
export function targetFieldLabel(metric: ExerciseMetric | undefined): string {
  if (metric === 'tiempo') return 'Tiempo';
  if (metric === 'distancia') return 'Distancia';
  return 'Reps';
}
