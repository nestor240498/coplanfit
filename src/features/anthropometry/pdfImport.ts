import { edgeFunctionError } from '@/lib/errors';
import { localDateIso } from '@/lib/format';
import { bytesToBase64, pickFileBytes } from '@/lib/pickFile';
import { supabase } from '@/lib/supabase';

import { saveDraft } from './draftStorage';
import { createSession, SITE_BY_ID, SITE_IDS, type SiteId } from './engine';

/** Resultados que trae el informe, para compararlos con los que calcula CoplanFit. */
export type ReportedResults = Partial<
  Record<'fat_pct' | 'fat_kg' | 'adipose_kg' | 'muscle_kg' | 'bone_kg' | 'residual_kg' | 'endo' | 'meso' | 'ecto' | 'sum6' | 'sum8', number | null>
>;

export type ExtractedIsak = {
  measuredOn: string;
  sites: SiteId[];
  readings: Partial<Record<SiteId, number[]>>;
  reported: ReportedResults;
  evaluator: string | null;
};

type ExtractResponse = {
  measured_on?: string | null;
  evaluator?: string | null;
  sites?: Partial<Record<string, number | null>>;
  reported?: ReportedResults | null;
};

const MAX_PDF_BYTES = 5 * 1024 * 1024;

/**
 * Elige un PDF de ISAKmetry (u otro informe ISAK) y lo lee con IA. Devuelve las medidas para revisarlas
 * en la sesión antes de guardar; null si se cancela. El PDF no se guarda en ningún sitio.
 */
export async function pickAndExtractIsakPdf(
  clientId: string,
  onPicked?: (file: { name: string; sizeKb: number }) => void
): Promise<ExtractedIsak | null> {
  const file = await pickFileBytes({ mimeTypes: ['application/pdf'], extensions: ['.pdf', 'application/pdf'], maxBytes: MAX_PDF_BYTES });
  if (!file) return null;
  onPicked?.({ name: file.name, sizeKb: Math.max(1, Math.round(file.bytes.byteLength / 1024)) });
  const { data, error } = await supabase.functions.invoke<ExtractResponse>('extract-anthropometry-report', {
    body: { clientId, pdfBase64: bytesToBase64(file.bytes) },
  });
  if (error) throw await edgeFunctionError(error, 'No se pudo leer el informe.');

  const readings: Partial<Record<SiteId, number[]>> = {};
  const sites: SiteId[] = [];
  for (const id of SITE_IDS) {
    const value = data?.sites?.[id];
    const site = SITE_BY_ID[id];
    // Se descartan valores imposibles (lectura errónea del PDF): el entrenador los completa a mano
    if (typeof value === 'number' && value >= site.hard[0] && value <= site.hard[1]) {
      readings[id] = [value];
      sites.push(id);
    }
  }
  if (!sites.length) throw new Error('No encontré medidas en ese PDF. ¿Es un informe antropométrico?');

  const today = localDateIso();
  const measuredOn = data?.measured_on && /^\d{4}-\d{2}-\d{2}$/.test(data.measured_on) && data.measured_on <= today ? data.measured_on : today;
  return { measuredOn, sites, readings, reported: data?.reported ?? {}, evaluator: data?.evaluator ?? null };
}

/**
 * Lee un informe PDF y deja las medidas como borrador en «Revisión» (sin abrir la sesión): la ficha
 * lo muestra como medición pendiente. Devuelve false si se cancela el selector.
 */
export async function importPdfAsDraft(
  client: { id: string },
  trainerId: string,
  onPicked?: (file: { name: string; sizeKb: number }) => void
): Promise<boolean> {
  const extracted = await pickAndExtractIsakPdf(client.id, onPicked);
  if (!extracted) return false;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const session = createSession(
    {
      id,
      clientId: client.id,
      trainerId,
      measuredOn: extracted.measuredOn,
      mode: 'transcribe',
      order: 'rounds',
      sites: extracted.sites,
      fatEquation: null,
      source: 'isakmetry_pdf',
      reported: extracted.reported,
      initialReadings: extracted.readings,
    },
    Date.now()
  );
  await saveDraft(session);
  return true;
}
