/**
 * Teléfonos para WhatsApp: se guardan en formato internacional solo con dígitos
 * (prefijo de país + número, sin el 0 inicial nacional): "584121234567".
 */

export const DEFAULT_COUNTRY_PREFIX = '58';

// Prefijos más habituales en LATAM y España; se prueban del más largo al más corto al separar
const KNOWN_PREFIXES = ['593', '598', '595', '591', '507', '506', '505', '504', '503', '502', '58', '57', '56', '55', '54', '53', '52', '51', '34', '1'];

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Une prefijo y número local. Devuelve null si no hay número o si no es válido. */
export function joinPhone(prefix: string, localNumber: string): string | null {
  const p = onlyDigits(prefix);
  const n = onlyDigits(localNumber).replace(/^0+/, '');
  if (!n) return null;
  const full = `${p}${n}`;
  return isValidPhone(full) ? full : null;
}

export function isValidPhone(digits: string): boolean {
  return /^[0-9]{8,15}$/.test(digits);
}

/** Separa un teléfono guardado en prefijo y número local para editarlo. */
export function splitPhone(value: string | null | undefined): { prefix: string; localNumber: string } {
  const digits = onlyDigits(value ?? '');
  if (!digits) return { prefix: DEFAULT_COUNTRY_PREFIX, localNumber: '' };
  const prefix = [...KNOWN_PREFIXES].sort((a, b) => b.length - a.length).find((p) => digits.startsWith(p));
  return prefix
    ? { prefix, localNumber: digits.slice(prefix.length) }
    : { prefix: DEFAULT_COUNTRY_PREFIX, localNumber: digits };
}

/** "+58 412 123 4567" para mostrarlo. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';
  const { prefix, localNumber } = splitPhone(value);
  const groups = localNumber.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
  return `+${prefix} ${groups}`;
}
