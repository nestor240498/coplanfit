import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export type PickedFile = { name: string; bytes: Uint8Array };

/**
 * Abre el selector de archivos del sistema y devuelve el contenido en bytes (null si se cancela).
 * En el móvil usa expo-file-system; en web, un <input type="file"> creado en el mismo toque
 * (los navegadores exigen un gesto del usuario).
 */
export async function pickFileBytes(options: { mimeTypes: string[]; extensions: string[]; maxBytes: number }): Promise<PickedFile | null> {
  if (Platform.OS === 'web') return pickOnWeb(options);
  const picked = await File.pickFileAsync({ mimeTypes: options.mimeTypes });
  if (picked.canceled) return null;
  const file = picked.result;
  if (file.size != null && file.size > options.maxBytes) throw new Error(tooLargeMessage(options.maxBytes));
  const bytes = await file.bytes();
  if (bytes.byteLength > options.maxBytes) throw new Error(tooLargeMessage(options.maxBytes));
  return { name: file.name, bytes };
}

function tooLargeMessage(maxBytes: number): string {
  return `El archivo pesa demasiado: el máximo es ${Math.round(maxBytes / (1024 * 1024))} MB.`;
}

function pickOnWeb(options: { extensions: string[]; maxBytes: number }): Promise<PickedFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.extensions.join(',');
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return resolve(null);
      if (file.size > options.maxBytes) return reject(new Error(tooLargeMessage(options.maxBytes)));
      resolve({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    };
    // Si el usuario cierra el diálogo sin elegir, algunos navegadores no avisan: se resuelve al volver el foco
    window.addEventListener(
      'focus',
      () => setTimeout(() => {
        if (!input.files?.length && document.body.contains(input)) {
          input.remove();
          resolve(null);
        }
      }, 800),
      { once: true }
    );
    document.body.appendChild(input);
    input.click();
  });
}

/** Bytes → base64 (para enviar archivos a una Edge Function). */
export function bytesToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + chars[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + '=';
  }
  return out;
}
