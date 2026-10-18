/** Plantilla de importación: cabeceras en español, 2 filas de ejemplo e instrucciones. */
export const TEMPLATE_HEADERS = [
  'Nombre completo',
  'Teléfono',
  'Correo',
  'Fecha de nacimiento',
  'Sexo',
  'Objetivo',
  'Deporte',
  'Alergias',
  'Condiciones médicas',
  'Alimentos a evitar',
  'Notas',
  'Peso (kg)',
  'Talla (cm)',
  'Cintura (cm)',
  'Cadera (cm)',
];

export const TEMPLATE_EXAMPLES: string[][] = [
  ['Ana Pérez', '+58 412 1234567', 'ana@correo.com', '15/03/1990', 'Mujer', 'Bajar de peso', '', 'Lactosa', '', 'Pescado', 'Entrena por la mañana', '64,5', '165', '74', '98'],
  ['Carlos Ruiz', '0414-7654321', '', '02/11/1985', 'Hombre', 'Volumen', 'Fútbol', '', 'Hipertensión', '', '', '82', '178', '88', '101'],
];

export const TEMPLATE_INSTRUCTIONS: string[] = [
  'Una fila por cliente. Solo el nombre es obligatorio.',
  'Teléfono: con prefijo de país (+58, +34…) o en formato nacional; si falta el prefijo se usa el que elijas al importar.',
  'Fecha de nacimiento: día/mes/año (15/03/1990).',
  'Sexo: Hombre o Mujer (lo necesitan las ecuaciones de composición corporal).',
  'Objetivo: volumen, definición, subir de peso, bajar de peso, mantenimiento o recomposición. Otro texto se guarda en notas.',
  'Alergias, condiciones y alimentos a evitar: separados por comas.',
  'Peso, talla, cintura y cadera son opcionales: si están, se crea su primera medición con la fecha de hoy.',
  'Puedes cambiar el orden de las columnas o borrar las que no uses: al importar podrás revisar a qué corresponde cada una.',
];
