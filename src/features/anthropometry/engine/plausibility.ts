import { fmtEs } from './numbers.ts';
import { SITE_BY_ID } from './sites.ts';
import type { SiteId, SiteValues } from './types.ts';

export type ReadingCheck =
  | { level: 'ok' }
  | { level: 'confirm' | 'block'; message: string; suggestion?: number };

/**
 * Comprueba una lectura antes de anotarla:
 * - `block`: fuera del rango posible (seguro que es un error).
 * - `confirm`: poco habitual o muy distinta de la medición anterior; se acepta pulsando OK otra vez.
 * Si parece un error de unidades, propone el valor corregido (1,69 → 169,0 cm).
 */
export function checkReading(
  siteId: SiteId,
  value: number,
  ctx: { previous?: number | null; ageYears?: number | null } = {}
): ReadingCheck {
  const site = SITE_BY_ID[siteId];
  const unit = site.unit;
  const suggestion = unitSlipSuggestion(siteId, value);

  if (value < site.hard[0] || value > site.hard[1]) {
    return {
      level: 'block',
      message: suggestion != null
        ? `¿Quisiste decir ${fmtEs(suggestion, site.decimals)} ${unit}?`
        : `Fuera de rango (${fmtEs(site.hard[0], 0)}–${fmtEs(site.hard[1], 0)} ${unit}).`,
      suggestion: suggestion ?? undefined,
    };
  }

  const previous = ctx.previous;
  if (previous != null && previous > 0) {
    const diff = Math.abs(value - previous);
    const rel = diff / previous;
    let jump = false;
    if (site.group === 'pliegues') jump = diff > Math.max(4, previous * 0.35);
    else if (site.group === 'perimetros' || site.group === 'diametros') jump = rel > 0.06;
    else if (siteId === 'weight_kg') jump = rel > 0.08;
    else if (siteId === 'height_cm') jump = (ctx.ageYears ?? 99) >= 20 ? diff > 1.5 : rel > 0.05;
    else jump = rel > 0.04;
    if (jump) {
      return {
        level: 'confirm',
        message: `Muy distinto de la última vez (${fmtEs(previous, site.decimals)} ${unit}). Pulsa OK otra vez si es correcto.`,
      };
    }
  }

  if (value < site.soft[0] || value > site.soft[1]) {
    return {
      level: 'confirm',
      message: suggestion != null
        ? `Valor poco habitual. ¿Quisiste decir ${fmtEs(suggestion, site.decimals)} ${unit}? Pulsa OK otra vez si es correcto.`
        : 'Valor poco habitual. Pulsa OK otra vez si es correcto.',
      suggestion: suggestion ?? undefined,
    };
  }
  return { level: 'ok' };
}

/** Errores de unidades típicos: talla en metros, diámetros en mm, pliegues en cm. */
function unitSlipSuggestion(siteId: SiteId, value: number): number | null {
  const site = SITE_BY_ID[siteId];
  const candidates: number[] = [];
  if (site.unit === 'cm' && value < 3) candidates.push(value * 100);
  if (site.group === 'diametros' && value > 15) candidates.push(value / 10);
  if (site.group === 'perimetros' && value > site.hard[1]) candidates.push(value / 10);
  if (site.group === 'pliegues' && value < 1) candidates.push(value * 10);
  if (site.group === 'pliegues' && value > site.hard[1]) candidates.push(value / 10);
  const fit = candidates.find((c) => c >= site.soft[0] && c <= site.soft[1]);
  return fit ?? null;
}

/** Comprobaciones entre medidas ya anotadas (avisos, no bloquean). */
export function crossCheck(values: SiteValues): string[] {
  const warnings: string[] = [];
  const h = values.height_cm;
  const sit = values.sitting_height_cm;
  const span = values.arm_span_cm;
  if (h && sit && (sit / h < 0.47 || sit / h > 0.6)) {
    warnings.push('La talla sentado no encaja con la talla: revisa si restaste la altura del cajón.');
  }
  if (h && span && (span / h < 0.88 || span / h > 1.12)) {
    warnings.push('La envergadura es muy distinta de la talla: revísala.');
  }
  if (values.arm_right_cm && values.arm_flexed_right_cm && values.arm_flexed_right_cm < values.arm_right_cm) {
    warnings.push('El brazo flexionado mide menos que el relajado: ¿están invertidos?');
  }
  return warnings;
}
