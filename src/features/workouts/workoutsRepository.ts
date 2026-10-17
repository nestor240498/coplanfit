import { supabase } from '@/lib/supabase';

import { WorkoutPlanData, WorkoutPlanVersion } from './types';

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


/** Borra un borrador de rutina (nunca una versión publicada). */
export async function deleteWorkoutDraft(draftId: string): Promise<void> {
  const { error } = await supabase.from('workout_plan_versions').delete().eq('id', draftId).eq('is_current', false);
  if (error) throw new Error(error.message);
}

/** Guarda (reemplaza) el borrador de rutina del cliente. Solo hay uno por cliente. */
export async function saveWorkoutDraft(clientId: string, name: string, data: WorkoutPlanData): Promise<void> {
  const { error: deleteError } = await supabase
    .from('workout_plan_versions')
    .delete()
    .eq('client_id', clientId)
    .eq('is_current', false)
    .filter('data->>is_draft', 'eq', 'true');
  if (deleteError) throw new Error(deleteError.message);

  const { error } = await supabase.from('workout_plan_versions').insert({
    client_id: clientId,
    version: 0,
    name: `${name.trim() || 'Rutina'} (Borrador)`,
    is_current: false,
    data: { ...data, is_draft: true },
  });
  if (error) throw new Error(error.message);
}

/**
 * Publica una nueva versión vigente de la rutina: borra el borrador, desmarca la vigente anterior
 * e inserta la nueva. Si la inserción falla, se vuelve a marcar como vigente la anterior.
 */
export async function publishWorkoutPlan(
  clientId: string,
  name: string,
  data: WorkoutPlanData
): Promise<WorkoutPlanVersion> {
  const { data: latest, error: latestError } = await supabase
    .from('workout_plan_versions')
    .select('id, version, is_current')
    .eq('client_id', clientId)
    .order('version', { ascending: false })
    .limit(20);
  if (latestError) throw new Error(latestError.message);

  const nextVersion = Math.max(0, ...(latest ?? []).map((v) => v.version)) + 1;
  const previousCurrent = (latest ?? []).find((v) => v.is_current);

  if (previousCurrent) {
    const { error } = await supabase.from('workout_plan_versions').update({ is_current: false }).eq('id', previousCurrent.id);
    if (error) throw new Error(error.message);
  }

  const { data: created, error: insertError } = await supabase
    .from('workout_plan_versions')
    .insert({
      client_id: clientId,
      version: nextVersion,
      name: name.trim() || `Rutina versión ${nextVersion}`,
      is_current: true,
      data: { ...data, is_draft: false },
    })
    .select()
    .single();

  if (insertError) {
    // No dejar al cliente sin rutina vigente
    if (previousCurrent) {
      await supabase.from('workout_plan_versions').update({ is_current: true }).eq('id', previousCurrent.id);
    }
    throw new Error(insertError.message);
  }

  await supabase
    .from('workout_plan_versions')
    .delete()
    .eq('client_id', clientId)
    .eq('is_current', false)
    .filter('data->>is_draft', 'eq', 'true');

  return created as WorkoutPlanVersion;
}
