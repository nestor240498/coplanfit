import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { Client } from '@/features/clients/types';
import { Profile } from '@/features/profile/types';
import { formatDateShort } from '@/lib/format';
import { formatPrescription } from './prescription';
import { Exercise, SingleExerciseExecution, TRAINING_GOALS, TRAINING_LEVELS, WorkoutPlanVersion } from './types';

type WorkoutPdfOptions = {
  client: Pick<Client, 'full_name' | 'training_goal' | 'training_level'>;
  profile: Profile | null;
  version: WorkoutPlanVersion;
  /** Banco de ejercicios: aporta las indicaciones de sala de cada ejercicio. */
  bank: Exercise[];
};

/** Todo texto que viene del usuario se escapa antes de entrar al HTML. */
function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function restLabel(seconds: number): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds} s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec ? `${min}:${String(sec).padStart(2, '0')} min` : `${min} min`;
}

function exerciseRow(
  label: string,
  ex: SingleExerciseExecution,
  sets: string,
  rest: string,
  bankById: Map<string, Exercise>
): string {
  const cues = ex.exercise_id ? bankById.get(ex.exercise_id)?.cues ?? [] : [];
  const details = [
    cues.length ? `<span class="cues">${cues.map((c) => `«${esc(c)}»`).join(' · ')}</span>` : '',
    ex.notes ? `<span class="note">${esc(ex.notes)}</span>` : '',
  ]
    .filter(Boolean)
    .join('<br/>');
  return `
    <tr>
      <td class="num">${esc(label)}</td>
      <td class="name">${esc(ex.name)}${details ? `<div class="details">${details}</div>` : ''}</td>
      <td>${esc(sets)}</td>
      <td>${esc(formatPrescription(ex))}</td>
      <td>${esc(ex.weight || '—')}</td>
      <td>${esc(ex.rir || '—')}</td>
      <td>${esc(rest)}</td>
    </tr>`;
}

export function buildWorkoutPdfHtml({ client, profile, version, bank }: WorkoutPdfOptions): string {
  const bankById = new Map(bank.map((ex) => [ex.id, ex]));
  const days = version.data?.weekly_schedule ?? [];
  const goal = TRAINING_GOALS.find((g) => g.id === client.training_goal)?.label;
  const level = TRAINING_LEVELS.find((l) => l.id === client.training_level)?.label;
  const trainerName = profile?.full_name || 'Entrenador personal';
  const businessName = profile?.business_name || 'CoplanFit';

  const daysHtml = days
    .map((day) => {
      let n = 0;
      const rows = day.blocks
        .map((block) => {
          if (block.type === 'single') {
            n += 1;
            return exerciseRow(String(n), block.exercise, String(block.sets), restLabel(block.rest_seconds), bankById);
          }
          n += 1;
          const letter = String(n);
          const header = `<tr class="superset-head"><td></td><td colspan="6">Superserie · ${esc(block.sets)} rondas · descanso ${esc(
            restLabel(block.rest_seconds)
          )} al terminar cada ronda</td></tr>`;
          const subRows = block.exercises
            .map((ex, i) => exerciseRow(`${letter}${String.fromCharCode(97 + i)}`, ex, String(block.sets), '—', bankById))
            .join('');
          return header + subRows;
        })
        .join('');
      return `
        <section class="day">
          <h2>${esc(day.day_name)}</h2>
          ${day.focus ? `<p class="focus">${esc(day.focus)}</p>` : ''}
          ${
            rows
              ? `<table>
                  <thead><tr><th>#</th><th>Ejercicio</th><th>Series</th><th>Objetivo</th><th>Carga</th><th>RIR</th><th>Descanso</th></tr></thead>
                  <tbody>${rows}</tbody>
                </table>`
              : '<p class="empty">Día sin ejercicios.</p>'
          }
        </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${esc(version.name)} · ${esc(client.full_name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Manrope:wght@700;800&display=swap');
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', -apple-system, sans-serif; color: #2E2E2E; font-size: 11px;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { background: #1B2A4A; color: #fff; border-radius: 8px; padding: 14px 18px; display: flex;
           justify-content: space-between; align-items: center; gap: 12px; }
  header h1 { font-family: 'Manrope', sans-serif; font-size: 19px; margin: 0; }
  header .sub { color: #B9C2D6; font-size: 11px; margin-top: 3px; }
  header .tag { display: inline-block; background: #8BC53F; color: #1B2A4A; font-weight: 700; border-radius: 4px;
                padding: 2px 7px; margin-right: 6px; }
  header img { max-height: 40px; max-width: 110px; object-fit: contain; background: #fff; border-radius: 6px; padding: 4px; }
  .legend { color: #5A6270; font-size: 10px; margin: 10px 2px 0; }
  .day { margin-top: 16px; page-break-inside: avoid; }
  .day h2 { font-family: 'Manrope', sans-serif; font-size: 14px; color: #1B2A4A; margin: 0 0 2px; }
  .focus { color: #5A6270; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #EEF0F4; color: #1B2A4A; font-size: 10px; text-align: left; padding: 6px; }
  td { padding: 6px; border-bottom: 1px solid #DDE2EA; vertical-align: top; }
  td.num { width: 26px; font-weight: 700; color: #1B2A4A; }
  td.name { font-weight: 600; width: 38%; }
  .details { font-weight: 400; margin-top: 3px; font-size: 10px; }
  .cues { color: #4B7A1F; }
  .note { color: #5A6270; }
  tr.superset-head td { background: #EAF6D9; color: #4B7A1F; font-weight: 700; font-size: 10px; }
  .empty { color: #8B93A3; }
  .notes { margin-top: 16px; background: #F7F8FA; border-radius: 8px; padding: 10px 12px; page-break-inside: avoid; }
  .notes h3 { margin: 0 0 4px; font-size: 11px; color: #1B2A4A; }
  footer { margin-top: 20px; border-top: 1px solid #DDE2EA; padding-top: 8px; display: flex; justify-content: space-between;
           color: #5A6270; font-size: 10px; }
  footer strong { color: #1B2A4A; }
</style>
</head>
<body>
  <header>
    <div>
      <h1>${esc(version.name || 'Rutina de entrenamiento')}</h1>
      <div class="sub">
        ${goal ? `<span class="tag">${esc(goal)}</span>` : ''}${esc(client.full_name)}${level ? ` · Nivel ${esc(level.toLowerCase())}` : ''}
        · Versión ${esc(version.version)} · ${esc(formatDateShort(version.created_at))}
      </div>
    </div>
    ${profile?.logo_url ? `<img src="${esc(profile.logo_url)}" alt="" />` : ''}
  </header>
  <p class="legend">Objetivo = repeticiones, tiempo o distancia por serie. RIR = repeticiones que deberían quedarte en reserva al terminar la serie.</p>
  ${daysHtml}
  ${
    version.data?.notes
      ? `<div class="notes"><h3>Indicaciones del entrenador</h3>${esc(version.data.notes).replace(/\n/g, '<br/>')}</div>`
      : ''
  }
  <footer>
    <span><strong>${esc(trainerName)}</strong> · ${esc(businessName)}</span>
    <span>Generado con CoplanFit</span>
  </footer>
</body>
</html>`;
}

/** Genera el PDF de la rutina y abre el menú de compartir (en web, el diálogo de impresión). */
export async function shareWorkoutPdf(options: WorkoutPdfOptions): Promise<void> {
  const html = buildWorkoutPdfHtml(options);

  if (Platform.OS === 'web') {
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 400);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartir no está disponible en este dispositivo.');
  await Sharing.shareAsync(uri, {
    UTI: '.pdf',
    mimeType: 'application/pdf',
    dialogTitle: `Rutina · ${options.client.full_name}`,
  });
}
