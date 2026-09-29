import { Profile } from '@/features/profile/types';
import { formatDateShort, formatGoal } from '@/lib/format';
import { isChangeFavorable } from '@/lib/measurementTrends';
import { esc, pdfDocument, pdfFooter, pdfHeader, pdfMetaCard, pdfSectionTitle } from '@/lib/pdf';
import { resolveMediaUrls } from '@/lib/storage';
import { Client, Measurement } from './types';

type MeasurementPdfOptions = {
  client: Pick<Client, 'full_name' | 'goal' | 'age'>;
  profile: Profile | null;
  measurement: Measurement;
  /** Fotos de progreso (confidenciales): solo si el entrenador lo activa. */
  includePhotos?: boolean;
};

type ComparisonPdfOptions = {
  client: Pick<Client, 'full_name' | 'goal' | 'age'>;
  profile: Profile | null;
  earlier: Measurement;
  later: Measurement;
  /** Fotos de progreso (confidenciales): solo si el entrenador lo activa. */
  includePhotos?: boolean;
};

type Metric = { key: keyof Measurement; label: string; unit: string; decimals: number };

const COMPOSITION: Metric[] = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg', decimals: 1 },
  { key: 'height_cm', label: 'Estatura', unit: 'cm', decimals: 0 },
  { key: 'body_fat_pct', label: '% de grasa', unit: '%', decimals: 1 },
  { key: 'muscle_mass_pct', label: '% de masa muscular', unit: '%', decimals: 1 },
  { key: 'visceral_fat', label: 'Grasa visceral', unit: 'nivel', decimals: 0 },
  { key: 'bmr_kcal', label: 'Metabolismo basal', unit: 'kcal', decimals: 0 },
  { key: 'bmi', label: 'IMC', unit: '', decimals: 1 },
  { key: 'waist_hip_ratio', label: 'Relación cintura/cadera', unit: '', decimals: 2 },
];

const PERIMETERS: Metric[] = [
  { key: 'neck_cm', label: 'Cuello', unit: 'cm', decimals: 1 },
  { key: 'shoulders_cm', label: 'Hombros', unit: 'cm', decimals: 1 },
  { key: 'chest_cm', label: 'Pecho', unit: 'cm', decimals: 1 },
  { key: 'waist_cm', label: 'Cintura', unit: 'cm', decimals: 1 },
  { key: 'abdomen_cm', label: 'Abdomen', unit: 'cm', decimals: 1 },
  { key: 'hip_cm', label: 'Cadera', unit: 'cm', decimals: 1 },
  { key: 'arm_right_cm', label: 'Brazo relajado der.', unit: 'cm', decimals: 1 },
  { key: 'arm_left_cm', label: 'Brazo relajado izq.', unit: 'cm', decimals: 1 },
  { key: 'arm_flexed_right_cm', label: 'Brazo contraído der.', unit: 'cm', decimals: 1 },
  { key: 'arm_flexed_left_cm', label: 'Brazo contraído izq.', unit: 'cm', decimals: 1 },
  { key: 'forearm_right_cm', label: 'Antebrazo der.', unit: 'cm', decimals: 1 },
  { key: 'forearm_left_cm', label: 'Antebrazo izq.', unit: 'cm', decimals: 1 },
  { key: 'thigh_right_cm', label: 'Muslo der.', unit: 'cm', decimals: 1 },
  { key: 'thigh_left_cm', label: 'Muslo izq.', unit: 'cm', decimals: 1 },
  { key: 'calf_right_cm', label: 'Pantorrilla der.', unit: 'cm', decimals: 1 },
  { key: 'calf_left_cm', label: 'Pantorrilla izq.', unit: 'cm', decimals: 1 },
];

const SKINFOLDS: Metric[] = [
  { key: 'triceps_mm', label: 'Tríceps', unit: 'mm', decimals: 1 },
  { key: 'biceps_mm', label: 'Bíceps', unit: 'mm', decimals: 1 },
  { key: 'subscapular_mm', label: 'Subescapular', unit: 'mm', decimals: 1 },
  { key: 'supraspinal_mm', label: 'Supraespinal', unit: 'mm', decimals: 1 },
  { key: 'suprailiac_mm', label: 'Suprailíaco', unit: 'mm', decimals: 1 },
  { key: 'abdominal_mm', label: 'Abdominal', unit: 'mm', decimals: 1 },
  { key: 'thigh_mm', label: 'Muslo frontal', unit: 'mm', decimals: 1 },
  { key: 'calf_mm', label: 'Pantorrilla medial', unit: 'mm', decimals: 1 },
  { key: 'chest_mm', label: 'Pectoral', unit: 'mm', decimals: 1 },
];

export const MEASUREMENT_PDF_CSS = `
  .grid-2 { display: flex; gap: 12px; align-items: flex-start; }
  .grid-2 > div { flex: 1; min-width: 0; }
  .grid-2 table { table-layout: fixed; }
  td.value { font-weight: 700; color: #1B2A4A; text-align: right; }
  .delta-good { color: #4B7A1F; font-weight: 700; }
  .delta-bad { color: #B4442E; font-weight: 700; }
  .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; page-break-inside: avoid; }
  .photos img { width: 105px; height: 135px; object-fit: cover; border-radius: 6px; border: 1px solid #DDE2EA; }
  .photos-label { font-size: 10px; font-weight: 700; color: #1B2A4A; margin: 8px 0 0; }
  .legend { color: #5A6270; font-size: 9.5px; margin-top: 2px; }
`;

function value(m: Measurement, key: keyof Measurement): number | null {
  const v = m[key];
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? null : n;
}

function fmt(v: number | null, unit: string, decimals: number): string {
  if (v == null) return '—';
  return `${v.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
}

function sumSkinfolds(m: Measurement): number | null {
  const values = SKINFOLDS.map((f) => value(m, f.key)).filter((v): v is number => v != null && v > 0);
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}

/** Tabla de dos columnas (medida · valor) con solo las medidas registradas. */
function valuesTable(m: Measurement, metrics: Metric[], extraRows: { label: string; value: string }[] = []): string {
  const rows = [
    ...metrics
      .map((metric) => ({ label: metric.label, v: value(m, metric.key), metric }))
      .filter((r) => r.v != null)
      .map((r) => ({ label: r.label, value: fmt(r.v, r.metric.unit, r.metric.decimals) })),
    ...extraRows,
  ];
  if (rows.length === 0) return '<p class="muted">Sin datos registrados.</p>';
  return `<table><tbody>${rows
    .map((r) => `<tr><td>${esc(r.label)}</td><td class="value">${esc(r.value)}</td></tr>`)
    .join('')}</tbody></table>`;
}

function photosHtml(urls: string[], label?: string): string {
  if (urls.length === 0) return '';
  return `${label ? `<p class="photos-label">${esc(label)}</p>` : ''}<div class="photos">${urls
    .map((u, i) => `<img src="${esc(u)}" alt="Foto ${i + 1}" />`)
    .join('')}</div>`;
}

/** HTML del reporte de una medición antropométrica. */
export async function buildMeasurementPdfHtml({
  client,
  profile,
  measurement,
  includePhotos = false,
}: MeasurementPdfOptions): Promise<string> {
  const date = formatDateShort(measurement.measured_at);
  const goal = client.goal ? formatGoal(client.goal) : null;
  const photos = includePhotos ? await resolveMediaUrls(measurement.photos) : [];
  const folds = sumSkinfolds(measurement);

  const body = `
    ${pdfHeader({ title: 'Evaluación antropométrica', subtitle: 'Reporte de medición', tag: goal, profile })}
    ${pdfMetaCard([
      { label: 'Cliente', value: client.full_name },
      { label: 'Fecha de medición', value: date },
      { label: 'Edad', value: client.age != null ? `${client.age} años` : null },
      { label: 'Objetivo', value: goal },
    ])}
    <div class="grid-2">
      <div>
        ${pdfSectionTitle('Composición corporal')}
        ${valuesTable(measurement, COMPOSITION)}
      </div>
      <div>
        ${pdfSectionTitle('Plicometría (mm)')}
        ${valuesTable(
          measurement,
          SKINFOLDS,
          folds != null ? [{ label: 'Suma de pliegues', value: fmt(folds, 'mm', 1) }] : []
        )}
      </div>
    </div>
    ${pdfSectionTitle('Perímetros (cm)')}
    <div class="grid-2">
      <div>${valuesTable(measurement, PERIMETERS.slice(0, 8))}</div>
      <div>${valuesTable(measurement, PERIMETERS.slice(8))}</div>
    </div>
    ${photos.length ? pdfSectionTitle('Fotos de progreso') + photosHtml(photos) : ''}
    ${pdfFooter(profile, client.full_name, date)}`;

  return pdfDocument({
    title: `Evaluación antropométrica · ${client.full_name}`,
    body,
    extraCss: MEASUREMENT_PDF_CSS,
  });
}

/** HTML del reporte comparativo entre dos mediciones. */
export async function buildMeasurementComparisonPdfHtml({
  client,
  profile,
  earlier,
  later,
  includePhotos = false,
}: ComparisonPdfOptions): Promise<string> {
  const dateEarlier = formatDateShort(earlier.measured_at);
  const dateLater = formatDateShort(later.measured_at);
  const goal = client.goal ? formatGoal(client.goal) : null;
  const [earlierPhotos, laterPhotos] = includePhotos
    ? await Promise.all([resolveMediaUrls(earlier.photos), resolveMediaUrls(later.photos)])
    : [[], []];

  function comparisonTable(title: string, metrics: Metric[]): string {
    const rows = metrics
      .map((metric) => {
        const before = value(earlier, metric.key);
        const now = value(later, metric.key);
        if (before == null && now == null) return '';
        let delta = '—';
        if (before != null && now != null) {
          const diff = now - before;
          const favorable = diff === 0 ? null : isChangeFavorable(metric.key as string, before, now, client.goal ?? null);
          const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
          const cls = favorable === true ? 'delta-good' : favorable === false ? 'delta-bad' : '';
          delta = `<span class="${cls}">${sign}${esc(fmt(Math.abs(diff), metric.unit, metric.decimals))}</span>`;
        }
        return `<tr><td>${esc(metric.label)}</td><td>${esc(fmt(before, metric.unit, metric.decimals))}</td><td><strong>${esc(
          fmt(now, metric.unit, metric.decimals)
        )}</strong></td><td>${delta}</td></tr>`;
      })
      .join('');
    if (!rows) return '';
    return `
      ${pdfSectionTitle(title)}
      <table>
        <thead><tr><th>Medida</th><th>${esc(dateEarlier)}</th><th>${esc(dateLater)}</th><th>Cambio</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  const body = `
    ${pdfHeader({ title: 'Comparativa de medidas', subtitle: 'Evolución entre dos mediciones', tag: goal, profile })}
    ${pdfMetaCard([
      { label: 'Cliente', value: client.full_name },
      { label: 'Periodo', value: `${dateEarlier} → ${dateLater}` },
      { label: 'Edad', value: client.age != null ? `${client.age} años` : null },
      { label: 'Objetivo', value: goal },
    ])}
    ${comparisonTable('Composición corporal', COMPOSITION)}
    ${comparisonTable('Perímetros', PERIMETERS)}
    ${comparisonTable('Plicometría', SKINFOLDS)}
    <p class="legend">Verde: cambio favorable para tu objetivo. Rojo: cambio a vigilar.</p>
    ${
      earlierPhotos.length || laterPhotos.length
        ? pdfSectionTitle('Fotos de progreso') +
          photosHtml(earlierPhotos, `Inicial · ${dateEarlier}`) +
          photosHtml(laterPhotos, `Final · ${dateLater}`)
        : ''
    }
    ${pdfFooter(profile, client.full_name, dateLater)}`;

  return pdfDocument({
    title: `Comparativa de medidas · ${client.full_name}`,
    body,
    extraCss: MEASUREMENT_PDF_CSS,
  });
}
