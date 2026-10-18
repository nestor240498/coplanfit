import { uploadClientMedia } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

import { EquipmentAccess, TrainingGoal, TrainingLevel } from '../workouts/types';
import { Client, ConsentMethod, Goal, Sex } from './types';

export type ClientPatch = Partial<{
  full_name: string;
  contact: string | null;
  phone: string | null;
  age: number | null;
  birth_date: string | null;
  sex: Sex | null;
  sport: string | null;
  goal: Goal | null;
  avatar_url: string | null;
  consent_at: string | null;
  consent_method: ConsentMethod | null;
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
      .order('measured_at', { ascending: false })
      .order('created_at', { ascending: false });

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
  phone?: string | null;
  age?: number;
  birth_date?: string;
  sex?: Sex | null;
  goal?: Goal;
  avatar_url?: string;
  consent_method?: ConsentMethod | null;
}): Promise<Client> {
  // Sesión local (sin llamada de red); RLS comprueba igualmente que trainer_id = auth.uid()
  const { data: sessionData } = await supabase.auth.getSession();
  const trainerId = sessionData.session?.user.id;
  if (!trainerId) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

  const { data, error } = await supabase
    .from('clients')
    .insert({
      trainer_id: trainerId,
      full_name: input.full_name.trim(),
      contact: input.contact?.trim() || null,
      phone: input.phone ?? null,
      age: input.age ?? null,
      birth_date: input.birth_date ?? null,
      ...(input.sex ? { sex: input.sex } : {}),
      goal: input.goal ?? null,
      ...(input.avatar_url ? { avatar_url: input.avatar_url } : {}),
      ...(input.consent_method ? { consent_method: input.consent_method, consent_at: new Date().toISOString() } : {}),
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

/** Sube la foto del cliente al bucket privado y devuelve su ruta (se guarda en `avatar_url`). */
export async function uploadClientAvatar(clientId: string, localUri: string): Promise<string> {
  return uploadClientMedia(clientId, localUri, 'avatar');
}
