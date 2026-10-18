/**
 * Aritmética en unidades enteras (décimas, centésimas…) para que las medias, medianas y comparaciones
 * con umbrales no dependan de errores de coma flotante: (8,1 + 8,2) / 2 da 8,15 → 8,2 y no 8,1499….
 */

/** Valor → unidades enteras con `decimals` decimales (11,2 con 1 decimal → 112). */
export function toUnits(value: number, decimals: number): number {
  return Math.round(Number((value * 10 ** decimals).toPrecision(12)));
}

export function fromUnits(units: number, decimals: number): number {
  return units / 10 ** decimals;
}

/** Redondea a `decimals` decimales con redondeo «half up» robusto. */
export function roundTo(value: number, decimals: number): number {
  return fromUnits(toUnits(value, decimals), decimals);
}

/** Media de dos lecturas en unidades enteras, redondeando la mitad hacia arriba. */
function meanOfTwoUnits(a: number, b: number): number {
  const sum = a + b;
  return sum >= 0 ? Math.floor((sum + 1) / 2) : -Math.floor((-sum + 1) / 2);
}

/**
 * Valor final de un punto (regla ISAK): 1 lectura → esa; 2 → media; 3 → mediana.
 * Devuelve null si no hay lecturas.
 */
export function aggregateReadings(readings: readonly number[], decimals: number): number | null {
  const units = readings.filter((r) => Number.isFinite(r)).map((r) => toUnits(r, decimals));
  if (units.length === 0) return null;
  if (units.length === 1) return fromUnits(units[0], decimals);
  if (units.length === 2) return fromUnits(meanOfTwoUnits(units[0], units[1]), decimals);
  const sorted = [...units.slice(0, 3)].sort((a, b) => a - b);
  return fromUnits(sorted[1], decimals);
}

/** "11,2" o "11.2" → 11.2; texto vacío o inválido → null. */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '' || trimmed === '.') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** Número con coma decimal (es-ES): fmtEs(14.2234, 2) → "14,22". */
export function fmtEs(value: number, decimals: number): string {
  return roundTo(value, decimals).toFixed(decimals).replace('.', ',');
}
