// Llamada común a Google Gemini para todas las Edge Functions.
// - Prueba los modelos en orden (el actual primero; Google retira los antiguos con un 404).
// - 503 (saturado) y 429 (límite de peticiones) son pasajeros: reintenta la ronda tras una pausa.
// - Devuelve el texto generado o un error con el detalle de cada intento (nunca incluye la clave).

export const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
const RETRY_DELAYS_MS = [0, 1500, 4000];

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; transient: boolean; detail: string };

export async function callGemini(apiKey: string, payload: unknown): Promise<GeminiResult> {
  const body = JSON.stringify(payload);
  let detail = '';
  let onlyTransient = true;

  for (const delay of RETRY_DELAYS_MS) {
    if (delay > 0) {
      if (!onlyTransient) break;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    for (const model of GEMINI_MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
        );
        if (!res.ok) {
          if (res.status !== 503 && res.status !== 429) onlyTransient = false;
          detail += `[${model}] ${res.status}: ${(await res.text()).slice(0, 160)}\n`;
          continue;
        }
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { ok: true, text };
        detail += `[${model}] respuesta vacía\n`;
      } catch (err) {
        detail += `[${model}] ${(err as Error).message}\n`;
      }
    }
  }
  return { ok: false, transient: onlyTransient, detail: detail.slice(0, 600) };
}

/** Mensaje para el entrenador cuando la IA falla; `fallback` explica qué pasa entonces. */
export function geminiFailureMessage(result: { transient: boolean }, fallback: string): string {
  return result.transient ? `La IA está saturada en este momento. ${fallback}` : `La IA no respondió. ${fallback}`;
}
