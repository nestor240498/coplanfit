// Límite de generaciones con IA (migración 012). Se comprueba ANTES de llamar a Gemini y se anota
// DESPUÉS, solo si la IA respondió bien: los fallos no gastan generaciones.
// `supabase` debe ser el cliente con el JWT del entrenador (las funciones SQL usan auth.uid()).

type SupabaseLike = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type AiQuota = {
  daily_used: number;
  daily_limit: number;
  monthly_used: number;
  monthly_limit: number;
  extra_credits: number;
  day_resets_at: string;
  month_resets_at: string;
  can_generate: boolean;
  blocked_by: 'daily' | 'monthly' | null;
};

export type QuotaBlock = { status: 429; body: { error: string; code: string; quota: AiQuota } };

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', timeZone: 'America/Caracas' });
}

/**
 * null si puede generar; si no, la respuesta 429 con el mensaje para el entrenador.
 * `bundled`: técnica incluida en un «Completar datos con IA» reciente, que ya contó y no se bloquea.
 */
export async function checkAiQuota(
  supabase: SupabaseLike,
  whileWaiting: string,
  bundled = false
): Promise<QuotaBlock | null> {
  if (bundled) {
    const { data: included } = await supabase.rpc('has_bundled_technique');
    if (included === true) return null;
  }
  const { data, error } = await supabase.rpc('ai_quota_status');
  // Si la cuota no se puede leer (p. ej. migración sin aplicar) no se bloquea el trabajo del entrenador
  if (error || !data) {
    console.error('ai_quota_status falló:', error?.message);
    return null;
  }
  const quota = data as AiQuota;
  if (quota.can_generate) return null;

  const error_ =
    quota.blocked_by === 'daily'
      ? `Llegaste al límite de hoy: ${quota.daily_limit} generaciones con IA. Mañana vuelves a tenerlas. ${whileWaiting}`
      : `Usaste las ${quota.monthly_limit} generaciones con IA de este mes. Se renuevan el ${formatDay(quota.month_resets_at)}. ${whileWaiting}`;
  return { status: 429, body: { error: error_, code: `quota_${quota.blocked_by ?? 'monthly'}`, quota } };
}

/** Anota una generación con éxito. Un fallo al anotarla no debe estropear la respuesta ya obtenida. */
export async function recordAiGeneration(
  supabase: SupabaseLike,
  kind: 'plan' | 'rutina' | 'ejercicio' | 'medicion',
  clientId?: string | null,
  bundled = false
) {
  const { error } = await supabase.rpc('record_ai_generation', {
    p_kind: kind,
    p_client_id: clientId ?? null,
    p_bundled: bundled,
  });
  if (error) console.error('record_ai_generation falló:', error.message);
}
