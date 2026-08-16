const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parsea "YYYY-MM-DD" (columnas `date` de Postgres, sin hora) tomando año/mes/día tal cual,
 * sin pasar por el reloj local — `new Date("2026-07-15")` se interpreta como medianoche UTC
 * y en timezones negativos (América) retrocede un día al mostrarse en hora local.
 */
function toLocalParts(iso: string): { year: number; month: number; day: number } {
  if (DATE_ONLY.test(iso)) {
    const [year, month, day] = iso.split('-').map(Number);
    return { year, month: month - 1, day };
  }
  const d = new Date(iso);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

/** "15 jul 2026" — mockup: fecha de medición, fecha de plan. */
export function formatDateShort(iso: string): string {
  const { year, month, day } = toLocalParts(iso);
  return `${day} ${MONTHS_SHORT[month]} ${year}`;
}

/** "ene. 2026" — mockup: "Cliente desde ene. 2026". */
export function formatMonthYear(iso: string): string {
  const { year, month } = toLocalParts(iso);
  return `${MONTHS_SHORT[month]}. ${year}`;
}

/** Formatea el objetivo con primera letra mayúscula: "Definición", "Volumen", etc. */
export function formatGoal(goal: string | null | undefined): string {
  if (!goal) return '—';
  const trimmed = goal.trim();
  if (trimmed.length === 0) return '—';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
