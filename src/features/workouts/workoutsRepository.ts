import { supabase } from '@/lib/supabase';

import { Exercise, MuscleGroup, WorkoutPlanVersion } from './types';

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const msg = (error as Error)?.message ?? '';
    if (
      retries > 0 &&
      (msg.includes('JWT') || msg.includes('token') || msg.includes('future') || msg.includes('expired'))
    ) {
      await supabase.auth.refreshSession().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 800));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

/** Lista las versiones de rutinas de entrenamiento de un cliente */
export async function listWorkoutPlanVersions(clientId: string): Promise<WorkoutPlanVersion[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('workout_plan_versions')
      .select('*')
      .eq('client_id', clientId)
      .order('version', { ascending: false });

    if (error) {
      // Si la tabla no existe aún en Supabase mientras el usuario ejecuta la migración, devolvemos array vacío
      console.warn('Advertencia al consultar workout_plan_versions:', error.message);
      return [];
    }

    return (data ?? []) as WorkoutPlanVersion[];
  });
}

/** Obtiene una versión específica de rutina */
export async function getWorkoutPlanVersionById(id: string): Promise<WorkoutPlanVersion> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('workout_plan_versions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as WorkoutPlanVersion;
  });
}

/** Lista ejercicios del catálogo con filtro opcional por grupo muscular o búsqueda */
export async function listExercises(filter?: {
  muscle_group?: MuscleGroup;
  search?: string;
}): Promise<Exercise[]> {
  return withRetry(async () => {
    let query = supabase.from('exercises').select('*').order('name', { ascending: true });

    if (filter?.muscle_group) {
      query = query.eq('muscle_group', filter.muscle_group);
    }

    if (filter?.search && filter.search.trim().length > 0) {
      query = query.ilike('name', `%${filter.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Advertencia al consultar exercises:', error.message);
      return [];
    }

    return (data ?? []) as Exercise[];
  });
}
