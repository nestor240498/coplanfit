import { pickFileBytes } from '@/lib/pickFile';

import { type Cell, csvToTable, type RawTable } from './core';

export type SpreadsheetFile = { fileName: string; sheets: { name: string; table: RawTable }[] };

const MAX_BYTES = 5 * 1024 * 1024;
const TEXT_EXTENSIONS = ['csv', 'tsv', 'txt'];

/**
 * Elige y lee un Excel (.xlsx, .xls, .ods, .numbers) o CSV en el dispositivo: el archivo no se sube a ningún sitio.
 * SheetJS se carga solo al usarlo (no pesa en el arranque de la app).
 */
export async function pickSpreadsheet(): Promise<SpreadsheetFile | null> {
  const file = await pickFileBytes({
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.oasis.opendocument.spreadsheet',
      'text/csv',
      'text/comma-separated-values',
      'text/plain',
      'application/octet-stream',
    ],
    extensions: ['.xlsx', '.xls', '.ods', '.numbers', '.csv', '.tsv', '.txt'],
    maxBytes: MAX_BYTES,
  });
  if (!file) return null;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (TEXT_EXTENSIONS.includes(ext)) {
    return { fileName: file.name, sheets: [{ name: 'Hoja 1', table: csvToTable(file.bytes) }] };
  }
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(file.bytes, { type: 'array', cellDates: false, cellNF: true });
  const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904);
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const ref = sheet['!ref'];
    const rows: Cell[][] = [];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      for (let r = range.s.r; r <= range.e.r; r++) {
        const row: Cell[] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c })];
          if (!cell || cell.v == null) {
            row.push({ text: '' });
            continue;
          }
          if (cell.t === 'n') {
            const isDate = typeof cell.z === 'string' && XLSX.SSF.is_date(cell.z);
            // Fechas por número de serie: el texto formateado de Excel puede venir en m/d/aa
            row.push(isDate ? { text: String(cell.v), dateSerial: Number(cell.v) } : { text: String(cell.w ?? cell.v), number: Number(cell.v) });
          } else {
            row.push({ text: String(cell.w ?? cell.v).trim() });
          }
        }
        if (row.some((x) => x.text !== '')) rows.push(row);
      }
    }
    return { name, table: { rows, date1904 } };
  }).filter((s) => s.table.rows.length > 0);
  if (!sheets.length) throw new Error('El archivo no tiene datos.');
  return { fileName: file.name, sheets };
}
