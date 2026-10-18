import { supabase } from '@/lib/supabase';

import type { ExistingClient, ImportPayloadRow } from './core';

/** Lo mínimo para detectar duplicados (sin cargar mediciones). */
export async function listClientIdentities(): Promise<ExistingClient[]> {
  const { data, error } = await supabase.from('clients').select('id, full_name, phone, contact');
  if (error) throw new Error(error.message);
  return (data ?? []) as ExistingClient[];
}

/** Importa todas las filas en una sola transacción (RPC import_clients, migración 016). */
export async function importClients(sourceName: string, rows: ImportPayloadRow[]): Promise<{ importId: string; clientIds: string[] }> {
  const { data, error } = await supabase.rpc('import_clients', { p_source_name: sourceName, p_rows: rows });
  if (error) throw new Error(error.message);
  const result = data as { import_id: string; client_ids: string[] };
  return { importId: result.import_id, clientIds: result.client_ids ?? [] };
}

/** Deshace una importación si aún no se ha trabajado con esos clientes. Devuelve cuántos se borraron. */
export async function undoImport(importId: string): Promise<number> {
  const { data, error } = await supabase.rpc('undo_client_import', { p_import_id: importId });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}
