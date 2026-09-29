import { getMyProfile } from '@/features/profile/repository';
import { getExercises } from '@/features/workouts/exerciseService';
import { TRAINING_GOALS } from '@/features/workouts/types';
import { WORKOUT_PDF_CSS, workoutDaysHtml } from '@/features/workouts/workoutPdf';
import { getWorkoutPlanVersionById, listWorkoutPlanVersions } from '@/features/workouts/workoutsRepository';
import { calculateAge, formatDateShort, formatGoal } from '@/lib/format';
import { isChangeFavorable } from '@/lib/measurementTrends';
import { esc, pdfDocument, pdfFooter, pdfHeader, pdfMetaCard, pdfSectionTitle } from '@/lib/pdf';
import { resolveMediaUrls } from '@/lib/storage';
import { listMeasurements } from './measurementsRepository';
import { PLAN_PDF_CSS, planSectionsHtml } from './planPdf';
import { getPlanVersionById, listPlanVersions } from './plansRepository';
import { getClient } from './repository';
import { listTags } from './tagsRepository';
import { Measurement } from './types';

type MetricRow = { key: keyof Measurement; label: string; unit: string; decimals: number };

const REPORT_METRICS: MetricRow[] = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg', decimals: 1 },
  { key: 'body_fat_pct', label: '% de grasa', unit: '%', decimals: 1 },
  { key: 'muscle_mass_pct', label: '% de masa muscular', unit: '%', decimals: 1 },
  { key: 'bmi', label: 'IMC', unit: '', decimals: 1 },
  { key: 'waist_cm', label: 'Cintura', unit: 'cm', decimals: 1 },
  { key: 'abdomen_cm', label: 'Abdomen', unit: 'cm', decimals: 1 },
  { key: 'hip_cm', label: 'Cadera', unit: 'cm', decimals: 1 },
  { key: 'waist_hip_ratio', label: 'Relación cintura/cadera', unit: '', decimals: 2 },
  { key: 'chest_cm', label: 'Pecho', unit: 'cm', decimals: 1 },
  { key: 'arm_right_cm', label: 'Brazo derecho', unit: 'cm', decimals: 1 },
  { key: 'thigh_right_cm', label: 'Muslo derecho', unit: 'cm', decimals: 1 },
];

const REPORT_CSS = `
  .delta-good { color: #4B7A1F; font-weight: 700; }
  .delta-bad { color: #B4442E; font-weight: 700; }
  .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  .photos img { width: 105px; height: 135px; object-fit: cover; border-radius: 6px; border: 1px solid #DDE2EA; }
  .tag-group { margin-bottom: 6px; }
  .tag-group .meta-label { margin-bottom: 3px; }
`;

function num(m: Measurement, key: keyof Measurement): number | null {
  const v = m[key];
  return typeof v === 'number' ? v : v == null ? null : Number(v);
}

function fmt(value: number | null, unit: string, decimals: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
}

function measurementSectionHtml(latest: Measurement, previous: Measurement | null, goal: Parameters<typeof isChangeFavorable>[3]): string {
  const rows = REPORT_METRICS.map((metric) => {
    const now = num(latest, metric.key);
    if (now == null) return '';
    const before = previous ? num(previous, metric.key) : null;
    let deltaHtml = '—';
    if (before != null) {
      const diff = now - before;
      const favorable = diff === 0 ? null : isChangeFavorable(metric.key as string, before, now, goal);
      const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
      const cls = favorable === true ? 'delta-good' : favorable === false ? 'delta-bad' : '';
      deltaHtml = `<span class="${cls}">${sign}${esc(fmt(Math.abs(diff), metric.unit, metric.decimals))}</span>`;
    }
    return `<tr><td>${esc(metric.label)}</td><td>${esc(fmt(before, metric.unit, metric.decimals))}</td><td><strong>${esc(
      fmt(now, metric.unit, metric.decimals)
    )}</strong></td><td>${deltaHtml}</td></tr>`;
  }).join('');

  if (!rows) return '<p class="muted">La última medición no tiene datos de composición ni perímetros.</p>';
  return `
    <table>
      <thead><tr>
        <th>Medida</th>
        <th>${previous ? esc(formatDateShort(previous.measured_at)) : 'Anterior'}</th>
        <th>${esc(formatDateShort(latest.measured_at))}</th>
        <th>Cambio</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="muted" style="font-size: 9.5px;">Verde: cambio favorable para tu objetivo. Rojo: cambio a vigilar.</p>`;
}

/**
 * Informe completo del cliente en un solo PDF: datos, última medición (comparada con la anterior),
 * plan nutricional vigente y rutina vigente. No incluye las notas privadas del entrenador.
 * Las fotos de progreso solo se incluyen si `includePhotos` es true.
 */
export async function buildClientReportHtml(clientId: string, opts: { includePhotos: boolean }): Promise<string> {
  const [client, tags, measurements, planVersions, workoutVersions, profile] = await Promise.all([
    getClient(clientId),
    listTags(clientId),
    listMeasurements(clientId),
    listPlanVersions(clientId),
    listWorkoutPlanVersions(clientId),
    getMyProfile().catch(() => null),
  ]);

  const currentPlanMeta = planVersions.find((v) => v.is_current);
  const currentWorkoutMeta = workoutVersions.find((v) => v.is_current && !v.data?.is_draft);
  const [plan, workout, bank] = await Promise.all([
    currentPlanMeta ? getPlanVersionById(currentPlanMeta.id) : Promise.resolve(null),
    currentWorkoutMeta ? getWorkoutPlanVersionById(currentWorkoutMeta.id) : Promise.resolve(null),
    currentWorkoutMeta ? getExercises() : Promise.resolve([]),
  ]);

  const [latest, previous] = measurements; // ya vienen de la más reciente a la más antigua
  const photos = opts.includePhotos && latest ? await resolveMediaUrls(latest.photos) : [];
  const age = (client.birth_date ? calculateAge(client.birth_date) : null) ?? client.age;
  const goal = client.goal ? formatGoal(client.goal) : null;
  const trainingGoal = TRAINING_GOALS.find((g) => g.id === client.training_goal)?.label ?? null;
  const date = formatDateShort(new Date().toISOString());

  const tagGroups = (
    [
      ['alergia', 'Alergias'],
      ['condicion', 'Condiciones de salud'],
      ['evita', 'Alimentos a evitar'],
    ] as const
  )
    .map(([kind, label]) => {
      const items = tags.filter((t) => t.kind === kind);
      if (items.length === 0) return '';
      return `<div class="tag-group"><span class="meta-label">${esc(label)}</span><div class="chips">${items
        .map((t) => `<span class="chip${kind === 'evita' ? '' : ' danger'}">${esc(t.label)}</span>`)
        .join('')}</div></div>`;
    })
    .join('');

  const body = `
    ${pdfHeader({ title: 'Informe del cliente', subtitle: 'Seguimiento, nutrición y entrenamiento', tag: goal, profile })}
    ${pdfMetaCard([
      { label: 'Cliente', value: client.full_name },
      { label: 'Edad', value: age != null ? `${age} años` : null },
      { label: 'Objetivo', value: goal },
      { label: 'Entrenamiento', value: trainingGoal },
      { label: 'Fecha', value: date },
    ])}
    ${tagGroups ? `<div class="info-card">${tagGroups}</div>` : ''}

    ${pdfSectionTitle('Evolución corporal')}
    ${
      latest
        ? measurementSectionHtml(latest, previous ?? null, client.goal ?? null) +
          (photos.length
            ? `<div class="photos">${photos.map((u, i) => `<img src="${esc(u)}" alt="Foto ${i + 1}" />`).join('')}</div>`
            : '')
        : '<p class="muted">Todavía no hay mediciones registradas.</p>'
    }

    <div class="page-break"></div>
    ${pdfSectionTitle(plan ? `Plan nutricional · versión ${plan.version}` : 'Plan nutricional')}
    ${plan ? planSectionsHtml(plan.data, { marketOnNewPage: false }) : '<p class="muted">Sin plan nutricional vigente.</p>'}

    <div class="page-break"></div>
    ${pdfSectionTitle(workout ? `Rutina · ${workout.name} (versión ${workout.version})` : 'Rutina de entrenamiento')}
    ${
      workout
        ? workoutDaysHtml(workout.data?.weekly_schedule ?? [], bank)
        : '<p class="muted">Sin rutina de entrenamiento vigente.</p>'
    }

    ${pdfFooter(profile, client.full_name, date)}`;

  return pdfDocument({
    title: `Informe · ${client.full_name}`,
    body,
    extraCss: PLAN_PDF_CSS + WORKOUT_PDF_CSS + REPORT_CSS,
  });
}
