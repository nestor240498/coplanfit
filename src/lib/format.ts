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

/** Fecha de hoy en hora LOCAL como "YYYY-MM-DD" (la BD usa UTC en `current_date`). */
export function localDateIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseBirthDate(value: string): { year: number; month: number; day: number } | null {
  const parts = value.includes('/') ? value.split('/').reverse() : value.includes('-') ? value.slice(0, 10).split('-') : null;
  if (!parts || parts.length !== 3) return null;
  const [year, month, day] = parts.map((p) => parseInt(p, 10));
  if ([year, month, day].some((n) => Number.isNaN(n)) || year < 1900) return null;
  return { year, month, day };
}

/**
 * Edad en años cumplidos en una fecha concreta (p. ej. la de una medición). Acepta YYYY-MM-DD o DD/MM/YYYY.
 * Sin fecha de referencia, usa hoy.
 */
export function ageAt(birthDate: string | null | undefined, onDateIso?: string | null): number | null {
  if (!birthDate) return null;
  const birth = parseBirthDate(birthDate);
  const ref = parseBirthDate(onDateIso ?? localDateIso());
  if (!birth || !ref) return null;
  let age = ref.year - birth.year;
  if (ref.month < birth.month || (ref.month === birth.month && ref.day < birth.day)) age--;
  return age >= 0 && age <= 130 ? age : null;
}

/** Calcula la edad actual a partir de una fecha de nacimiento (YYYY-MM-DD o DD/MM/YYYY). */
export function calculateAge(birthDateString: string | null | undefined): number | null {
  return ageAt(birthDateString);
}
