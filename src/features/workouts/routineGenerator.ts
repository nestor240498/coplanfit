import { findSubstitutes, normalizeText } from './exerciseSearch';
import { executionFromExercise } from './prescription';
import {
  EquipmentAccess,
  Exercise,
  MuscleGroup,
  muscleLabel,
  RoutineGenerationSettings,
  SingleExerciseExecution,
  WorkoutBlock,
  WorkoutDay,
} from './types';

/**
 * Reglas para armar rutinas SOLO con ejercicios del banco (oficiales + propios).
 * Las usan la propuesta local, la validación de la propuesta de la IA y el botón "Cambiar".
 */

export const DEFAULT_GENERATION: RoutineGenerationSettings = { exercisesPerDay: 6, allowSupersets: true };

/** Equipo que tiene el cliente según su perfil fitness. `null` = gimnasio completo (todo vale). */
const EQUIPMENT_BY_ACCESS: Record<EquipmentAccess, string[] | null> = {
  gimnasio_completo: null,
  mancuernas_casa: ['mancuernas', 'peso_corporal', 'banco', 'bandas', 'kettlebell', 'fitball', 'cajon', 'disco', 'otro'],
  calistenia: ['peso_corporal', 'barra_dominadas', 'trx', 'bandas', 'cajon', 'otro'],
  basico_casa: ['peso_corporal', 'bandas', 'fitball', 'cajon', 'otro'],
};

export type ClientTrainingContext = {
  equipmentAccess?: EquipmentAccess | null;
  /** Etiquetas de condición médica del cliente (client_tags.kind = 'condicion'). */
  conditions: string[];
};

export function isEquipmentAvailable(ex: Exercise, access: EquipmentAccess | null | undefined): boolean {
  const allowed = access ? EQUIPMENT_BY_ACCESS[access] : null;
  if (!allowed) return true;
  return [ex.equipment, ...(ex.extra_equipment ?? [])].every((eq) => allowed.includes(eq));
}

// Palabras demasiado genéricas para decidir que una condición coincide con una contraindicación
const GENERIC_HEALTH_WORDS = new Set([
  'dolor', 'dolores', 'lesion', 'lesiones', 'molestia', 'molestias', 'cronico', 'cronica', 'leve', 'grave',
  'problema', 'problemas', 'historial', 'previa', 'previo', 'reciente', 'zona',
]);

function healthKeywords(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((w) => w.length >= 4 && !GENERIC_HEALTH_WORDS.has(w));
}

/**
 * Contraindicaciones del ejercicio que coinciden con las condiciones del cliente.
 * Coinciden si comparten una palabra significativa ("hernia discal" ↔ "hernia discal lumbar",
 * "lesión de hombro" ↔ "dolor de hombro").
 */
export function conflictingContraindications(ex: Exercise, conditions: string[]): string[] {
  if (!ex.contraindications?.length || conditions.length === 0) return [];
  const conditionWords = new Set(conditions.flatMap(healthKeywords));
  return ex.contraindications.filter((c) => healthKeywords(c).some((w) => conditionWords.has(w)));
}

/** Ejercicios del banco que este cliente puede hacer (equipo disponible y sin contraindicaciones). */
export function eligibleExercises(bank: Exercise[], ctx: ClientTrainingContext): Exercise[] {
  return bank.filter(
    (ex) => isEquipmentAvailable(ex, ctx.equipmentAccess) && conflictingContraindications(ex, ctx.conditions).length === 0
  );
}

/** Músculos del día sin ningún ejercicio elegible en el banco (para avisar antes de generar). */
export function missingMuscles(days: WorkoutDay[], eligible: Exercise[]): MuscleGroup[] {
  const covered = new Set(eligible.map((ex) => ex.muscle_group));
  const wanted = new Set(days.flatMap((d) => d.muscles ?? []));
  return [...wanted].filter((m) => !covered.has(m));
}

function newBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function singleBlock(execution: SingleExerciseExecution, sets = 3, restSeconds = 90): WorkoutBlock {
  return { type: 'single', id: newBlockId(), exercise: execution, sets, rest_seconds: restSeconds };
}

export function supersetBlock(executions: SingleExerciseExecution[], sets = 3, restSeconds = 90): WorkoutBlock {
  return {
    type: 'superset',
    id: newBlockId(),
    title: `Superserie: ${executions.map((e) => e.name).join(' + ')}`,
    sets,
    rest_seconds: restSeconds,
    exercises: executions,
  };
}

/** Orden dentro del día: primero los multiarticulares, luego accesorios. */
function priority(ex: Exercise): number {
  if (ex.exercise_type === 'fuerza') return 0;
  if (ex.exercise_type === 'pliometria') return 1;
  if (ex.exercise_type === 'aislamiento') return 2;
  return 3;
}

/**
 * Propuesta armada en el dispositivo (sin IA), solo con ejercicios elegibles del banco.
 * Reparte los ejercicios entre los músculos del día, sin repetir, y opcionalmente agrupa
 * los dos últimos accesorios en una superserie.
 */
export function buildRoutineFromBank(
  days: WorkoutDay[],
  eligible: Exercise[],
  settings: RoutineGenerationSettings
): WorkoutDay[] {
  const usedAcrossWeek = new Map<string, number>();

  return days.map((day) => {
    const muscles = day.muscles?.length ? day.muscles : [];
    const pools = muscles.map((m) =>
      eligible
        .filter((ex) => ex.muscle_group === m)
        // Menos repetidos en la semana primero, luego multiarticulares
        .sort((a, b) => (usedAcrossWeek.get(a.id) ?? 0) - (usedAcrossWeek.get(b.id) ?? 0) || priority(a) - priority(b))
    );

    const picked: Exercise[] = [];
    let round = 0;
    while (picked.length < settings.exercisesPerDay && pools.some((p) => p.length > round)) {
      for (const pool of pools) {
        const candidate = pool[round];
        if (candidate && !picked.includes(candidate) && picked.length < settings.exercisesPerDay) picked.push(candidate);
      }
      round += 1;
    }
    picked.sort((a, b) => priority(a) - priority(b));
    picked.forEach((ex) => usedAcrossWeek.set(ex.id, (usedAcrossWeek.get(ex.id) ?? 0) + 1));

    const executions = picked.map((ex) => executionFromExercise(ex));
    const blocks: WorkoutBlock[] = [];
    const pairLast = settings.allowSupersets && executions.length >= 4;
    const singles = pairLast ? executions.slice(0, -2) : executions;
    singles.forEach((exec, i) => blocks.push(singleBlock(exec, i < 2 ? 4 : 3, i < 2 ? 120 : 90)));
    if (pairLast) blocks.push(supersetBlock(executions.slice(-2), 3, 90));

    return { ...day, blocks };
  });
}

/**
 * Dos ejercicios del banco para sustituir a uno de la rutina: mismo patrón de movimiento o
 * mismo músculo, que el cliente pueda hacer y que no estén ya en ese día.
 */
export function suggestReplacements(
  current: SingleExerciseExecution,
  bank: Exercise[],
  ctx: ClientTrainingContext,
  excludeIds: string[],
  count = 2
): Exercise[] {
  const eligible = eligibleExercises(bank, ctx).filter((ex) => !excludeIds.includes(ex.id));
  const original = bank.find((ex) => ex.id === current.exercise_id);
  if (!original) {
    // Ejercicio sin enlace al banco (rutinas antiguas): se busca por nombre parecido del mismo músculo
    const words = normalizeText(current.name).split(' ');
    return eligible.filter((ex) => words.some((w) => w.length > 4 && normalizeText(ex.name).includes(w))).slice(0, count);
  }
  const byPattern = findSubstitutes(original, eligible, count);
  if (byPattern.length >= count) return byPattern;
  const sameMuscle = eligible.filter((ex) => ex.muscle_group === original.muscle_group && !byPattern.includes(ex));
  return [...byPattern, ...sameMuscle].slice(0, count);
}

/** Cambia el ejercicio conservando lo que el entrenador ya ajustó si la forma de medirlo no cambia. */
export function replaceExecution(current: SingleExerciseExecution, next: Exercise): SingleExerciseExecution {
  const fresh = executionFromExercise(next);
  if (fresh.metric === current.metric) {
    return { ...fresh, reps: current.reps, rir: current.rir, weight: null, tempo: current.tempo, notes: current.notes };
  }
  return { ...fresh, notes: current.notes };
}

export function describeMissing(muscles: MuscleGroup[]): string {
  return muscles.map(muscleLabel).join(', ');
}
