import { supabase } from '@/lib/supabase';

import { Client, Goal } from './types';

export type ClientPatch = Partial<{
  full_name: string;
  age: number | null;
  goal: Goal | null;
  avatar_url: string | null;
  notes: string | null;
  medical_notes: string | null;
}>;

/**
 * Acceso a datos de clientes. RLS en Supabase limita cada consulta
 * al entrenador autenticado, por eso no se pasa trainer_id explícito.
 */

export async function listClients(): Promise<Client[]> {
  const { data: clientsData, error: clientsError } = await supabase
    .from('clients_with_current_plan')
    .select('*')
    .order('full_name', { ascending: true });
  if (clientsError) throw new Error(clientsError.message);

  const clients = (clientsData ?? []) as Client[];
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
      goal: input.goal ?? null,
      ...(input.avatar_url ? { avatar_url: input.avatar_url } : {}),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { ...(data as Omit<Client, 'current_plan_version'>), current_plan_version: null };
}

export async function getClient(id: string): Promise<Client> {
  const { data, error } = await supabase.from('clients_with_current_plan').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Client;
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
