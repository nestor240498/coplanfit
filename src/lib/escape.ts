/**
 * Escapado de texto para HTML/SVG (PDF y gráficas). Puro: también lo usan los scripts de comprobación en Node.
 * Todo texto que venga del usuario (nombres, notas, alimentos…) debe pasar por `esc()`.
 */

export function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Texto multilínea escapado, con saltos de línea como <br/>. */
export function escMultiline(value: string | null | undefined): string {
  return esc(value).replace(/\n/g, '<br/>');
}
