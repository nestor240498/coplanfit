import { esc } from '@/lib/escape';

import type { ChartScene } from './scene';

/** Tamaños de texto en el PDF (más pequeños que en pantalla). */
const PDF_SIZE = { micro: 8, label: 9, xs: 10 } as const;

const n = (v: number) => (Math.round(v * 100) / 100).toString();

/**
 * SVG en línea para los PDF (WKWebView/WebView/iframe): width/height/viewBox explícitos, sin filtros,
 * foreignObject ni variables CSS. Todo texto pasa por esc().
 */
export function toSvgString(scene: ChartScene): string {
  const parts = scene.nodes.map((node) => {
    switch (node.kind) {
      case 'rect':
        return `<rect x="${n(node.x)}" y="${n(node.y)}" width="${n(node.w)}" height="${n(node.h)}"${node.rx ? ` rx="${n(node.rx)}"` : ''} fill="${node.fill}"${node.stroke ? ` stroke="${node.stroke}" stroke-width="${node.strokeWidth ?? 1}"` : ''}${node.opacity != null ? ` opacity="${node.opacity}"` : ''}/>`;
      case 'path':
        return `<path d="${node.d}" fill="${node.fill ?? 'none'}"${node.stroke ? ` stroke="${node.stroke}" stroke-width="${node.strokeWidth ?? 1}"` : ''}${node.dash ? ` stroke-dasharray="${node.dash}"` : ''}${node.opacity != null ? ` opacity="${node.opacity}"` : ''}/>`;
      case 'line':
        return `<line x1="${n(node.x1)}" y1="${n(node.y1)}" x2="${n(node.x2)}" y2="${n(node.y2)}" stroke="${node.stroke}" stroke-width="${node.strokeWidth}"${node.dash ? ` stroke-dasharray="${node.dash}"` : ''}/>`;
      case 'circle':
        return `<circle cx="${n(node.cx)}" cy="${n(node.cy)}" r="${n(node.r)}" fill="${node.fill}"${node.stroke ? ` stroke="${node.stroke}" stroke-width="${node.strokeWidth ?? 1}"` : ''}/>`;
      case 'text':
        return `<text x="${n(node.x)}" y="${n(node.y)}" font-size="${PDF_SIZE[node.role]}" font-family="Inter, Helvetica, Arial, sans-serif"${node.weight === 'bold' ? ' font-weight="700"' : ''} text-anchor="${node.anchor ?? 'start'}" fill="${node.fill}">${esc(node.text)}</text>`;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(scene.width)}" height="${n(scene.height)}" viewBox="0 0 ${n(scene.width)} ${n(scene.height)}" role="img" aria-label="${esc(scene.desc)}">${parts.join('')}</svg>`;
}
