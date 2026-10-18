import { getMyProfile } from '@/features/profile/repository';

import { buildMeasurementPdfHtml } from '../clients/measurementPdf';
import { listMeasurements } from '../clients/measurementsRepository';
import type { Client, Measurement } from '../clients/types';
import { buildIsakPdfHtml } from './isakPdf';
import { buildReportContext } from './report';

/** PDF de una medición: el informe ISAK con gráficas si es una evaluación ISAK, si no el reporte clásico. */
export async function buildMeasurementDocumentHtml(opts: {
  client: Client;
  measurement: Measurement;
  includePhotos: boolean;
}): Promise<string> {
  const profile = await getMyProfile().catch(() => null);
  if (opts.measurement.protocol === 'isak_restricted') {
    const history = await listMeasurements(opts.client.id);
    const ctx = buildReportContext(opts.measurement, opts.client, history);
    return buildIsakPdfHtml({ ctx, profile, includePhotos: opts.includePhotos });
  }
  return buildMeasurementPdfHtml({ client: opts.client, profile, measurement: opts.measurement, includePhotos: opts.includePhotos });
}
