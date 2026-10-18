import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { Profile } from '@/features/profile/types';

import { esc, escMultiline } from './escape';

/**
 * Base común de los PDF de CoplanFit (dirección visual "Navy Pro").
 * Todo texto que venga del usuario (nombres, notas, alimentos…) debe pasar por `esc()`.
 */

export { esc, escMultiline };

export const PDF_BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@700;800&display=swap');
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; color: #2E2E2E; font-size: 11px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .header-banner {
    background: #1B2A4A; color: #FFFFFF; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px; page-break-inside: avoid;
  }
  .header-title { font-family: 'Manrope', 'Inter', sans-serif; font-size: 19px; font-weight: 800; margin: 0; letter-spacing: 0.4px; }
  .header-subtitle { font-size: 11px; font-weight: 600; color: #B9C2D6; margin-top: 3px; }
  .goal-tag { background: #8BC53F; color: #1B2A4A; padding: 2px 7px; border-radius: 4px; font-weight: 800; margin-right: 6px; }
  .trainer-logo { width: 46px; height: 46px; border-radius: 23px; object-fit: cover; border: 2px solid #8BC53F; background: #FFFFFF; }
  .trainer-initials {
    width: 46px; height: 46px; border-radius: 23px; background: #22345A; color: #8BC53F; border: 2px solid #8BC53F;
    font-family: 'Manrope', sans-serif; font-size: 16px; font-weight: 800; display: flex; align-items: center; justify-content: center;
  }
  .meta-card {
    display: flex; justify-content: space-between; gap: 10px; background: #F4F6F9; border: 1px solid #DDE2EA;
    border-radius: 8px; padding: 8px 14px; margin-bottom: 14px; page-break-inside: avoid;
  }
  .meta-label { display: block; font-size: 9.5px; font-weight: 700; color: #717D96; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-val { display: block; font-size: 12px; font-weight: 800; color: #1B2A4A; margin-top: 2px; }
  .section-title {
    font-family: 'Manrope', 'Inter', sans-serif; font-size: 12px; font-weight: 800; color: #1B2A4A; text-transform: uppercase;
    letter-spacing: 0.5px; margin: 16px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #8BC53F; page-break-after: avoid;
  }
  .subsection-title { font-family: 'Manrope', sans-serif; font-size: 12.5px; font-weight: 800; color: #1B2A4A; margin: 12px 0 2px; }
  .muted { color: #5A6270; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th {
    background: #1B2A4A; color: #FFFFFF; font-family: 'Manrope', 'Inter', sans-serif; font-size: 10px; font-weight: 800;
    padding: 6px 8px; text-align: left; text-transform: uppercase; letter-spacing: 0.3px;
  }
  td { padding: 6px 8px; border-bottom: 1px solid #DDE2EA; vertical-align: top; }
  .info-card { background: #FAFBFD; border: 1px solid #DDE2EA; border-radius: 6px; padding: 10px 14px; margin: 10px 0 14px; page-break-inside: avoid; }
  .info-card-title { font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 800; color: #1B2A4A; text-transform: uppercase; margin-bottom: 4px; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .chip { background: #EEF0F4; color: #2E2E2E; border-radius: 10px; padding: 2px 8px; font-size: 10px; }
  .chip.danger { background: #FFE4DF; color: #B4442E; }
  .page-break { page-break-before: always; break-before: page; }
  .doc-footer {
    margin-top: 20px; padding-top: 10px; border-top: 1px dashed #CBD2E0; display: flex; justify-content: space-between;
    align-items: flex-end; gap: 16px; page-break-inside: avoid;
  }
  .doc-meta { font-size: 9px; color: #697182; }
  .trainer-name { font-family: 'Manrope', sans-serif; font-size: 13px; font-weight: 800; color: #1B2A4A; text-align: right; }
  .trainer-role { font-size: 10px; font-weight: 700; color: #4B7A1F; text-align: right; margin-top: 1px; }
  .trainer-desc { font-size: 9.5px; color: #5A6270; text-align: right; margin-top: 2px; max-width: 280px; }
`;

function trainerBadge(profile: Profile | null): string {
  if (profile?.logo_url) return `<img class="trainer-logo" src="${esc(profile.logo_url)}" alt="" />`;
  const initials = (profile?.business_name || profile?.full_name || 'CF')
    .split(' ')
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  return `<div class="trainer-initials">${esc(initials)}</div>`;
}

export function pdfHeader(opts: { title: string; subtitle?: string; tag?: string | null; profile: Profile | null }): string {
  return `
    <div class="header-banner">
      <div>
        <h1 class="header-title">${esc(opts.title)}</h1>
        ${
          opts.subtitle || opts.tag
            ? `<div class="header-subtitle">${opts.tag ? `<span class="goal-tag">${esc(opts.tag)}</span>` : ''}${esc(
                opts.subtitle
              )}</div>`
            : ''
        }
      </div>
      ${trainerBadge(opts.profile)}
    </div>`;
}

export function pdfMetaCard(items: { label: string; value: string | number | null | undefined }[]): string {
  return `<div class="meta-card">${items
    .filter((i) => i.value !== null && i.value !== undefined && i.value !== '')
    .map((i) => `<div><span class="meta-label">${esc(i.label)}</span><span class="meta-val">${esc(i.value)}</span></div>`)
    .join('')}</div>`;
}

export function pdfSectionTitle(title: string): string {
  return `<div class="section-title">${esc(title)}</div>`;
}

export function pdfFooter(profile: Profile | null, clientName: string, date: string): string {
  return `
    <div class="doc-footer" data-pdf-footer>
      <div class="doc-meta">Generado con CoplanFit · ${esc(clientName)} · ${esc(date)}<br/>Información orientativa: no es un diagnóstico ni sustituye una valoración médica.</div>
      <div>
        <div class="trainer-name">${esc(profile?.full_name || 'Entrenador personal')}</div>
        ${profile?.business_name ? `<div class="trainer-role">${esc(profile.business_name)}</div>` : ''}
        ${profile?.certification ? `<div class="trainer-role">Certificación declarada: ${esc(profile.certification)}</div>` : ''}
        ${profile?.description ? `<div class="trainer-desc">${esc(profile.description)}</div>` : ''}
      </div>
    </div>`;
}

export function pdfDocument(opts: { title: string; body: string; extraCss?: string }): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${esc(opts.title)}</title>
<style>${PDF_BASE_CSS}${opts.extraCss ?? ''}</style>
</head>
<body><div class="pdf-doc" data-pdf-doc>${opts.body}</div></body>
</html>`;
}

// ---------------------------------------------------------------------------------------------
// Salida: enviar (menú de compartir → WhatsApp, correo…) o descargar/imprimir
// ---------------------------------------------------------------------------------------------

// A4 en puntos (72 ppp). Sin esto expo-print genera tamaño Carta (EE. UU.).
const PAGE = { width: 595, height: 842 };
// Márgenes de cada página (un poco arriba y abajo, casi nada a los lados).
// En iOS van como opción de expo-print (ignora @page); en Android, por @page.
const MARGINS_PT = { top: 20, right: 14, bottom: 20, left: 14 };
const ANDROID_PAGE_CSS = '@page { size: A4 portrait; margin: 7mm 5mm; }';
/**
 * Prepara el HTML para imprimir. Con `pinned`, estira el documento (marcado con data-pdf-doc)
 * exactamente esas páginas y fija su pie (data-pdf-footer) al final de la última.
 */
function withPageSetup(html: string, pinned?: { pages: number; pageHeightPx: number }): string {
  let css = Platform.OS === 'ios' ? '' : ANDROID_PAGE_CSS;
  let out = html;
  if (pinned) {
    const height = `${Math.floor(pinned.pages * pinned.pageHeightPx) - 2}px`;
    css += `
      [data-pdf-doc="pinned"] { position: relative !important; min-height: ${height} !important; box-sizing: border-box; }
      [data-pdf-doc="pinned"] [data-pdf-footer] { position: absolute !important; left: 0; right: 0; bottom: 0; margin: 0 !important; }`;
    out = out.replace('data-pdf-doc', 'data-pdf-doc="pinned"');
  }
  return out.includes('</head>') ? out.replace('</head>', `<style>${css}</style></head>`) : `<style>${css}</style>${out}`;
}

const PRINT_OPTIONS = { width: PAGE.width, height: PAGE.height, margins: MARGINS_PT };

// Bloque de altura conocida para calibrar: cuanto mayor, más precisa la medida
const CALIBRATION_HEIGHT_PX = 80_000;

/**
 * Cuántos px de CSS caben en una página de ESTE documento. No se puede calcular de antemano:
 * el sistema reescala cada documento según su contenido (tablas anchas → más reducción).
 * Se imprime el mismo documento con un bloque de altura conocida en páginas aparte; como la
 * escala es la misma, las páginas añadidas dan la medida. Se usa la cota inferior para que el
 * pie nunca empuje a una página extra.
 */
async function measurePageHeightPx(html: string, contentPages: number): Promise<number | null> {
  const spacer = `<div style="page-break-before: always; break-before: page; height: ${CALIBRATION_HEIGHT_PX}px;"></div>`;
  const probe = html.includes('</body>') ? html.replace('</body>', `${spacer}</body>`) : html + spacer;
  const result = await Print.printToFileAsync({ html: withPageSetup(probe), ...PRINT_OPTIONS });
  const extraPages = result.numberOfPages - contentPages;
  return extraPages > 0 ? CALIBRATION_HEIGHT_PX / extraPages : null;
}

/**
 * Genera el PDF con el pie al final de la última página: 1) cuenta las páginas, 2) mide cuántos px
 * caben por página en este documento y 3) lo vuelve a generar con el pie fijado al fondo.
 * Si algo no cuadra (p. ej. saldría una página de más), se entrega la primera versión.
 */
async function renderPdfFile(html: string): Promise<string> {
  const first = await Print.printToFileAsync({ html: withPageSetup(html), ...PRINT_OPTIONS });
  if (!html.includes('data-pdf-doc') || !first.numberOfPages) return first.uri;
  const pageHeightPx = await measurePageHeightPx(html, first.numberOfPages).catch(() => null);
  if (!pageHeightPx) return first.uri;
  const pinned = await Print.printToFileAsync({
    html: withPageSetup(html, { pages: first.numberOfPages, pageHeightPx }),
    ...PRINT_OPTIONS,
  });
  return pinned.numberOfPages === first.numberOfPages ? pinned.uri : first.uri;
}

function printOnWeb(html: string) {
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(withPageSetup(html));
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 400);
}

/** Abre el menú de compartir del sistema con el PDF (WhatsApp, correo, Archivos…). */
export async function sharePdf(html: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === 'web') {
    printOnWeb(html);
    return;
  }
  const uri = await renderPdfFile(html);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartir no está disponible en este dispositivo.');
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle });
}

/** Abre el diálogo del sistema para guardar como PDF o imprimir. */
export async function downloadPdf(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    printOnWeb(html);
    return;
  }
  await Print.printAsync({ uri: await renderPdfFile(html) });
}
