/** Tipos de la importación de clientes (módulo puro: lo prueba `npm run check:import` en Node). */

/** Celda leída del archivo: texto visible y, si la hoja lo indica, número o fecha (número de serie de Excel). */
export type Cell = { text: string; number?: number; dateSerial?: number };

export type RawTable = { rows: Cell[][]; date1904: boolean };

export type FieldId =
  | 'full_name'
  | 'first_name'
  | 'last_name'
  | 'phone'
  | 'contact'
  | 'birth_date'
  | 'age'
  | 'sex'
  | 'goal'
  | 'sport'
  | 'notes'
  | 'medical_notes'
  | 'allergies'
  | 'conditions'
  | 'avoid'
  | 'measured_at'
  | 'weight_kg'
  | 'height_cm'
  | 'waist_cm'
  | 'hip_cm'
  | 'body_fat_pct'
  | 'ignore';

export type DateOrder = 'dmy' | 'mdy';

export type ImportSex = 'hombre' | 'mujer';

/** Fila lista para la RPC `import_clients`. */
export type ImportPayloadRow = {
  full_name: string;
  phone?: string | null;
  contact?: string | null;
  birth_date?: string | null;
  age?: number | null;
  sex?: ImportSex | null;
  goal?: string | null;
  sport?: string | null;
  notes?: string | null;
  medical_notes?: string | null;
  tags: { kind: 'alergia' | 'condicion' | 'evita'; label: string }[];
  measurement?: {
    measured_at?: string | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    waist_cm?: number | null;
    hip_cm?: number | null;
    body_fat_pct?: number | null;
  } | null;
};

export type RowStatus = 'ok' | 'warning' | 'error' | 'duplicate' | 'possible_duplicate' | 'repeated';

export type ParsedRow = {
  /** Número de fila en el archivo (1 = primera). */
  line: number;
  status: RowStatus;
  issues: string[];
  payload: ImportPayloadRow | null;
  /** Por defecto se importan las filas ok/warning; los duplicados no. */
  include: boolean;
};
