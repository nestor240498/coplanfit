import { Client } from '@/features/clients/types';
import { Profile } from '@/features/profile/types';
import { formatDateShort } from '@/lib/format';
import { esc, escMultiline, pdfDocument, pdfFooter, pdfHeader, pdfMetaCard } from '@/lib/pdf';
import { formatPrescription } from './prescription';
import {
  Exercise,
  SingleExerciseExecution,
  TRAINING_GOALS,
  TRAINING_LEVELS,
  WorkoutDay,
  WorkoutPlanVersion,
} from './types';

type WorkoutPdfOptions = {
  client: Pick<Client, 'full_name' | 'training_goal' | 'training_level'>;
  profile: Profile | null;
  version: WorkoutPlanVersion;
  /** Banco de ejercicios: aporta las indicaciones de sala de cada ejercicio. */
  bank: Exercise[];
};

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

export const WORKOUT_PDF_CSS = `
  .day { margin-top: 14px; page-break-inside: avoid; }
  td.num { width: 26px; font-weight: 700; color: #1B2A4A; }
  td.name { font-weight: 600; width: 38%; }
  .details { font-weight: 400; margin-top: 3px; font-size: 10px; }
  .cues { color: #4B7A1F; }
  .note { color: #5A6270; }
  tr.superset-head td { background: #EAF6D9; color: #4B7A1F; font-weight: 700; font-size: 10px; }
  .legend { color: #5A6270; font-size: 10px; margin: 0 2px 4px; }
`;

/** Tablas de los días de la rutina (sin cabecera ni pie): las usan el PDF de rutina y el informe completo. */
export function workoutDaysHtml(days: WorkoutDay[], bank: Exercise[]): string {
  const bankById = new Map(bank.map((ex) => [ex.id, ex]));
  const legend =
    '<p class="legend">Objetivo = repeticiones, tiempo o distancia por serie. RIR = repeticiones que deberían quedarte en reserva al terminar la serie.</p>';

  return (
    legend +
    days
      .map((day) => {
        let n = 0;
        const rows = day.blocks
          .map((block) => {
            n += 1;
            if (block.type === 'single') {
              return exerciseRow(String(n), block.exercise, String(block.sets), restLabel(block.rest_seconds), bankById);
            }
            const header = `<tr class="superset-head"><td></td><td colspan="6">Superserie · ${esc(block.sets)} rondas · descanso ${esc(
              restLabel(block.rest_seconds)
            )} al terminar cada ronda</td></tr>`;
            return (
              header +
              block.exercises
                .map((ex, i) => exerciseRow(`${n}${String.fromCharCode(97 + i)}`, ex, String(block.sets), '—', bankById))
                .join('')
            );
          })
          .join('');
        return `
          <section class="day">
            <div class="subsection-title">${esc(day.day_name)}</div>
            ${day.focus ? `<p class="muted" style="margin: 0 0 6px;">${esc(day.focus)}</p>` : ''}
            ${
              rows
                ? `<table>
                    <thead><tr><th>#</th><th>Ejercicio</th><th>Series</th><th>Objetivo</th><th>Carga</th><th>RIR</th><th>Descanso</th></tr></thead>
                    <tbody>${rows}</tbody>
                  </table>`
                : '<p class="muted">Día sin ejercicios.</p>'
            }
          </section>`;
      })
      .join('')
  );
}

/** HTML de la rutina de entrenamiento. */
export function buildWorkoutPdfHtml({ client, profile, version, bank }: WorkoutPdfOptions): string {
  const date = formatDateShort(version.created_at);
  const goal = TRAINING_GOALS.find((g) => g.id === client.training_goal)?.label ?? null;
  const level = TRAINING_LEVELS.find((l) => l.id === client.training_level)?.label ?? null;

  const body = `
    ${pdfHeader({ title: version.name || 'Rutina de entrenamiento', subtitle: 'Rutina de entrenamiento', tag: goal, profile })}
    ${pdfMetaCard([
      { label: 'Cliente', value: client.full_name },
      { label: 'Versión', value: `Versión ${version.version}` },
      { label: 'Fecha', value: date },
      { label: 'Nivel', value: level },
    ])}
    ${workoutDaysHtml(version.data?.weekly_schedule ?? [], bank)}
    ${
      version.data?.notes
        ? `<div class="info-card"><div class="info-card-title">Indicaciones del entrenador</div>${escMultiline(version.data.notes)}</div>`
        : ''
    }
    ${pdfFooter(profile, client.full_name, date)}`;

  return pdfDocument({ title: `${version.name} · ${client.full_name}`, body, extraCss: WORKOUT_PDF_CSS });
}
