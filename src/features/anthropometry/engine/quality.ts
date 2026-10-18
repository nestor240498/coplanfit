import { toUnits } from './numbers.ts';
import { SITE_BY_ID } from './sites.ts';
import type { SiteGroup, SiteId, Tone } from './types.ts';

/** Diferencia relativa entre dos lecturas, en % de su media. */
export function relativeDiffPct(a: number, b: number): number {
  const mean = (a + b) / 2;
  return mean === 0 ? 0 : (Math.abs(a - b) / mean) * 100;
}

/**
 * ¿Hace falta una 3.ª lectura? Regla ISAK: si |m1 − m2| supera la tolerancia (5 % en pliegues,
 * 1 % en el resto) de la media. En unidades enteras para que el límite exacto no dependa del redondeo.
 */
export function needsThird(siteId: SiteId, a: number, b: number): boolean {
  const site = SITE_BY_ID[siteId];
  const ua = toUnits(a, site.decimals);
  const ub = toUnits(b, site.decimals);
  // |a − b| / ((a + b) / 2) > tol / 100  ⇔  |a − b| · 200 > tol · (a + b)
  return Math.abs(ua - ub) * 200 > site.tolerancePct * (ua + ub);
}

export type TemResult = {
  group: SiteGroup;
  /** ETM relativo en % (cada punto normalizado por su media). */
  relativePct: number;
  /** ETM absoluto en mm (solo pliegues). */
  absoluteMm: number | null;
  sites: number;
  tone: Tone;
  label: string;
};

/** Límites del ETM relativo por grupo: [bueno, aceptable]. */
const TEM_LIMITS: Record<SiteGroup, [number, number]> = {
  pliegues: [5, 7.5],
  basicas: [1, 1.5],
  perimetros: [1, 1.5],
  diametros: [1, 1.5],
};

/** Error técnico de medida por grupo con las dos primeras lecturas de cada punto. */
export function temByGroup(readings: Partial<Record<SiteId, number[]>>): TemResult[] {
  const acc = new Map<SiteGroup, { sumRel: number; sumAbs: number; n: number }>();
  for (const [id, values] of Object.entries(readings) as [SiteId, number[]][]) {
    if (!values || values.length < 2 || !SITE_BY_ID[id]) continue;
    const [a, b] = values;
    const mean = (a + b) / 2;
    if (mean <= 0) continue;
    const group = SITE_BY_ID[id].group;
    const entry = acc.get(group) ?? { sumRel: 0, sumAbs: 0, n: 0 };
    entry.sumRel += ((a - b) / mean) ** 2;
    entry.sumAbs += (a - b) ** 2;
    entry.n += 1;
    acc.set(group, entry);
  }
  const results: TemResult[] = [];
  for (const [group, { sumRel, sumAbs, n }] of acc) {
    const relativePct = 100 * Math.sqrt(sumRel / (2 * n));
    const [good, acceptable] = TEM_LIMITS[group];
    const tone: Tone = relativePct <= good ? 'good' : relativePct <= acceptable ? 'warn' : 'bad';
    results.push({
      group,
      relativePct,
      absoluteMm: group === 'pliegues' ? Math.sqrt(sumAbs / (2 * n)) : null,
      sites: n,
      tone,
      label: tone === 'good' ? 'Buena' : tone === 'warn' ? 'Aceptable' : 'Revisar',
    });
  }
  return results;
}
