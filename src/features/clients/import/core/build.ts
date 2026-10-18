import { parsePhoneInput } from '../../../../lib/phone.ts';
import { normalizeHeader } from './mapping.ts';
import type { Cell, DateOrder, FieldId, ImportPayloadRow, ParsedRow, RawTable } from './types.ts';
import { normalizeName, parseDateCell, parseGoal, parseNumber, parseSex, splitList } from './values.ts';

export type ExistingClient = { id: string; full_name: string; phone: string | null; contact: string | null };

export type BuildOptions = {
  dateOrder: DateOrder;
  defaultPrefix: string;
  existing: ExistingClient[];
  today: string;
};

/** Clave de nombre para detectar duplicados: «Ruiz Carlos» = «CARLOS RUÍZ». */
export function nameKey(name: string): string {
  return normalizeHeader(name).split(' ').filter(Boolean).sort().join(' ');
}

const RANGES: Record<'weight_kg' | 'height_cm' | 'waist_cm' | 'hip_cm' | 'body_fat_pct', [number, number]> = {
  weight_kg: [2, 400],
  height_cm: [40, 250],
  waist_cm: [30, 250],
  hip_cm: [40, 250],
  body_fat_pct: [2, 70],
};

const MEASURE_LABELS = { weight_kg: 'peso', height_cm: 'talla', waist_cm: 'cintura', hip_cm: 'cadera', body_fat_pct: '% grasa' } as const;

/** Convierte las filas del archivo en filas listas para importar, con su estado y avisos. */
export function buildRows(table: RawTable, headerRow: number, mapping: FieldId[], opts: BuildOptions): ParsedRow[] {
  const cols = (field: FieldId) => mapping.flatMap((f, i) => (f === field ? [i] : []));
  const colOf = (field: FieldId) => cols(field)[0];
  const sexCol = colOf('sex');
  const sexUsesH =
    sexCol != null && table.rows.slice(headerRow + 1).some((r) => normalizeHeader(r[sexCol]?.text ?? '') === 'h');

  const existingByPhone = new Map(opts.existing.filter((c) => c.phone).map((c) => [c.phone!, c]));
  const existingByEmail = new Map(
    opts.existing.filter((c) => c.contact?.includes('@')).map((c) => [c.contact!.trim().toLowerCase(), c])
  );
  const existingByName = new Map(opts.existing.map((c) => [nameKey(c.full_name), c]));
  const seen = new Set<string>();
  const out: ParsedRow[] = [];

  table.rows.slice(headerRow + 1).forEach((cells, index) => {
    const line = headerRow + index + 2;
    const cell = (col: number | undefined): Cell => (col == null ? { text: '' } : (cells[col] ?? { text: '' }));
    const text = (field: FieldId) => cols(field).map((c) => cell(c).text.trim()).filter(Boolean).join('\n');
    if (cells.every((c) => !c.text.trim())) return;
    const issues: string[] = [];

    // Nombre
    let name = text('full_name');
    if (!name) name = [text('first_name'), text('last_name')].filter(Boolean).join(' ');
    name = normalizeName(name);
    if (/^(sub)?total\b/i.test(name)) return;
    if (!name) {
      out.push({ line, status: 'error', issues: ['Falta el nombre.'], payload: null, include: false });
      return;
    }

    const payload: ImportPayloadRow = { full_name: name.slice(0, 120), tags: [] };
    const notes: string[] = [];

    // Teléfono y contacto
    const rawPhone = text('phone');
    if (rawPhone) {
      const parsed = parsePhoneInput(rawPhone, opts.defaultPrefix);
      if (parsed.phone) payload.phone = parsed.phone;
      if (parsed.issue === 'invalid') issues.push(`Teléfono no válido («${rawPhone}»): se importa sin él.`);
      if (parsed.issue === 'multiple') {
        issues.push('Había varios teléfonos: se usa el primero y el resto va a contacto.');
        payload.contact = parsed.rest ?? null;
      }
    }
    const contact = text('contact');
    if (contact) payload.contact = [payload.contact, contact].filter(Boolean).join(' · ').slice(0, 200);

    // Fecha de nacimiento o edad
    const birthCol = colOf('birth_date');
    if (birthCol != null && cell(birthCol).text.trim()) {
      const birth = parseDateCell(cell(birthCol), { order: opts.dateOrder, date1904: table.date1904, birth: true, today: opts.today });
      if (!birth || birth > opts.today) issues.push(`Fecha de nacimiento no reconocida («${cell(birthCol).text}»).`);
      else payload.birth_date = birth;
    }
    const ageCol = colOf('age');
    if (!payload.birth_date && ageCol != null) {
      const age = parseNumber(cell(ageCol));
      if (age != null) {
        if (age >= 5 && age <= 100) payload.age = Math.round(age);
        else issues.push(`Edad fuera de rango (${age}): se importa sin ella.`);
      }
    }

    // Sexo, objetivo, deporte
    if (sexCol != null && cell(sexCol).text.trim()) {
      const sex = parseSex(cell(sexCol).text, sexUsesH);
      if (sex) payload.sex = sex;
      else issues.push(`Sexo no reconocido («${cell(sexCol).text}»).`);
    }
    const goalText = text('goal');
    if (goalText) {
      const goal = parseGoal(goalText);
      if (goal) payload.goal = goal;
      else notes.push(`Objetivo (importado): ${goalText}`);
    }
    const sport = text('sport');
    if (sport) payload.sport = sport.slice(0, 80);

    // Notas y etiquetas
    const plainNotes = text('notes');
    if (plainNotes) notes.unshift(plainNotes);
    if (notes.length) payload.notes = notes.join('\n');
    const medical = text('medical_notes');
    if (medical) payload.medical_notes = medical;
    for (const [field, kind] of [['allergies', 'alergia'], ['conditions', 'condicion'], ['avoid', 'evita']] as const) {
      const value = text(field);
      if (value) for (const label of splitList(value)) payload.tags.push({ kind, label: label.slice(0, 80) });
    }

    // Primera medición (si la fila trae alguna medida)
    const measurement: NonNullable<ImportPayloadRow['measurement']> = {};
    for (const key of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
      const col = colOf(key);
      if (col == null || !cell(col).text.trim()) continue;
      let value = parseNumber(cell(col));
      if (value != null && key === 'height_cm' && value > 0 && value < 3) value = value * 100; // metros
      const [min, max] = RANGES[key];
      if (value == null || value < min || value > max) issues.push(`${MEASURE_LABELS[key]} fuera de rango («${cell(col).text}»): se importa sin ella.`);
      else measurement[key] = Math.round(value * 10) / 10;
    }
    if (Object.keys(measurement).length) {
      const dateCol = colOf('measured_at');
      const date =
        dateCol != null
          ? parseDateCell(cell(dateCol), { order: opts.dateOrder, date1904: table.date1904, birth: false, today: opts.today })
          : null;
      measurement.measured_at = date && date <= opts.today ? date : opts.today;
      payload.measurement = measurement;
    }

    // Duplicados (contra los clientes existentes y dentro del archivo)
    const key = nameKey(name);
    const email = contact.includes('@') ? contact.trim().toLowerCase() : null;
    const fileKeys = [`n:${key}`, payload.phone ? `p:${payload.phone}` : null, email ? `e:${email}` : null].filter(Boolean) as string[];
    let status: ParsedRow['status'] = issues.length ? 'warning' : 'ok';
    if (fileKeys.some((k) => seen.has(k))) {
      status = 'repeated';
      issues.unshift('Repetido en el archivo.');
    } else if ((payload.phone && existingByPhone.has(payload.phone)) || (email && existingByEmail.has(email))) {
      status = 'duplicate';
      issues.unshift('Ya existe un cliente con el mismo teléfono o correo.');
    } else if (existingByName.has(key)) {
      status = 'possible_duplicate';
      issues.unshift('Ya tienes un cliente con este nombre.');
    }
    fileKeys.forEach((k) => seen.add(k));
    out.push({ line, status, issues, payload, include: status === 'ok' || status === 'warning' });
  });
  return out;
}
