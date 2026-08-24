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

/** Calcula la edad en años a partir de una fecha de nacimiento (YYYY-MM-DD o DD/MM/YYYY) */
export function calculateAge(birthDateString: string | null | undefined): number | null {
  if (!birthDateString) return null;
  let year: number;
  let month: number;
  let day: number;

  if (birthDateString.includes('/')) {
    const parts = birthDateString.split('/');
    if (parts.length === 3) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else {
      return null;
    }
  } else if (birthDateString.includes('-')) {
    const parts = birthDateString.split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      return null;
    }
  } else {
    return null;
  }

  if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1900 || year > new Date().getFullYear()) {
    return null;
  }

  const birthDate = new Date(year, month, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 && age <= 130 ? age : null;
}

/** Convierte DD/MM/YYYY a YYYY-MM-DD (para guardar en la BD) */
export function parseDisplayDateToIso(displayDate: string): string | null {
  const cleaned = displayDate.replace(/[^0-9/]/g, '');
  const parts = cleaned.split('/');
  if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return null;
}

/** Convierte YYYY-MM-DD a DD/MM/YYYY (para mostrar en input) */
export function formatIsoToDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '';
  if (DATE_ONLY.test(iso)) {
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  }
  return '';
}

/** Aplica máscara automática DD/MM/AAAA mientras el usuario escribe */
export function maskDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
