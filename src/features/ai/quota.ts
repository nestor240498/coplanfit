import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

/** Estado de `ai_quota_status()` (migraciones 012 y 014). Cuentan planes, rutinas y ejercicios generados con IA. */
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

type QuotaState = {
  quota: AiQuota | null;
  refresh: () => Promise<void>;
};

/** Cuota compartida por Perfil y los asistentes; se refresca al entrar y tras cada generación. */
export const useAiQuota = create<QuotaState>((set) => ({
  quota: null,
  refresh: async () => {
    const { data, error } = await supabase.rpc('ai_quota_status');
    // Sin cuota legible no se bloquea nada: la Edge Function tiene la última palabra
    if (!error && data) set({ quota: data as AiQuota });
  },
}));

export function remainingToday(q: AiQuota): number {
  return Math.max(0, q.daily_limit - q.daily_used);
}

/** Lo que queda del cupo del mes más las generaciones extra. */
export function remainingMonth(q: AiQuota): number {
  return Math.max(0, q.monthly_limit - q.monthly_used) + q.extra_credits;
}

export function formatResetDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long' });
}

/**
 * Aviso para junto al botón de generar: null mientras quede de sobra.
 * Aparece al quedar ≤ 20 % del mes o ≤ 3 hoy, y explica cuándo vuelven si se agotaron.
 */
export function quotaHint(q: AiQuota | null): { text: string; blocked: boolean } | null {
  if (!q) return null;
  if (q.blocked_by === 'daily') {
    return { text: `Usaste las ${q.daily_limit} generaciones con IA de hoy. Mañana vuelves a tenerlas.`, blocked: true };
  }
  if (q.blocked_by === 'monthly') {
    return {
      text: `Usaste las ${q.monthly_limit} generaciones con IA del mes. Se renuevan el ${formatResetDay(q.month_resets_at)}.`,
      blocked: true,
    };
  }
  const today = remainingToday(q);
  const month = remainingMonth(q);
  if (month <= Math.ceil(q.monthly_limit * 0.2)) {
    return { text: `Te ${month === 1 ? 'queda 1 generación' : `quedan ${month} generaciones`} con IA este mes.`, blocked: false };
  }
  if (today <= 3) {
    return { text: `Te ${today === 1 ? 'queda 1 generación' : `quedan ${today} generaciones`} con IA hoy.`, blocked: false };
  }
  return null;
}
