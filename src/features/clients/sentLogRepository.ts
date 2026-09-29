import { downloadPdf, sharePdf } from '@/lib/pdf';
import { supabase } from '@/lib/supabase';

export type SentKind = 'plan' | 'rutina' | 'medicion' | 'comparativa' | 'informe';

export type SentLogEntry = {
  id: string;
  client_id: string;
  kind: SentKind;
  ref_id: string | null;
  label: string;
  created_at: string;
};

export async function listSentLog(clientId: string, limit = 20): Promise<SentLogEntry[]> {
  const { data, error } = await supabase
    .from('sent_log')
    .select('id, client_id, kind, ref_id, label, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as SentLogEntry[];
}

export type DocumentToDeliver = {
  clientId: string;
  kind: SentKind;
  refId?: string | null;
  /** Nombre legible del documento: "Plan nutricional v3", "Rutina Torso/Pierna v2"… */
  label: string;
  buildHtml: () => Promise<string>;
};

/**
 * Enviar al cliente: abre el menú de compartir con el PDF (WhatsApp, correo…) y lo anota en el
 * historial de envíos. En la Fase 2 este mismo paso publicará el documento en la app del cliente.
 */
export async function sendDocument(doc: DocumentToDeliver, clientName: string): Promise<void> {
  const html = await doc.buildHtml();
  await sharePdf(html, `${doc.label} · ${clientName}`);
  const { error } = await supabase
    .from('sent_log')
    .insert({ client_id: doc.clientId, kind: doc.kind, ref_id: doc.refId ?? null, label: doc.label });
  // El PDF ya se compartió: un fallo al anotarlo no debe parecer un fallo del envío
  if (error) console.warn('No se pudo registrar el envío:', error.message);
}

/** Descargar o imprimir el PDF, sin registrarlo como enviado. */
export async function downloadDocument(doc: DocumentToDeliver): Promise<void> {
  await downloadPdf(await doc.buildHtml());
}
