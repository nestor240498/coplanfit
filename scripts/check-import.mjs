// Comprueba la lógica pura de la importación de clientes (CSV, columnas, fechas, teléfonos, duplicados).
// Uso: npm run check:import
import assert from 'node:assert/strict';

import {
  autoMapColumns,
  buildRows,
  csvToTable,
  decodeText,
  detectDateOrder,
  detectHeaderRow,
  excelSerialToIso,
  nameKey,
  parseCsv,
  parseDateCell,
  parseGoal,
  parseSex,
} from '../src/features/clients/import/core/index.ts';
import { parsePhoneInput } from '../src/lib/phone.ts';

let failures = 0;
let passes = 0;
function check(name, fn) {
  try {
    fn();
    passes += 1;
  } catch (error) {
    failures += 1;
    console.error(`✗ ${name}\n  ${error.message}`);
  }
}

const enc = (s) => new TextEncoder().encode(s);
const today = '2026-10-17';

// CSV y codificación
check('CSV con «;», comillas y salto de línea', () => {
  const rows = parseCsv('Nombre;Notas\n"Ana ""La Rápida""";"línea 1\nlínea 2"\n');
  assert.deepEqual(rows, [['Nombre', 'Notas'], ['Ana "La Rápida"', 'línea 1\nlínea 2']]);
});
check('UTF-8 con BOM', () => assert.equal(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...enc('Peña')])), 'Peña'));
check('Windows-1252 (Excel en español)', () => assert.equal(decodeText(new Uint8Array([0x50, 0x65, 0xf1, 0x61, 0x80])), 'Peña€'));

// Fechas
check('Serie de Excel 32947 → 1990-03-15', () => assert.equal(excelSerialToIso(32947), '1990-03-15'));
check('Serie de Excel 36526 → 2000-01-01', () => assert.equal(excelSerialToIso(36526), '2000-01-01'));
check('Sistema 1904: 31485 → 1990-03-15', () => assert.equal(excelSerialToIso(31485, true), '1990-03-15'));
const opts = { order: 'dmy', date1904: false, birth: true, today };
check('dd/mm/aaaa', () => assert.equal(parseDateCell({ text: '15/03/1990' }, opts), '1990-03-15'));
check('Año de 2 cifras en el pasado', () => assert.equal(parseDateCell({ text: '15-03-90' }, opts), '1990-03-15'));
check('«15 de marzo de 1990»', () => assert.equal(parseDateCell({ text: '15 de marzo de 1990' }, opts), '1990-03-15'));
check('31/02 no existe', () => assert.equal(parseDateCell({ text: '31/02/1990' }, opts), null));
check('Orden mm/dd detectado', () => assert.equal(detectDateOrder([{ text: '03/15/1990' }]).order, 'mdy'));
check('Orden ambiguo → dd/mm', () => assert.deepEqual(detectDateOrder([{ text: '03/04/1990' }]), { order: 'dmy', ambiguous: true }));

// Teléfonos
check('+34 612 34 56 78', () => assert.equal(parsePhoneInput('+34 612 34 56 78', '58').phone, '34612345678'));
check('0034…', () => assert.equal(parsePhoneInput('0034612345678', '58').phone, '34612345678'));
check('0412-1234567 (0 nacional)', () => assert.equal(parsePhoneInput('0412-1234567', '58').phone, '584121234567'));
check('4121234567 sin prefijo', () => assert.equal(parsePhoneInput('4121234567', '58').phone, '584121234567'));
check('584121234567 ya con prefijo', () => assert.equal(parsePhoneInput('584121234567', '58').phone, '584121234567'));
check('Varios números', () => {
  const r = parsePhoneInput('0412 1234567 / 0414 7654321', '58');
  assert.equal(r.phone, '584121234567');
  assert.equal(r.issue, 'multiple');
});
check('Teléfono inválido', () => assert.equal(parsePhoneInput('123', '58').issue, 'invalid'));

// Sexo y objetivo
check('M con columna que usa H → mujer', () => assert.equal(parseSex('M', true), 'mujer'));
check('M con columna que usa F → hombre', () => assert.equal(parseSex('M', false), 'hombre'));
check('Objetivo «perder peso» → bajar de peso', () => assert.equal(parseGoal('Perder peso'), 'bajar de peso'));
check('Nombre normalizado para duplicados', () => assert.equal(nameKey('Ruiz Carlos'), nameKey('CARLOS RUÍZ')));

// Archivo completo
const csv = [
  'Listado de clientes 2026;;;;;;',
  'Cliente;Teléfono;F. Nac;Sexo;Objetivo;Alergias;Peso',
  'ANA PÉREZ;+58 412 1234567;15/03/1990;M;Perder peso;lactosa, gluten;64,5',
  'Carlos Ruiz;0414-7654321;31/12/1985;H;Volumen;;82',
  ';;;;;;',
  'Luisa Gómez;123;99/99/1999;X;Ser feliz;;900',
  'carlos ruiz;0414-7654321;;H;;;',
  'Total;;;;;;',
].join('\n');
const table = csvToTable(enc(csv));
const headerRow = detectHeaderRow(table.rows);
check('Fila de cabecera tras el título', () => assert.equal(headerRow, 1));
const mapping = autoMapColumns(table.rows[headerRow], table.rows[headerRow].map((_, i) => table.rows.slice(headerRow + 1).map((r) => r[i] ?? { text: '' })));
check('Mapeo automático de columnas', () =>
  assert.deepEqual(mapping, ['full_name', 'phone', 'birth_date', 'sex', 'goal', 'allergies', 'weight_kg'])
);
const rows = buildRows(table, headerRow, mapping, {
  dateOrder: 'dmy',
  defaultPrefix: '58',
  existing: [{ id: 'x', full_name: 'Ana Pérez', phone: null, contact: null }],
  today,
});
check('4 filas (vacía y «Total» omitidas)', () => assert.equal(rows.length, 4));
check('Ana: posible duplicado, mujer, etiquetas y medición', () => {
  const ana = rows[0];
  assert.equal(ana.status, 'possible_duplicate');
  assert.equal(ana.include, false);
  assert.equal(ana.payload.full_name, 'Ana Pérez');
  assert.equal(ana.payload.sex, 'mujer');
  assert.equal(ana.payload.goal, 'bajar de peso');
  assert.equal(ana.payload.birth_date, '1990-03-15');
  assert.equal(ana.payload.phone, '584121234567');
  assert.deepEqual(ana.payload.tags.map((t) => t.label), ['lactosa', 'gluten']);
  assert.equal(ana.payload.measurement.weight_kg, 64.5);
  assert.equal(ana.payload.measurement.measured_at, today);
});
check('Carlos: correcto', () => {
  assert.equal(rows[1].status, 'ok');
  assert.equal(rows[1].payload.phone, '584147654321');
  assert.equal(rows[1].payload.sex, 'hombre');
});
check('Luisa: avisos y objetivo a notas', () => {
  const luisa = rows[2];
  assert.equal(luisa.status, 'warning');
  assert.equal(luisa.include, true);
  assert.equal(luisa.payload.phone, undefined);
  assert.equal(luisa.payload.birth_date, undefined);
  assert.equal(luisa.payload.measurement, undefined);
  assert.match(luisa.payload.notes, /Ser feliz/);
  assert.equal(luisa.issues.length, 4);
});
check('Carlos repetido en el archivo', () => {
  assert.equal(rows[3].status, 'repeated');
  assert.equal(rows[3].include, false);
});

console.log(`\n${passes} comprobaciones correctas, ${failures} fallidas.`);
if (failures) process.exit(1);
