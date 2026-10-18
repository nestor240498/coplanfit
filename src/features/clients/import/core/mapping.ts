import type { Cell, FieldId } from './types.ts';

/** Minúsculas, sin tildes ni signos («Fecha de Nacimiento» → «fecha de nacimiento»). */
export function normalizeHeader(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const FIELD_LABELS: Record<FieldId, string> = {
  full_name: 'Nombre completo',
  first_name: 'Nombre',
  last_name: 'Apellidos',
  phone: 'Teléfono',
  contact: 'Correo / contacto',
  birth_date: 'Fecha de nacimiento',
  age: 'Edad',
  sex: 'Sexo',
  goal: 'Objetivo',
  sport: 'Deporte',
  notes: 'Notas',
  medical_notes: 'Notas médicas',
  allergies: 'Alergias',
  conditions: 'Condiciones médicas',
  avoid: 'Alimentos a evitar',
  measured_at: 'Fecha de medición',
  weight_kg: 'Peso (kg)',
  height_cm: 'Talla (cm)',
  waist_cm: 'Cintura (cm)',
  hip_cm: 'Cadera (cm)',
  body_fat_pct: '% grasa',
  ignore: 'No importar',
};

/** Sinónimos por campo (ya normalizados). */
const SYNONYMS: Record<Exclude<FieldId, 'ignore'>, string[]> = {
  full_name: ['nombre completo', 'nombre y apellidos', 'nombres y apellidos', 'cliente', 'alumno', 'alumna', 'atleta', 'socio', 'paciente', 'asesorado', 'asesorada', 'name', 'full name'],
  first_name: ['nombre', 'nombres', 'first name'],
  last_name: ['apellido', 'apellidos', 'primer apellido', 'last name', 'surname'],
  phone: ['telefono', 'tlf', 'telf', 'tel', 'movil', 'celular', 'cel', 'whatsapp', 'wa', 'phone', 'numero'],
  contact: ['correo', 'email', 'e mail', 'mail', 'contacto', 'correo electronico'],
  birth_date: ['fecha de nacimiento', 'nacimiento', 'f nac', 'fnac', 'fecha nac', 'cumpleanos', 'dob', 'birthday', 'fecha de nac'],
  age: ['edad', 'age', 'anos'],
  sex: ['sexo', 'genero', 'sex', 'gender'],
  goal: ['objetivo', 'meta', 'objetivo nutricional', 'goal'],
  sport: ['deporte', 'disciplina', 'modalidad', 'sport'],
  notes: ['notas', 'nota', 'observaciones', 'comentarios', 'obs', 'notes'],
  medical_notes: ['notas medicas', 'historial medico', 'salud', 'medicacion', 'antecedentes', 'lesiones y medicacion'],
  allergies: ['alergias', 'alergia', 'intolerancias', 'intolerancia', 'alergias e intolerancias'],
  conditions: ['condiciones', 'condiciones medicas', 'patologias', 'patologia', 'enfermedades', 'lesiones'],
  avoid: ['alimentos a evitar', 'evitar', 'no come', 'no le gusta', 'evita'],
  measured_at: ['fecha de medicion', 'fecha medicion', 'fecha de la medicion', 'fecha'],
  weight_kg: ['peso', 'peso kg', 'masa', 'masa corporal', 'weight'],
  height_cm: ['talla', 'estatura', 'altura', 'talla cm', 'estatura cm', 'height'],
  waist_cm: ['cintura', 'perimetro cintura', 'cintura cm', 'waist'],
  hip_cm: ['cadera', 'perimetro cadera', 'cadera cm', 'hip'],
  body_fat_pct: ['% grasa', 'grasa', 'grasa corporal', '% grasa corporal', 'porcentaje de grasa', 'body fat'],
};

/** Campos que admiten varias columnas (se juntan). */
const MULTI: FieldId[] = ['notes', 'medical_notes', 'allergies', 'conditions', 'avoid'];

function scoreHeader(header: string, field: Exclude<FieldId, 'ignore'>): number {
  const h = normalizeHeader(header);
  if (!h) return 0;
  let best = 0;
  for (const syn of SYNONYMS[field]) {
    if (h === syn) return 1;
    // Palabra completa contenida («telefono movil», «peso actual kg»)
    if (` ${h} `.includes(` ${syn} `) && syn.length >= 3) best = Math.max(best, 0.8);
  }
  return best;
}

/** Pista por los valores de la columna (desempata o adivina sin cabecera clara). */
function sniffValues(cells: Cell[]): FieldId | null {
  const values = cells.map((c) => c.text.trim()).filter(Boolean).slice(0, 30);
  if (!values.length) return null;
  const share = (re: RegExp) => values.filter((v) => re.test(v)).length / values.length;
  if (share(/@/) > 0.6) return 'contact';
  if (share(/^[+\d][\d\s().-]{7,}$/) > 0.6) return 'phone';
  if (share(/^(h|m|f|hombre|mujer|masculino|femenino|varon|male|female)$/i) > 0.6) return 'sex';
  return null;
}

/** Fila de cabecera: la primera con 2 celdas o más donde alguna coincide con un sinónimo. */
export function detectHeaderRow(rows: Cell[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const filled = rows[i].filter((c) => c.text.trim() !== '');
    if (filled.length < 2) continue;
    const hits = filled.filter((c) => (Object.keys(SYNONYMS) as Exclude<FieldId, 'ignore'>[]).some((f) => scoreHeader(c.text, f) >= 0.8));
    if (hits.length >= 1) return i;
  }
  return 0;
}

/** Asigna un campo a cada columna (voraz, de mayor a menor puntuación; un campo por columna salvo MULTI). */
export function autoMapColumns(headers: Cell[], columns: Cell[][]): FieldId[] {
  const candidates: { col: number; field: Exclude<FieldId, 'ignore'>; score: number }[] = [];
  headers.forEach((header, col) => {
    for (const field of Object.keys(SYNONYMS) as Exclude<FieldId, 'ignore'>[]) {
      const score = scoreHeader(header.text, field);
      if (score > 0) candidates.push({ col, field, score });
    }
    const sniffed = sniffValues(columns[col] ?? []);
    if (sniffed && sniffed !== 'ignore') {
      const existing = candidates.find((c) => c.col === col && c.field === sniffed);
      if (existing) existing.score += 0.15;
      else candidates.push({ col, field: sniffed as Exclude<FieldId, 'ignore'>, score: 0.5 });
    }
  });
  candidates.sort((a, b) => b.score - a.score);
  const result: FieldId[] = headers.map(() => 'ignore');
  const used = new Set<FieldId>();
  for (const c of candidates) {
    if (result[c.col] !== 'ignore') continue;
    if (used.has(c.field) && !MULTI.includes(c.field)) continue;
    result[c.col] = c.field;
    used.add(c.field);
  }
  // «Nombre» + «Apellidos» por separado; si solo hay «Nombre», es el nombre completo
  if (result.includes('first_name') && !result.includes('last_name') && !result.includes('full_name')) {
    result[result.indexOf('first_name')] = 'full_name';
  }
  return result;
}
