/**
 * Convierte errores técnicos (Supabase, red, Postgres) en mensajes que un entrenador entiende.
 * Nunca se muestra al usuario el texto crudo del servidor.
 */
export function friendlyError(error: unknown): string {
  const raw = (error instanceof Error ? error.message : String(error ?? '')).trim();
  const msg = raw.toLowerCase();

  if (!raw) return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
  // Diagnóstico en desarrollo: el mensaje ya trae la causa técnica marcada con [dev]
  if (__DEV__ && raw.includes('[dev]')) return raw;
  if (msg.includes('network request failed') || msg.includes('failed to fetch') || msg.includes('network'))
    return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  if (msg.includes('timeout') || msg.includes('timed out'))
    return 'El servidor tardó demasiado en responder. Inténtalo de nuevo.';
  if (msg.includes('jwt') || msg.includes('sesión expirada') || msg.includes('session') || msg.includes('not authenticated'))
    return 'Tu sesión caducó. Cierra sesión y vuelve a entrar.';
  if (msg.includes('row-level security') || msg.includes('permission denied') || msg.includes('not allowed'))
    return 'No tienes permiso para hacer esto.';
  if (msg.includes('duplicate key') || msg.includes('already exists'))
    return 'Ya existe un registro igual.';
  if (msg.includes('violates check constraint') || msg.includes('invalid input'))
    return 'Algún dato no tiene un formato válido. Revísalo e inténtalo de nuevo.';
  if (msg.includes('payload too large') || msg.includes('exceeded the maximum allowed size'))
    return 'El archivo es demasiado grande.';
  if (msg.includes('mime type') || msg.includes('invalid_mime_type'))
    return 'Ese tipo de archivo no está permitido.';
  if (msg.includes('pgrst116') || msg.includes('0 rows') || msg.includes('coerce the result to a single json'))
    return 'No se encontró lo que buscas. Puede que se haya eliminado.';

  // Mensajes ya escritos en español por la propia app (p. ej. validaciones): se muestran tal cual
  if (/[áéíóúñ¿¡]/i.test(raw) || /^(no |el |la |los |las |tu |ya |falta|revisa|sin )/i.test(raw)) return raw;
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}

/**
 * Error de una Edge Function con el mensaje en español que devuelve la función (`error`).
 * En desarrollo añade la causa técnica (`detail`, p. ej. la respuesta de Gemini) tras «[dev]».
 */
export class EdgeFunctionError extends Error {
  /** Código de la función, p. ej. `quota_daily` / `quota_monthly` al agotar las generaciones con IA. */
  code?: string;
}

export async function edgeFunctionError(error: unknown, fallback: string): Promise<EdgeFunctionError> {
  const context = (error as { context?: Response } | null)?.context;
  const body = (await context?.json?.().catch(() => null)) as { error?: string; detail?: string; code?: string } | null;
  const message = body?.error ?? fallback;
  // El límite de IA no es un fallo técnico: su mensaje ya lo explica todo
  const cause = body?.code ? null : body?.detail ?? context?.status ?? (error instanceof Error ? error.message : null);
  const result = new EdgeFunctionError(__DEV__ && cause ? `${message}\n\n[dev] ${cause}` : message);
  result.code = body?.code;
  return result;
}

export function isQuotaError(error: unknown): boolean {
  return error instanceof EdgeFunctionError && (error.code?.startsWith('quota_') ?? false);
}
