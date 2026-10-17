import { edgeFunctionError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import { executionFromExercise } from './prescription';
import { singleBlock, supersetBlock } from './routineGenerator';
import { Exercise, RoutineGenerationSettings, SingleExerciseExecution, WorkoutBlock, WorkoutDay } from './types';

type AiExercise = { exercise_id: string; reps?: string; weight?: string; rir?: string; notes?: string };
type AiBlock = { type: 'single' | 'superset'; sets: number; rest_seconds: number; exercises: AiExercise[] };
type AiResponse = { success?: boolean; data?: { days: { day_index: number; blocks: AiBlock[] }[] }; error?: string };

function toExecution(ai: AiExercise, byId: Map<string, Exercise>): SingleExerciseExecution | null {
  const ex = byId.get(ai.exercise_id);
  if (!ex) return null;
  const base = executionFromExercise(ex);
  return {
    ...base,
    reps: ai.reps?.trim() || base.reps,
    weight: ai.weight?.trim() || null,
    rir: ai.rir?.trim() || base.rir,
    notes: ai.notes?.trim() || null,
  };
}

/**
 * Pide a la IA la propuesta de rutina usando SOLO los ejercicios elegibles del banco.
 * Devuelve los días con sus bloques enlazados por exercise_id; lanza un error si la IA no responde
 * (quien llama usa entonces la propuesta local `buildRoutineFromBank`).
 */
export async function generateRoutineWithAi(
  clientId: string,
  days: WorkoutDay[],
  eligible: Exercise[],
  settings: RoutineGenerationSettings
): Promise<WorkoutDay[]> {
  const { data, error } = await supabase.functions.invoke<AiResponse>('generate-workout-suggestions', {
    body: {
      clientId,
      exercisesPerDay: settings.exercisesPerDay,
      allowSupersets: settings.allowSupersets,
      days: days.map((d, index) => ({ index, day_name: d.day_name, focus: d.focus, muscles: d.muscles ?? [] })),
      catalog: eligible.map((ex) => ({
        id: ex.id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        secondary_muscles: ex.secondary_muscles ?? [],
        movement_pattern: ex.movement_pattern ?? null,
        exercise_type: ex.exercise_type ?? null,
        equipment: ex.equipment,
        laterality: ex.laterality ?? 'bilateral',
        metric: ex.metric ?? 'reps_peso',
      })),
    },
  });
  if (error) throw await edgeFunctionError(error, 'La IA no respondió.');
  if (!data?.data?.days) throw new Error(data?.error ?? 'La IA no respondió.');

  const byId = new Map(eligible.map((ex) => [ex.id, ex]));
  return days.map((day, index) => {
    const aiDay = data.data!.days.find((d) => d.day_index === index);
    const blocks: WorkoutBlock[] = (aiDay?.blocks ?? []).flatMap((b) => {
      const executions = b.exercises.map((e) => toExecution(e, byId)).filter((e): e is SingleExerciseExecution => !!e);
      if (executions.length === 0) return [];
      if (b.type === 'superset' && executions.length > 1) return [supersetBlock(executions, b.sets, b.rest_seconds)];
      return executions.map((exec) => singleBlock(exec, b.sets, b.rest_seconds));
    });
    return { ...day, blocks };
  });
}
