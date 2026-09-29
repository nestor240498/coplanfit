import { Profile } from '@/features/profile/types';
import { formatDateShort, formatGoal } from '@/lib/format';
import { esc, pdfDocument, pdfFooter, pdfHeader, pdfMetaCard, pdfSectionTitle } from '@/lib/pdf';
import { FoodGroup } from './planBuilderTypes';
import { PlanVersionData } from './plansRepository';
import { Client } from './types';

type PlanPdfOptions = {
  client: Pick<Client, 'full_name' | 'goal'>;
  profile: Profile | null;
  planData: PlanVersionData;
  versionNumber?: number;
  createdAt?: string;
};

const CATEGORY_DISPLAY_ORDER: { key: FoodGroup; label: string }[] = [
  { key: 'carbohidratos', label: 'Carbohidratos' },
  { key: 'proteinas', label: 'Proteínas' },
  { key: 'grasas', label: 'Grasas' },
  { key: 'vegetales', label: 'Vegetales / hortalizas' },
  { key: 'frutas', label: 'Frutas' },
  { key: 'lacteos', label: 'Lácteos' },
];

export const PLAN_PDF_CSS = `
  .meal-name { font-weight: 800; color: #1B2A4A; font-size: 12px; }
  .meal-time { color: #5A6270; font-size: 10px; margin-top: 2px; }
  .option { font-size: 11.5px; line-height: 1.45; }
  .market-group { font-weight: 700; color: #1B2A4A; width: 30%; }
  .market-list { margin: 0; padding-left: 16px; line-height: 1.45; }
`;

/**
 * Secciones del plan (comidas, pautas y lista de mercado) sin cabecera ni pie: las usan
 * el PDF del plan y el informe completo del cliente.
 */
export function planSectionsHtml(planData: PlanVersionData, opts: { marketOnNewPage: boolean }): string {
  const mealRows = (planData.mealSlots ?? [])
    .map((slot) => {
      const assignment = planData.meals?.[slot.id] ?? { option1: '', option2: '' };
      return `
        <tr>
          <td style="width: 24%;">
            <div class="meal-name">${esc(slot.name)}</div>
            <div class="meal-time">${esc(slot.time)} · ${slot.type === 'merienda' ? 'Merienda' : 'Comida principal'}</div>
          </td>
          <td class="option" style="width: 38%;">${esc(assignment.option1 || '—')}</td>
          <td class="option" style="width: 38%;">${esc(assignment.option2 || '—')}</td>
        </tr>`;
    })
    .join('');

  const supplements = (planData.supplements ?? [])
    .map((sup) => `<li><strong>${esc(sup.name)}</strong>: ${esc(sup.dose)} · ${esc(sup.scheduleDetail || sup.schedule)}</li>`)
    .join('');

  const marketRows = CATEGORY_DISPLAY_ORDER.map(({ key, label }) => {
    const items = (planData.suggestions?.[key] ?? []).filter((f) => f && f.checked);
    if (items.length === 0) return '';
    return `
      <tr>
        <td class="market-group">${esc(label)}</td>
        <td><ul class="market-list">${items.map((item) => `<li>${esc(item.name)}</li>`).join('')}</ul></td>
      </tr>`;
  }).join('');

  return `
    ${pdfSectionTitle('Distribución de comidas')}
    <table>
      <thead><tr><th>Comida</th><th>Opción 1</th><th>Opción 2</th></tr></thead>
      <tbody>${mealRows || '<tr><td colspan="3" class="muted">No hay comidas configuradas en el plan.</td></tr>'}</tbody>
    </table>

    <div class="info-card">
      <div class="info-card-title">Pautas y suplementación</div>
      <ul class="market-list">
        <li>Hidratación: mínimo <strong>${esc(planData.waterLiters || '2.5')} L</strong> de agua al día.</li>
        ${supplements}
      </ul>
    </div>

    ${
      marketRows
        ? `<div class="${opts.marketOnNewPage ? 'page-break' : ''}">
            ${pdfSectionTitle('Lista de mercado')}
            <table>
              <thead><tr><th>Grupo</th><th>Alimentos</th></tr></thead>
              <tbody>${marketRows}</tbody>
            </table>
          </div>`
        : ''
    }`;
}

/** HTML del programa nutricional (plan de comidas + lista de mercado). */
export function buildPlanPdfHtml({ client, profile, planData, versionNumber, createdAt }: PlanPdfOptions): string {
  const date = formatDateShort(createdAt ?? new Date().toISOString());
  const goal = client.goal ? formatGoal(client.goal) : null;

  const body = `
    ${pdfHeader({ title: 'Programa nutricional', subtitle: 'Plan de alimentación y mercado', tag: goal, profile })}
    ${pdfMetaCard([
      { label: 'Cliente', value: client.full_name },
      { label: 'Versión', value: versionNumber != null ? `Versión ${versionNumber}` : null },
      { label: 'Fecha', value: date },
      { label: 'Objetivo', value: goal },
    ])}
    ${planSectionsHtml(planData, { marketOnNewPage: true })}
    ${pdfFooter(profile, client.full_name, date)}`;

  return pdfDocument({ title: `Plan nutricional · ${client.full_name}`, body, extraCss: PLAN_PDF_CSS });
}
