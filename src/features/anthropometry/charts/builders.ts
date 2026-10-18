import { chartColors, colors } from '@/theme/colors';

import { approxTextWidth, type ChartScene, type SceneNode } from './scene';

const fmt = (v: number, d: number) => v.toFixed(d).replace('.', ',');

export type Segment = { label: string; value: number; color: string };

/** Barra horizontal apilada (composición en 4 tejidos, distribuciones). Leyenda y cifras van aparte. */
export function stackedBar(segments: Segment[], opts: { width: number; height?: number; desc: string }): ChartScene {
  const height = opts.height ?? 22;
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  const nodes: SceneNode[] = [];
  if (total <= 0) return { width: opts.width, height, desc: opts.desc, nodes };
  const gap = 2;
  const usable = opts.width - gap * (segments.length - 1);
  let x = 0;
  segments.forEach((seg, i) => {
    const w = (Math.max(0, seg.value) / total) * usable;
    if (w <= 0) return;
    const first = i === 0;
    const last = i === segments.length - 1;
    nodes.push({ kind: 'rect', x, y: 0, w, h: height, fill: seg.color, rx: first || last ? 4 : 0 });
    // Esquinas solo en los extremos: tapar el redondeo interior
    if (first && !last && w > 4) nodes.push({ kind: 'rect', x: x + w - 4, y: 0, w: 4, h: height, fill: seg.color });
    if (last && !first && w > 4) nodes.push({ kind: 'rect', x, y: 0, w: 4, h: height, fill: seg.color });
    x += w + gap;
  });
  return { width: opts.width, height, desc: opts.desc, nodes };
}

export type RangeBand = { from: number; to: number; color: string; label?: string };

/**
 * Barra de rangos con un marcador en el valor (IMC, ICT, índice músculo-óseo…).
 * Las bandas se dibujan proporcionales entre `min` y `max`; el valor se recorta a ese intervalo.
 */
export function rangeBar(opts: {
  width: number;
  bands: RangeBand[];
  min: number;
  max: number;
  value: number;
  /** Cifra sobre el marcador; se omite cuando el valor ya se muestra al lado (app). */
  valueLabel?: string;
  desc: string;
}): ChartScene {
  const { width, bands, min, max } = opts;
  const barY = opts.valueLabel ? 22 : 10;
  const barH = 10;
  const height = barY + 30;
  const sx = (v: number) => ((Math.min(Math.max(v, min), max) - min) / (max - min)) * width;
  const nodes: SceneNode[] = [];
  bands.forEach((band, i) => {
    const x1 = sx(band.from);
    const x2 = sx(band.to);
    nodes.push({ kind: 'rect', x: x1, y: barY, w: Math.max(0, x2 - x1 - (i < bands.length - 1 ? 2 : 0)), h: barH, fill: band.color, rx: 2 });
    if (band.label && x2 - x1 > approxTextWidth(band.label, 'micro') + 4) {
      nodes.push({ kind: 'text', x: (x1 + x2) / 2, y: barY + barH + 14, text: band.label, role: 'micro', fill: colors.textSecondary, anchor: 'middle' });
    }
  });
  const vx = sx(opts.value);
  nodes.push({ kind: 'path', d: `M ${vx - 6} ${barY - 9} L ${vx + 6} ${barY - 9} L ${vx} ${barY - 1} Z`, fill: colors.navy });
  nodes.push({ kind: 'line', x1: vx, y1: barY, x2: vx, y2: barY + barH, stroke: colors.navy, strokeWidth: 2 });
  if (opts.valueLabel) {
    const labelW = approxTextWidth(opts.valueLabel, 'label');
    const lx = Math.min(Math.max(vx, labelW / 2), width - labelW / 2);
    nodes.push({ kind: 'text', x: lx, y: barY - 12, text: opts.valueLabel, role: 'label', fill: colors.navy, anchor: 'middle', weight: 'bold' });
  }
  return { width, height, desc: opts.desc, nodes };
}

export type ZRow = { label: string; z: number | null; prevZ?: number | null; group?: string };

const PHANTOM_GROUP_LABELS: Record<string, string> = {
  basicas: 'Medidas básicas',
  pliegues: 'Pliegues',
  perimetros: 'Perímetros',
  diametros: 'Diámetros',
  corregidos: 'Perímetros corregidos',
  masas: 'Masas',
};

/**
 * Perfil de proporcionalidad Phantom. Filas agrupadas por tipo de medida, nombre a la izquierda,
 * Z a la derecha y, entre medias, un eje con guías verticales en cada entero y la banda ±1: así cada
 * punto se lee contra la misma regla. El círculo hueco es la evaluación anterior.
 */
export function phantomChart(rows: ZRow[], opts: { width: number; desc: string; /** Filas más bajas (PDF) para que quepa en una página. */ compact?: boolean }): ChartScene {
  // El nombre más largo manda, sin pasar del 46 % del ancho, para que nunca toque las guías
  const longest = Math.max(...rows.map((row) => approxTextWidth(row.label, 'label')), 0);
  const labelW = Math.min(Math.max(96, longest + 4), opts.width * 0.46);
  const valueW = 44;
  const plotX = labelW + 8;
  const plotW = opts.width - plotX - valueW - 6;
  const rowH = opts.compact ? 25 : 28;
  const headH = opts.compact ? 24 : 26;
  const axisH = 22;
  const lim = 3;
  const sx = (z: number) => plotX + ((Math.max(-lim, Math.min(lim, z)) + lim) / (2 * lim)) * plotW;

  // Posición vertical de cada fila (con cabeceras de grupo)
  const layout: { row?: ZRow; head?: string; y: number }[] = [];
  let y = axisH;
  let lastGroup: string | undefined;
  for (const row of rows) {
    if (row.group && row.group !== lastGroup) {
      layout.push({ head: PHANTOM_GROUP_LABELS[row.group] ?? row.group, y });
      y += headH;
      lastGroup = row.group;
    }
    layout.push({ row, y });
    y += rowH;
  }
  const height = y + 4;
  const nodes: SceneNode[] = [];
  // Banda ±1 y guías verticales por tramos de filas: las cabeceras de grupo quedan libres, así su texto
  // (más largo que la columna de nombres) nunca se cruza con una guía
  const runs: { from: number; to: number }[] = [];
  for (const item of layout) {
    if (item.head) continue;
    const last = runs[runs.length - 1];
    if (last && Math.abs(last.to - item.y) < 0.5) last.to = item.y + rowH;
    else runs.push({ from: item.y, to: item.y + rowH });
  }
  for (const run of runs) {
    nodes.push({ kind: 'rect', x: sx(-1), y: run.from, w: sx(1) - sx(-1), h: run.to - run.from, fill: chartColors.grid, opacity: 0.55 });
    for (const tick of [-3, -2, -1, 0, 1, 2, 3]) {
      nodes.push({ kind: 'line', x1: sx(tick), y1: run.from, x2: sx(tick), y2: run.to, stroke: tick === 0 ? colors.textMuted : chartColors.grid, strokeWidth: tick === 0 ? 1.2 : 1 });
    }
  }
  for (const tick of [-3, -2, -1, 0, 1, 2, 3]) {
    nodes.push({ kind: 'text', x: sx(tick), y: 12, text: String(tick), role: 'micro', fill: colors.textMuted, anchor: 'middle' });
  }
  for (const item of layout) {
    if (item.head) {
      nodes.push({ kind: 'text', x: 0, y: item.y + headH - 8, text: item.head, role: 'label', fill: colors.textSecondary, anchor: 'start', weight: 'bold' });
      continue;
    }
    const row = item.row!;
    const cy = item.y + rowH / 2;
    nodes.push({ kind: 'text', x: 0, y: cy + 4, text: row.label, role: 'label', fill: colors.text, anchor: 'start' });
    if (row.prevZ != null) {
      nodes.push({ kind: 'circle', cx: sx(row.prevZ), cy, r: 4, fill: colors.surface, stroke: chartColors.muted, strokeWidth: 1.5 });
    }
    if (row.z != null) {
      const x = sx(row.z);
      nodes.push({ kind: 'line', x1: sx(0), y1: cy, x2: x, y2: cy, stroke: colors.navy, strokeWidth: 1.5 });
      nodes.push({ kind: 'circle', cx: x, cy, r: 5, fill: colors.navy, stroke: colors.surface, strokeWidth: 1.5 });
      nodes.push({ kind: 'text', x: opts.width, y: cy + 4, text: fmt(row.z, 2), role: 'label', fill: colors.navy, anchor: 'end', weight: 'bold' });
    } else {
      nodes.push({ kind: 'text', x: opts.width, y: cy + 4, text: '—', role: 'label', fill: colors.textMuted, anchor: 'end' });
    }
  }
  return { width: opts.width, height, desc: opts.desc, nodes };
}

export type SomatoPoint = { x: number; y: number; label?: string };

/**
 * Somatocarta de Heath-Carter: triángulo de arcos (Reuleaux) con vértices en mesomorfia (0, 12),
 * endomorfia (−6, −6) y ectomorfia (6, −6). El eje Y se dibuja a escala 1/√3 para que el triángulo
 * sea equilátero, como en la somatocarta estándar.
 */
export function somatochart(points: { current: SomatoPoint; previous?: SomatoPoint[] }, opts: { width: number; desc: string }): ChartScene {
  const width = opts.width;
  const k = 1 / Math.sqrt(3);
  // Dominio horizontal en unidades de pantalla; el vertical se calcula en px para dejar sitio a los rótulos
  const xMin = -8.5;
  const xMax = 8.5;
  const scale = width / (xMax - xMin);
  const topPx = 26;
  const triH = 18 * k * scale;
  const sideLen = 12 * scale;
  const bulge = sideLen * (1 - Math.sqrt(3) / 2);
  const height = Math.round(topPx + triH + bulge + 30);
  const px = (x: number) => (x - xMin) * scale;
  const py = (y: number) => topPx + (12 - y) * k * scale;
  const meso = { x: px(0), y: py(12) };
  const endo = { x: px(-6), y: py(-6) };
  const ecto = { x: px(6), y: py(-6) };
  const r = Math.hypot(ecto.x - endo.x, ecto.y - endo.y);
  const arc = (a: { x: number; y: number }, b: { x: number; y: number }) => `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
  const nodes: SceneNode[] = [];
  const origin = { x: px(0), y: py(0) };
  for (const v of [meso, endo, ecto]) {
    nodes.push({ kind: 'line', x1: origin.x, y1: origin.y, x2: v.x, y2: v.y, stroke: chartColors.muted, strokeWidth: 1, dash: '3 3' });
  }
  nodes.push({ kind: 'path', d: `${arc(endo, meso)} ${arc(meso, ecto).replace('M', 'L')} ${arc(ecto, endo).replace('M', 'L')}`, fill: 'none', stroke: colors.textSecondary, strokeWidth: 1.2, dash: '5 4' });
  // Rótulos fuera de la figura: Meso sobre el vértice; Endo y Ecto bajo el arco inferior, pegados a su lado
  const labelY = endo.y + bulge + 20;
  nodes.push({ kind: 'text', x: meso.x, y: meso.y - 10, text: 'Mesomorfia', role: 'label', fill: colors.textSecondary, anchor: 'middle', weight: 'bold' });
  nodes.push({ kind: 'text', x: 4, y: labelY, text: 'Endomorfia', role: 'label', fill: colors.textSecondary, anchor: 'start', weight: 'bold' });
  nodes.push({ kind: 'text', x: width - 4, y: labelY, text: 'Ectomorfia', role: 'label', fill: colors.textSecondary, anchor: 'end', weight: 'bold' });
  const prev = points.previous ?? [];
  if (prev.length) {
    const all = [...prev, points.current];
    nodes.push({
      kind: 'path',
      d: all.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p.x)} ${py(p.y)}`).join(' '),
      fill: 'none',
      stroke: chartColors.muted,
      strokeWidth: 1,
    });
    for (const p of prev) nodes.push({ kind: 'circle', cx: px(p.x), cy: py(p.y), r: 4.5, fill: colors.surface, stroke: chartColors.muted, strokeWidth: 1.5 });
  }
  nodes.push({ kind: 'circle', cx: px(points.current.x), cy: py(points.current.y), r: 7, fill: colors.navy, stroke: colors.surface, strokeWidth: 2 });
  return { width, height, desc: opts.desc, nodes: [...nodes] };
}

export type TrendPoint = { label: string; value: number; hollow?: boolean };

/** Línea de evolución de una métrica (una por gráfica, sin doble eje). */
export function trendLine(points: TrendPoint[], opts: { width: number; height?: number; decimals: number; unit: string; desc: string }): ChartScene {
  const width = opts.width;
  const height = opts.height ?? 150;
  const padL = 8;
  const padR = 8;
  const top = 22;
  const bottom = 24;
  const nodes: SceneNode[] = [];
  if (points.length === 0) return { width, height, desc: opts.desc, nodes };
  const values = points.map((p) => p.value);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.15;
  lo -= pad;
  hi += pad;
  const plotW = width - padL - padR;
  const plotH = height - top - bottom;
  const sx = (i: number) => padL + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const sy = (v: number) => top + (1 - (v - lo) / (hi - lo)) * plotH;
  nodes.push({ kind: 'line', x1: padL, y1: top + plotH, x2: width - padR, y2: top + plotH, stroke: chartColors.grid, strokeWidth: 1 });
  if (points.length > 1) {
    nodes.push({
      kind: 'path',
      d: points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(p.value)}`).join(' '),
      fill: 'none',
      stroke: colors.navy,
      strokeWidth: 2,
    });
  }
  points.forEach((p, i) => {
    nodes.push({
      kind: 'circle',
      cx: sx(i),
      cy: sy(p.value),
      r: 4,
      fill: p.hollow ? colors.surface : colors.navy,
      stroke: colors.navy,
      strokeWidth: 1.5,
    });
  });
  // Etiquetas del primer y último punto (valor arriba, fecha abajo)
  const ends = points.length === 1 ? [0] : [0, points.length - 1];
  for (const i of ends) {
    const anchor = points.length === 1 ? 'middle' : i === 0 ? 'start' : 'end';
    const x = points.length === 1 ? sx(i) : i === 0 ? padL : width - padR;
    nodes.push({ kind: 'text', x, y: sy(points[i].value) - 10, text: `${fmt(points[i].value, opts.decimals)} ${opts.unit}`, role: 'label', fill: colors.navy, anchor, weight: 'bold' });
    nodes.push({ kind: 'text', x, y: height - 6, text: points[i].label, role: 'micro', fill: colors.textMuted, anchor });
  }
  return { width, height, desc: opts.desc, nodes };
}
