import { supabase } from '@/lib/supabase';

import { FoodSuggestions, MealAssignments, MealSlot, Supplement } from './planBuilderTypes';
import { PlanVersion } from './types';

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

export async function listPlanVersions(clientId: string): Promise<PlanVersion[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('plan_versions')
      .select('id, client_id, version, is_current, created_at')
      .eq('client_id', clientId)
      .order('version', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as PlanVersion[];
  });
}

export type PlanVersionData = {
  mealSlots: MealSlot[];
  waterLiters: string;
  supplements: Supplement[];
  aiNote: string;
  suggestions: FoodSuggestions;
  meals: MealAssignments;
  is_draft?: boolean;
  savedStep?: 1 | 2 | 3;
};

export type PlanVersionWithData = PlanVersion & { data: PlanVersionData };

export async function getPlanVersionById(id: string): Promise<PlanVersionWithData> {
  return withRetry(async () => {
    const { data, error } = await supabase.from('plan_versions').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data as PlanVersionWithData;
  });
}

/** Obtiene el último plan publicado o registrado del cliente */
export async function getLatestPlanVersion(clientId: string): Promise<PlanVersionWithData | null> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('plan_versions')
      .select('*')
      .eq('client_id', clientId)
      .filter('data->>is_draft', 'neq', 'true')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as PlanVersionWithData | null;
  });
}

/** Obtiene el borrador activo del cliente si existe */
export async function getPlanDraft(clientId: string): Promise<PlanVersionWithData | null> {
  const { data, error } = await supabase
    .from('plan_versions')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_current', false)
    .filter('data->>is_draft', 'eq', 'true')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PlanVersionWithData | null;
}

/** Guarda o actualiza un borrador de plan */
export async function savePlanDraft(
  clientId: string,
  data: PlanVersionData
): Promise<PlanVersionWithData> {
  const existingDraft = await getPlanDraft(clientId);

  const draftData: PlanVersionData = {
    ...data,
    is_draft: true,
  };

  if (existingDraft) {
    const { data: updated, error } = await supabase
      .from('plan_versions')
      .update({ data: draftData })
      .eq('id', existingDraft.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated as PlanVersionWithData;
  }

  // Si no existe, crear un nuevo registro de borrador
  const { data: maxVer } = await supabase
    .from('plan_versions')
    .select('version')
    .eq('client_id', clientId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from('plan_versions')
    .insert({
      client_id: clientId,
      version: (maxVer?.version ?? 0) + 1,
      is_current: false,
      data: draftData,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return created as PlanVersionWithData;
}

/** Elimina un borrador guardado */
export async function deletePlanDraft(clientId: string): Promise<void> {
  const { error } = await supabase
    .from('plan_versions')
    .delete()
    .eq('client_id', clientId)
    .eq('is_current', false)
    .filter('data->>is_draft', 'eq', 'true');

  if (error) throw new Error(error.message);
}

/** Crea una nueva versión de plan (vigente), desmarcando la anterior y eliminando cualquier borrador. */
export async function createPlanVersion(
  clientId: string,
  data: PlanVersionData
): Promise<PlanVersionWithData> {
  // Limpiar cualquier borrador existente
  await deletePlanDraft(clientId).catch(() => {});

  const { data: existing, error: existingError } = await supabase
    .from('plan_versions')
    .select('version')
    .eq('client_id', clientId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const { error: unsetError } = await supabase
    .from('plan_versions')
    .update({ is_current: false })
    .eq('client_id', clientId)
    .eq('is_current', true);
  if (unsetError) throw new Error(unsetError.message);

  const { data: created, error: insertError } = await supabase
    .from('plan_versions')
    .insert({
      client_id: clientId,
      version: (existing?.version ?? 0) + 1,
      is_current: true,
      data: {
        ...data,
        is_draft: false,
      },
    })
    .select()
    .single();
  if (insertError) throw new Error(insertError.message);
  return created as PlanVersionWithData;
}


