import { CLIENT_MEDIA_BUCKET } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

/**
 * Derechos del cliente sobre sus datos: llevarse una copia (exportar) y pedir que se borren.
 * RLS limita todo al entrenador dueño del cliente.
 */

async function rows(table: string, clientId: string): Promise<unknown[]> {
  const { data, error } = await supabase.from(table).select('*').eq('client_id', clientId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Todos los datos del cliente en un solo objeto (las fotos van como rutas: no se incluyen los archivos). */
export async function exportClientData(clientId: string): Promise<Record<string, unknown>> {
  const { data: client, error } = await supabase.from('clients').select('*').eq('id', clientId).single();
  if (error) throw new Error(error.message);
  const [tags, measurements, plans, workouts, sent] = await Promise.all([
    rows('client_tags', clientId),
    rows('measurements', clientId),
    rows('plan_versions', clientId),
    rows('workout_plan_versions', clientId).catch(() => []),
    rows('sent_log', clientId).catch(() => []),
  ]);
  return {
    exported_at: new Date().toISOString(),
    nota: 'Copia de los datos del cliente guardados en CoplanFit. Las fotos se identifican por su ruta; los archivos no se incluyen.',
    client,
    tags,
    measurements,
    plan_versions: plans,
    workout_plan_versions: workouts,
    sent_log: sent,
  };
}

/** Borra todas las fotos del cliente (avatar y progreso) del bucket privado. */
async function removeClientMedia(clientId: string): Promise<void> {
  const bucket = supabase.storage.from(CLIENT_MEDIA_BUCKET);
  const paths: string[] = [];
  for (const folder of ['avatar', 'measurements']) {
    const { data } = await bucket.list(`${clientId}/${folder}`, { limit: 1000 });
    for (const f of data ?? []) paths.push(`${clientId}/${folder}/${f.name}`);
  }
  if (paths.length) {
    const { error } = await bucket.remove(paths);
    if (error) throw new Error(error.message);
  }
}

/**
 * Elimina al cliente y todo lo suyo (mediciones, planes, rutinas, etiquetas y registro de envíos caen en
 * cascada). Primero las fotos: la policy del bucket necesita que el cliente aún exista. Irreversible.
 */
export async function deleteClientAndData(clientId: string): Promise<void> {
  await removeClientMedia(clientId);
  const { error } = await supabase.from('clients').delete().eq('id', clientId);
  if (error) throw new Error(error.message);
}
