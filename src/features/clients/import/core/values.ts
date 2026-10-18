import type { Cell, DateOrder, ImportSex } from './types.ts';
import { normalizeHeader } from './mapping.ts';

/** Fecha ISO de hoy en hora local (para descartar fechas futuras). */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function iso(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null; // 31/02
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Número de serie de Excel → ISO (sistema 1900 o 1904). */
export function excelSerialToIso(serial: number, date1904 = false): string | null {
  if (!Number.isFinite(serial) || serial < 1) return null;
  const days = Math.floor(serial) + (date1904 ? 1462 : 0);
  const ms = Date.UTC(1899, 11, 30) + days * 86400000;
  const d = new Date(ms);
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

const MONTHS: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, junio: 6,
  jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, septiembre: 9, set: 9, setiembre: 9, oct: 10, octubre: 10,
  nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};

/** Orden día/mes de una columna: si algún valor tiene la 1.ª parte > 12 es dd/mm; si la 2.ª > 12, mm/dd. */
export function detectDateOrder(cells: Cell[]): { order: DateOrder; ambiguous: boolean } {
  let dmy = false;
  let mdy = false;
  for (const cell of cells) {
    const m = cell.text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (!m) continue;
    if (Number(m[1]) > 12) dmy = true;
    if (Number(m[2]) > 12) mdy = true;
  }
  if (mdy && !dmy) return { order: 'mdy', ambiguous: false };
  return { order: 'dmy', ambiguous: !dmy && !mdy };
}

/**
 * Fecha de una celda: número de serie de Excel, ISO, dd/mm/aaaa (o mm/dd según la columna),
 * «15 mar 1990» o «15 de marzo de 1990». Años de 2 cifras: en nacimientos, siempre en el pasado.
 */
export function parseDateCell(cell: Cell, opts: { order: DateOrder; date1904: boolean; birth: boolean; today: string }): string | null {
  if (cell.dateSerial != null) return excelSerialToIso(cell.dateSerial, opts.date1904);
  const text = cell.text.trim();
  if (!text) return null;
  if (/^\d{5}(\.\d+)?$/.test(text)) return excelSerialToIso(Number(text), opts.date1904);
  let m = text.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const year = fullYear(Number(m[3]), m[3].length, opts);
    return opts.order === 'dmy' ? iso(year, b, a) : iso(year, a, b);
  }
  const words = normalizeHeader(text).replace(/\bde(l)?\b/g, ' ').split(' ').filter(Boolean);
  if (words.length === 3 && MONTHS[words[1]] && /^\d{1,2}$/.test(words[0]) && /^\d{2,4}$/.test(words[2])) {
    return iso(fullYear(Number(words[2]), words[2].length, opts), MONTHS[words[1]], Number(words[0]));
  }
  return null;
}

function fullYear(year: number, digits: number, opts: { birth: boolean; today: string }): number {
  if (digits === 4) return year;
  const current = Number(opts.today.slice(0, 4));
  const century = Math.floor(current / 100) * 100;
  const candidate = century + year;
  // Nacimientos y mediciones siempre en el pasado
  return candidate > current ? candidate - 100 : candidate;
}

/** Sexo de una celda. «M» es ambiguo: mujer si la columna usa H, masculino si usa F. */
export function parseSex(text: string, columnUsesH: boolean): ImportSex | null {
  const v = normalizeHeader(text);
  if (!v) return null;
  if (['hombre', 'masculino', 'varon', 'h', 'male', 'masc'].includes(v)) return 'hombre';
  if (['mujer', 'femenino', 'f', 'female', 'fem'].includes(v)) return 'mujer';
  if (v === 'm') return columnUsesH ? 'mujer' : 'hombre';
  return null;
}

const GOAL_SYNONYMS: [string, string[]][] = [
  ['volumen', ['volumen', 'ganar masa', 'hipertrofia', 'ganar musculo', 'masa muscular']],
  ['definición', ['definicion', 'definir', 'marcar']],
  ['subir de peso', ['subir de peso', 'ganar peso', 'subir peso', 'aumentar peso']],
  ['bajar de peso', ['bajar de peso', 'perder peso', 'adelgazar', 'bajar peso', 'perder grasa', 'perdida de peso']],
  ['mantenimiento', ['mantenimiento', 'mantener', 'salud']],
  ['recomposición', ['recomposicion', 'recomp']],
];

/** Objetivo conocido de la app, o null (el texto se guarda en notas). */
export function parseGoal(text: string): string | null {
  const v = normalizeHeader(text);
  if (!v) return null;
  for (const [goal, syns] of GOAL_SYNONYMS) if (syns.some((s) => v === s || v.includes(s))) return goal;
  return null;
}

/** Número con coma o punto decimal («61,5 kg» → 61.5). */
export function parseNumber(cell: Cell): number | null {
  if (cell.number != null && Number.isFinite(cell.number)) return cell.number;
  const m = cell.text.replace(/\s/g, '').match(/-?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : null;
}

/** «ANA PÉREZ DE LA ROSA» → «Ana Pérez de la Rosa» (solo si viene todo en mayúsculas). */
export function normalizeName(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean !== clean.toUpperCase() || clean === clean.toLowerCase()) return clean;
  const small = ['de', 'del', 'la', 'las', 'los', 'y'];
  return clean
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && small.includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Lista separada por comas, punto y coma, barras o saltos de línea. */
export function splitList(text: string): string[] {
  return text
    .split(/[,;/\n]+|\s+y\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !['no', 'ninguna', 'ninguno', 'n a', 'na', '-'].includes(normalizeHeader(s)));
}
