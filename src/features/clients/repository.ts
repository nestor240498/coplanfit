import { supabase } from '@/lib/supabase';

import { EquipmentAccess, TrainingGoal, TrainingLevel } from '../workouts/types';
import { Client, Goal } from './types';

export type ClientPatch = Partial<{
  full_name: string;
  age: number | null;
  birth_date: string | null;
  goal: Goal | null;
  avatar_url: string | null;
  notes: string | null;
  medical_notes: string | null;
  training_goal: TrainingGoal | null;
  training_level: TrainingLevel | null;
  equipment_access: EquipmentAccess | null;
  days_per_week: number | null;
  session_duration_min: number | null;
  training_notes: string | null;
}>;

/**
 * Acceso a datos de clientes. RLS en Supabase limita cada consulta
 * al entrenador autenticado, por eso no se pasa trainer_id explícito.
 */

export async function listClients(): Promise<Client[]> {
  const { data: clientsData, error: clientsError } = await supabase
    .from('clients')
    .select('*, plan_versions(version, is_current)')
    .order('full_name', { ascending: true });

  let clients: Client[];

  if (clientsError) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('clients_with_current_plan')
      .select('*')
      .order('full_name', { ascending: true });
    if (fallbackError) throw new Error(fallbackError.message);
    clients = (fallbackData ?? []) as Client[];
  } else {
    clients = (clientsData ?? []).map((c) => {
      const currentPv = Array.isArray(c.plan_versions)
        ? c.plan_versions.find((pv: { is_current: boolean; version: number }) => pv.is_current)
        : null;
      return {
        ...c,
        current_plan_version: currentPv ? currentPv.version : null,
      };
    }) as Client[];
  }

  if (clients.length === 0) return [];

  // Traer las mediciones recientes de estos clientes para mostrar últimas medidas
  try {
    const clientIds = clients.map((c) => c.id);
    const { data: measurementsData } = await supabase
      .from('measurements')
      .select('client_id, weight_kg, body_fat_pct, measured_at')
      .in('client_id', clientIds)
      .order('measured_at', { ascending: false });

    if (measurementsData && measurementsData.length > 0) {
      const measurementMap: Record<string, { weight_kg: number | null; body_fat_pct: number | null; measured_at: string }> = {};
      for (const m of measurementsData) {
        if (!measurementMap[m.client_id]) {
          measurementMap[m.client_id] = {
            weight_kg: m.weight_kg,
            body_fat_pct: m.body_fat_pct,
            measured_at: m.measured_at,
          };
        }
      }

      return clients.map((c) => ({
        ...c,
        latest_measurement: measurementMap[c.id] ?? null,
      }));
    }
  } catch {
    // Si falla la carga de mediciones, no bloqueamos la lista de clientes
  }

  return clients;
}

export async function createClient(input: {
  full_name: string;
  contact?: string;
  age?: number;
  birth_date?: string;
  goal?: Goal;
  avatar_url?: string;
}): Promise<Client> {
  const { data: userData } = await supabase.auth.getUser();
  const trainerId = userData.user?.id;
  if (!trainerId) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

  const { data, error } = await supabase
    .from('clients')
    .insert({
      trainer_id: trainerId,
      full_name: input.full_name.trim(),
      contact: input.contact?.trim() || null,
      age: input.age ?? null,
      birth_date: input.birth_date ?? null,
      goal: input.goal ?? null,
      ...(input.avatar_url ? { avatar_url: input.avatar_url } : {}),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { ...(data as Omit<Client, 'current_plan_version'>), current_plan_version: null };
}

export async function getClient(id: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, plan_versions(version, is_current)')
    .eq('id', id)
    .single();

  if (error) {
    const { data: fallback, error: fbErr } = await supabase
      .from('clients_with_current_plan')
      .select('*')
      .eq('id', id)
      .single();
    if (fbErr) throw new Error(fbErr.message);
    return fallback as Client;
  }

  const currentPlan = Array.isArray(data.plan_versions)
    ? data.plan_versions.find((pv: { is_current: boolean; version: number }) => pv.is_current)
    : null;

  return {
    ...data,
    current_plan_version: currentPlan ? currentPlan.version : null,
  } as Client;
}

export async function updateClient(id: string, patch: ClientPatch): Promise<void> {
  const { error } = await supabase.from('clients').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Sube la foto del cliente a Supabase Storage y devuelve la URL pública con cache-busting. */
export async function uploadClientAvatar(clientId: string, localUri: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const trainerId = userData.user?.id;
  if (!trainerId) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

  const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  // La ruta debe comenzar con el ID del entrenador para cumplir con las políticas RLS de Supabase Storage
  const path = `${trainerId}/clients/${clientId}.${ext}`;

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, arrayBuffer, { contentType, upsert: true });

  if (uploadError) {
    // Si falla en bucket logos, intentamos en bucket avatars
    const { error: avatarBucketErr } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, { contentType, upsert: true });
    if (avatarBucketErr) throw new Error(uploadError.message);
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  }

  const { data } = supabase.storage.from('logos').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
