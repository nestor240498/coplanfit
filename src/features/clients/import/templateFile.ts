import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { TEMPLATE_EXAMPLES, TEMPLATE_HEADERS, TEMPLATE_INSTRUCTIONS } from './core';

const FILE_NAME = 'plantilla-clientes-coplanfit.xlsx';
const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Genera la plantilla .xlsx y la comparte (móvil) o la descarga (web). */
export async function shareImportTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const clients = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES]);
  clients['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  XLSX.utils.book_append_sheet(workbook, clients, 'Clientes');
  const help = XLSX.utils.aoa_to_sheet([['Cómo rellenar la plantilla'], ...TEMPLATE_INSTRUCTIONS.map((line) => [line])]);
  help['!cols'] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(workbook, help, 'Instrucciones');
  const bytes = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes], { type: MIME }));
    const a = document.createElement('a');
    a.href = url;
    a.download = FILE_NAME;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, FILE_NAME);
  file.create({ overwrite: true });
  file.write(bytes);
  await Sharing.shareAsync(file.uri, { mimeType: MIME, UTI: 'org.openxmlformats.spreadsheetml.sheet', dialogTitle: 'Plantilla de clientes' });
}
