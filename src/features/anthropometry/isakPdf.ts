import type { Profile } from '@/features/profile/types';
import { formatDateShort, formatGoal } from '@/lib/format';
import { esc, pdfDocument, pdfFooter, pdfHeader, pdfSectionTitle } from '@/lib/pdf';
import { resolveMediaUrls } from '@/lib/storage';

import { phantomChart, rangeBar, somatochart, stackedBar } from './charts/builders';
import { toSvgString } from './charts/toSvgString';
import {
  type Block,
  FAT_EQUATION_LABELS,
  fmtEs,
  GROUP_LABELS,
  GROUP_ORDER,
  type MeasurementReadings,
  MUSCLE_BONE_RANGES,
  SITES,
} from './engine';
import { chartColors } from '@/theme/colors';
import { conicityRange, DISTRIBUTION_COLORS, phantomZRows, RANGES, type ReportContext, tissueSegments, whrRange } from './report';

/** Ancho útil de las gráficas en el PDF (A4 con márgenes de la base común, en px CSS). Los SVG se ajustan solos si el contenedor es menor. */
const W = 700;
const HALF = 340;

const CSS = `
  .idcard { display: flex; border: 1px solid #DDE2EA; border-radius: 8px; background: #FAFBFD; margin-bottom: 12px; page-break-inside: avoid; }
  .idcard > div { padding: 10px 14px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .idcard > div + div { border-left: 1px solid #DDE2EA; }
  .id-main { flex: 1.7; }
  .id-col { flex: 1; }
  .id-label { font-size: 8.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: #6B7485; }
  .id-name { font-family: 'Manrope', 'Inter', sans-serif; font-size: 18px; font-weight: 800; color: #1B2A4A; line-height: 1.15; }
  .id-big { font-family: 'Manrope', 'Inter', sans-serif; font-size: 14px; font-weight: 800; color: #1B2A4A; line-height: 1.2; }
  .id-facts { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
  .id-facts i { font-style: normal; font-size: 9.5px; font-weight: 600; color: #1B2A4A; background: #EEF0F4; border-radius: 10px; padding: 2px 9px; }
  .id-sub { font-size: 9.5px; color: #5A6270; line-height: 1.4; margin-top: 2px; }
  .id-sub b { color: #1B2A4A; }
  .isak-grid { display: flex; gap: 16px; }
  .isak-grid > div { flex: 1; min-width: 0; }
  .tiles { display: flex; gap: 8px; margin-bottom: 8px; }
  .tile { flex: 1; background: #F7F8FA; border-radius: 6px; padding: 8px 10px; }
  .tile b { display: block; font-family: 'Manrope', 'Inter', sans-serif; font-size: 17px; color: #1B2A4A; }
  .tile span { font-size: 9px; color: #5A6270; }
  .chart { page-break-inside: avoid; margin: 6px 0 4px; }
  .chart svg { max-width: 100%; height: auto; }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 9.5px; color: #2E2E2E; margin-bottom: 6px; }
  .legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
  .soma { display: flex; gap: 8px; margin-bottom: 6px; }
  .soma > div { flex: 1; text-align: center; background: #F7F8FA; border-radius: 6px; padding: 8px 4px; font-size: 9.5px; color: #5A6270; }
  .soma b { display: block; font-size: 17px; color: #1B2A4A; margin: 2px 0; }
  .soma em { display: block; font-style: normal; font-weight: 700; font-size: 10px; color: #1B2A4A; }
  .soma .bar { height: 4px; border-radius: 2px; background: #E4E7ED; margin: 3px 10px; }
  .soma .bar i { display: block; height: 4px; border-radius: 2px; background: #1B2A4A; }
  .note { font-size: 9px; color: #5A6270; margin: 2px 0 6px; }
  .good { color: #4B7A1F; font-weight: 700; }
  .bad { color: #B4442E; font-weight: 700; }
  .warn { color: #7A5200; font-weight: 700; }
  .section { page-break-inside: avoid; }
  .new-page { page-break-before: always; break-before: page; }
  .refs { font-size: 8.5px; color: #5A6270; line-height: 1.4; }
  .pill { display: inline-block; font-size: 9px; font-weight: 700; padding: 1px 8px; border-radius: 10px; background: #EEF0F4; color: #2E2E2E; }
  .pill.good { background: #E3F1D3; color: #3F6B17; }
  .pill.warn { background: #FFF1CC; color: #7A5200; }
  .pill.bad { background: #FBE0DA; color: #B4442E; }
  .ind { padding: 7px 0 4px; border-bottom: 1px solid #E4E7ED; page-break-inside: avoid; }
  .ind-h { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .ind-l { font-size: 11px; color: #2E2E2E; }
  .ind-v { font-size: 12px; font-weight: 700; color: #1B2A4A; }
  .ind-s { display: flex; align-items: center; gap: 8px; margin-top: 2px; font-size: 9px; color: #5A6270; }
  .ind .chart { margin: 2px 0 0; }
  .range { display: flex; flex-wrap: wrap; gap: 3px 10px; margin-top: 4px; font-size: 9px; color: #5A6270; }
  .range span { white-space: nowrap; }
  .range i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
  .range .on { color: #1B2A4A; font-weight: 700; }
  .mg { page-break-inside: avoid; margin-bottom: 8px; }
  .mg-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: #1B2A4A; background: #EEF1F6; padding: 4px 8px; border-radius: 4px; }
  .mg table { margin-bottom: 0; }
  .mg td { padding: 4px 8px; font-size: 10.5px; }
  .rd { display: block; font-size: 8.5px; color: #5A6270; }
`;

function row(label: string, value: string, note?: string): string {
  return `<tr><td>${esc(label)}${note ? `<div class="note">${esc(note)}</div>` : ''}</td><td style="text-align:right"><b>${value}</b></td></tr>`;
}

function pill(band: { label: string; tone: 'good' | 'neutral' | 'warn' | 'bad' } | null): string {
  return band ? `<span class="pill ${band.tone}">${esc(band.label)}</span>` : '';
}

function blockValue<T>(block: Block<T>, render: (v: T) => string): string {
  return block.ok ? render(block.value) : '—';
}

/** Informe antropométrico ISAK con gráficas (mismas escenas que en la app). */
export async function buildIsakPdfHtml({
  ctx,
  profile,
  includePhotos,
}: {
  ctx: ReportContext;
  profile: Profile | null;
  includePhotos: boolean;
}): Promise<string> {
  const { measurement: m, client, results: r, previousResults: prev } = ctx;
  const date = formatDateShort(m.measured_at);
  const readings = (m.readings as MeasurementReadings | null)?.sites ?? {};
  const photos = includePhotos ? await resolveMediaUrls(m.photos) : [];
  const segments = tissueSegments(r);

  const sexLabel = client.sex === 'hombre' ? 'Hombre' : client.sex === 'mujer' ? 'Mujer' : null;
  const facts = [
    ctx.ageYears != null ? `${ctx.ageYears} años` : null,
    sexLabel,
    client.sport ?? null,
    client.days_per_week ? `${client.days_per_week} días por semana` : null,
  ].filter(Boolean) as string[];
  const evaluator = profile?.full_name || null;
  const meta = `<div class="idcard">
    <div class="id-main">
      <span class="id-label">Cliente</span>
      <span class="id-name">${esc(client.full_name)}</span>
      ${facts.length ? `<span class="id-facts">${facts.map((f) => `<i>${esc(f)}</i>`).join('')}</span>` : ''}
      ${client.goal ? `<span class="id-sub">Objetivo: <b>${esc(formatGoal(client.goal))}</b></span>` : ''}
    </div>
    <div class="id-col">
      <span class="id-label">Evaluación</span>
      <span class="id-big">${esc(date)}</span>
      <span class="id-sub">N.º ${ctx.evaluationNumber} de ${ctx.evaluationsTotal}${ctx.daysSincePrevious != null ? `<br/>${ctx.daysSincePrevious} días desde la anterior` : ''}</span>
    </div>
    ${evaluator ? `<div class="id-col">
      <span class="id-label">Evaluador</span>
      <span class="id-big">${esc(evaluator)}</span>
      <span class="id-sub">${[profile?.certification ? `${profile.certification} (declarada)` : null, profile?.business_name].filter(Boolean).map((x) => esc(x as string)).join('<br/>')}</span>
    </div>` : ''}
  </div>`;

  const summary = `<div class="tiles">
    <div class="tile"><b>${blockValue(r.fat, (f) => `${fmtEs(f.pct, 1)} %`)}</b><span>% grasa</span></div>
    <div class="tile"><b>${blockValue(r.muscle, (x) => `${fmtEs(x.kg, 1)} kg`)}</b><span>Masa muscular</span></div>
    <div class="tile"><b>${blockValue(r.sum6, (x) => `${fmtEs(x, 1)} mm`)}</b><span>Σ 6 pliegues</span></div>
    <div class="tile"><b>${m.weight_kg != null ? `${fmtEs(m.weight_kg, 1)} kg` : '—'}</b><span>Masa corporal${r.bmi.ok ? ` · IMC ${fmtEs(r.bmi.value.value, 1)}` : ''}</span></div>
  </div>`;

  const composition = `<div class="section">${pdfSectionTitle('Composición corporal')}
    <div class="isak-grid">
      <div><table>
        ${r.fat.ok ? row('Masa grasa', r.fat.value.fatKg != null ? `${fmtEs(r.fat.value.fatKg, 2)} kg · ${fmtEs(r.fat.value.pct, 2)} %` : `${fmtEs(r.fat.value.pct, 2)} %`, FAT_EQUATION_LABELS[r.fat.value.equation]) : row('Masa grasa', '—')}
        ${r.fat.ok && r.fat.value.ffmKg != null ? row('Masa libre de grasa', `${fmtEs(r.fat.value.ffmKg, 2)} kg`) : ''}
        ${row('Tejido adiposo (Kerr)', blockValue(r.adipose, (x) => `${fmtEs(x.kg, 2)} kg`))}
        ${row('Tejido muscular (Lee 2000)', blockValue(r.muscle, (x) => `${fmtEs(x.kg, 2)} kg`))}
        ${row('Tejido óseo (Rocha)', blockValue(r.bone, (x) => `${fmtEs(x.kg, 2)} kg`))}
        ${row('Tejido residual', blockValue(r.residual, (x) => `${fmtEs(x.kg, 2)} kg`))}
      </table></div>
      <div>
        ${segments.length ? `<div class="chart">${toSvgString(stackedBar(segments, { width: HALF, height: 18, desc: 'Composición por tejidos' }))}</div>
        <div class="legend">${segments.map((sg) => `<span><i style="background:${sg.color}"></i>${esc(sg.label)} ${m.weight_kg ? fmtEs((sg.value / m.weight_kg) * 100, 1) : '—'} %</span>`).join('')}</div>` : ''}
        <table>
          ${row('Índice adiposo-muscular', blockValue(r.adiposeMuscleIndex, (x) => fmtEs(x, 2)), 'Kg de tejido adiposo por kg de músculo; cuanto menor, mejor.')}
        </table>
        ${r.muscleBoneIndex.ok ? `<div class="ind"><div class="ind-h"><span class="ind-l">Índice músculo-óseo</span><span class="ind-v">${fmtEs(r.muscleBoneIndex.value.value, 2)}</span></div>
          <div class="ind-s">${pill(r.muscleBoneIndex.value.band)}</div>
          <div class="chart">${toSvgString(rangeBar({ width: HALF, ...RANGES.muscleBone, value: r.muscleBoneIndex.value.value, desc: 'Índice músculo-óseo' }))}</div>
          <div class="range">${MUSCLE_BONE_RANGES.map((x, i) => `<span class="${r.muscleBoneIndex.ok && r.muscleBoneIndex.value.band?.label === x.label ? 'on' : ''}"><i style="background:${chartColors.ordinal[i]}"></i>${esc(x.label)} ${esc(x.range)}</span>`).join('')}</div></div>` : ''}
      </div>
    </div></div>`;

  const distribution = r.adiposeDistribution.ok || r.muscleDistribution.ok
    ? `<div class="section">${pdfSectionTitle('Distribución adiposa y muscular')}<div class="isak-grid">
      <div>${r.adiposeDistribution.ok ? `<div class="chart">${toSvgString(stackedBar([
        { label: 'Superior', value: r.adiposeDistribution.value.superior, color: DISTRIBUTION_COLORS[0] },
        { label: 'Central', value: r.adiposeDistribution.value.central, color: DISTRIBUTION_COLORS[1] },
        { label: 'Inferior', value: r.adiposeDistribution.value.inferior, color: DISTRIBUTION_COLORS[2] },
      ], { width: HALF, height: 16, desc: 'Distribución adiposa' }))}</div>
      <div class="legend"><span><i style="background:${DISTRIBUTION_COLORS[0]}"></i>Superior ${fmtEs(r.adiposeDistribution.value.superior, 1)} %</span><span><i style="background:${DISTRIBUTION_COLORS[1]}"></i>Central ${fmtEs(r.adiposeDistribution.value.central, 1)} %</span><span><i style="background:${DISTRIBUTION_COLORS[2]}"></i>Inferior ${fmtEs(r.adiposeDistribution.value.inferior, 1)} %</span></div>` : ''}</div>
      <div>${r.muscleDistribution.ok ? `<div class="chart">${toSvgString(stackedBar([
        { label: 'Brazo', value: r.muscleDistribution.value.arm, color: DISTRIBUTION_COLORS[0] },
        { label: 'Muslo', value: r.muscleDistribution.value.thigh, color: DISTRIBUTION_COLORS[1] },
        { label: 'Pierna', value: r.muscleDistribution.value.calf, color: DISTRIBUTION_COLORS[2] },
      ], { width: HALF, height: 16, desc: 'Distribución muscular' }))}</div>
      <div class="legend"><span><i style="background:${DISTRIBUTION_COLORS[0]}"></i>Brazo ${fmtEs(r.muscleDistribution.value.arm, 1)} %</span><span><i style="background:${DISTRIBUTION_COLORS[1]}"></i>Muslo ${fmtEs(r.muscleDistribution.value.thigh, 1)} %</span><span><i style="background:${DISTRIBUTION_COLORS[2]}"></i>Pierna ${fmtEs(r.muscleDistribution.value.calf, 1)} %</span></div>` : ''}</div>
    </div></div>`
    : '';

  const somatotype = r.somatotype.ok
    ? `<div class="section">${pdfSectionTitle('Somatotipo (Heath-Carter)')}<div class="isak-grid">
      <div>
        <div class="soma">${(
          [
            ['Endomorfia', 'Adiposidad', r.somatotype.value.endo],
            ['Mesomorfia', 'Músculo', r.somatotype.value.meso],
            ['Ectomorfia', 'Linealidad', r.somatotype.value.ecto],
          ] as const
        )
          .map(
            ([name, meaning, v]) =>
              `<div>${name}<b>${fmtEs(v, 2)}</b><div class="bar"><i style="width:${Math.min(100, (v / 7) * 100)}%"></i></div><em>${v <= 2.5 ? 'Bajo' : v <= 5 ? 'Moderado' : v <= 7 ? 'Alto' : 'Muy alto'}</em>${meaning}</div>`
          )
          .join('')}</div>
        <p class="note"><b>${esc(r.somatotype.value.categoryLabel)}</b>. Endomorfia: adiposidad relativa; mesomorfia: desarrollo músculo-esquelético; ectomorfia: linealidad. Barra: valor sobre una escala de 1 a 7.</p>
        ${ctx.earlier.some((e) => e.results.somatotype.ok) ? '<p class="note">● Actual · ○ evaluaciones anteriores.</p>' : ''}
      </div>
      <div class="chart">${toSvgString(somatochart({
        current: { x: r.somatotype.value.x, y: r.somatotype.value.y },
        previous: ctx.earlier.flatMap((e) => (e.results.somatotype.ok ? [{ x: e.results.somatotype.value.x, y: e.results.somatotype.value.y }] : [])),
      }, { width: HALF, desc: 'Somatocarta' }))}</div>
    </div></div>`
    : '';

  const zRows = phantomZRows(r, prev);
  const phantom = zRows.some((z) => z.z != null)
    ? `<div class="section new-page">${pdfSectionTitle('Proporcionalidad (Phantom)')}
      <div class="chart">${toSvgString(phantomChart(zRows, { width: W, desc: 'Puntuaciones Z Phantom', compact: true }))}</div>
      <p class="note">● Actual${prev ? ' · ○ evaluación anterior' : ''} · franja gris: ±1 (lo habitual). 0 = igual que el modelo de referencia ajustado a la misma talla.</p></div>`
    : '';

  const prop = (label: string, block: Block<{ value: number; band: { label: string; tone: 'good' | 'neutral' | 'warn' | 'bad' } | null }>, decimals: number) =>
    block.ok
      ? `<div class="ind"><div class="ind-h"><span class="ind-l">${esc(label)}</span><span class="ind-v">${fmtEs(block.value.value, decimals)}</span></div><div class="ind-s">${pill(block.value.band)}</div></div>`
      : '';
  const gauge = (label: string, block: Block<{ value: number; band: { label: string; tone: 'good' | 'neutral' | 'warn' | 'bad' } | null }>, decimals: number, scene: ReturnType<typeof rangeBar> | null, rangeNote?: string) =>
    block.ok
      ? `<div class="ind"><div class="ind-h"><span class="ind-l">${esc(label)}</span><span class="ind-v">${fmtEs(block.value.value, decimals)}</span></div>
          <div class="ind-s">${pill(block.value.band)}${rangeNote ? `<span>Rango saludable ${esc(rangeNote)}</span>` : ''}</div>
          ${scene ? `<div class="chart">${toSvgString(scene)}</div>` : ''}</div>`
      : '';
  const sexed = client.sex;
  const proportions = `<div class="section new-page">${pdfSectionTitle('Proporciones y salud')}<div class="isak-grid">
    <div>
      ${prop('Índice córmico (tronco / talla)', r.cormicIndex, 2)}
      ${prop('Índice de Manouvrier', r.manouvrierIndex, 0)}
      ${prop('Envergadura relativa', r.relativeSpan, 2)}
      <div class="ind"><table>
        ${row('Σ 6 pliegues', blockValue(r.sum6, (x) => `${fmtEs(x, 1)} mm`))}
        ${row('Σ 8 pliegues', blockValue(r.sum8, (x) => `${fmtEs(x, 1)} mm`))}
        ${r.correctedGirths.ok ? row('Brazo corregido', `${fmtEs(r.correctedGirths.value.arm, 2)} cm`) : ''}
        ${r.correctedGirths.ok ? row('Muslo corregido', `${fmtEs(r.correctedGirths.value.thigh, 2)} cm`) : ''}
        ${r.correctedGirths.ok ? row('Pierna corregida', `${fmtEs(r.correctedGirths.value.calf, 2)} cm`) : ''}
        ${row('Brazo flexionado − relajado', blockValue(r.armFlexedDiff, (x) => `${fmtEs(x, 1)} cm`))}
      </table></div>
    </div>
    <div>
      ${gauge('IMC', r.bmi, 1, r.bmi.ok ? rangeBar({ width: HALF, ...RANGES.bmi, value: r.bmi.value.value, desc: 'IMC' }) : null)}
      ${gauge('Cintura / talla', r.waistHeightRatio, 2, r.waistHeightRatio.ok ? rangeBar({ width: HALF, ...RANGES.whtr, value: r.waistHeightRatio.value.value, desc: 'Cintura talla' }) : null, '< 0,50')}
      ${gauge('Cintura / cadera', r.waistHipRatio, 2, r.waistHipRatio.ok && sexed ? rangeBar({ width: HALF, ...whrRange(sexed), value: r.waistHipRatio.value.value, desc: 'Cintura cadera' }) : null, sexed === 'mujer' ? '< 0,85' : sexed === 'hombre' ? '< 0,90' : undefined)}
      ${gauge('Índice de conicidad', r.conicityIndex, 2, r.conicityIndex.ok && sexed ? rangeBar({ width: HALF, ...conicityRange(sexed), value: r.conicityIndex.value.value, desc: 'Conicidad' }) : null, sexed === 'mujer' ? '< 1,18' : sexed === 'hombre' ? '< 1,25' : undefined)}
      ${r.fatDistributionIndex.ok ? `<div class="ind"><div class="ind-h"><span class="ind-l">Índice de distribución grasa</span><span class="ind-v">${fmtEs(r.fatDistributionIndex.value.value, 2)}</span></div><div class="ind-s"><span>Tronco ${fmtEs(r.fatDistributionIndex.value.trunkPct, 1)} % · extremidades ${fmtEs(r.fatDistributionIndex.value.limbsPct, 1)} %</span></div></div>` : ''}
    </div>
  </div></div>`;

  const groupCard = (group: (typeof GROUP_ORDER)[number]): string => {
    const rec = m as unknown as Record<string, number | null | undefined>;
    const sites = SITES.filter((site) => site.group === group && rec[site.id] != null);
    if (!sites.length) return '';
    return `<div class="mg"><div class="mg-title">${esc(GROUP_LABELS[group])}</div><table>${sites
      .map((site) => {
        const rs = readings[site.id];
        const reads = rs && rs.length > 1 ? `<span class="rd">Lecturas ${rs.map((v) => fmtEs(v, site.decimals)).join(' · ')}</span>` : '';
        return `<tr><td>${esc(site.label)}${reads}</td><td style="text-align:right"><b>${fmtEs(rec[site.id]!, site.decimals)} ${site.unit}</b></td></tr>`;
      })
      .join('')}</table></div>`;
  };
  const tem = ctx.tem.length
    ? `<p class="note">Calidad de la toma (ETM): ${ctx.tem.map((t) => `${esc(GROUP_LABELS[t.group])} ${fmtEs(t.relativePct, 1)} % (${esc(t.label)})`).join(' · ')}.</p>`
    : '';
  const measured = `<div class="section">${pdfSectionTitle('Medidas tomadas (lado derecho)')}<div class="isak-grid"><div>${groupCard('basicas')}${groupCard('perimetros')}</div><div>${groupCard('pliegues')}${groupCard('diametros')}</div></div>${tem}</div>`;

  const refs = `<div class="section">${pdfSectionTitle('Métodos')}<p class="refs">
    Protocolo ISAK (perfil restringido): 2 lecturas por punto y una 3.ª si difieren más del 5 % en pliegues o del 1 % en el resto; valor final = media de 2 o mediana de 3.
    % grasa: ${r.fat.ok ? esc(FAT_EQUATION_LABELS[r.fat.value.equation]) : '—'}. Tejidos: Kerr (1988) adiposo, Lee et al. (2000) muscular, Rocha (1975) óseo; residual por diferencia.
    Somatotipo: Heath y Carter (1990). Proporcionalidad: estrategia Phantom (Ross y Wilson, 1974). Recomendaciones del consenso GREC/FEMEDE (2009).
  </p></div>`;

  const photosHtml = photos.length
    ? `${pdfSectionTitle('Fotos de progreso')}<div class="photos">${photos.map((u, i) => `<img src="${esc(u)}" alt="Foto ${i + 1}" />`).join('')}</div>`
    : '';

  const body = `
    ${pdfHeader({ title: 'Informe antropométrico', subtitle: 'Perfil ISAK restringido · lado derecho', tag: 'ISAK', profile })}
    ${meta}
    ${summary}
    ${composition}
    ${distribution}
    ${somatotype}
    ${phantom}
    ${proportions}
    ${measured}
    ${refs}
    ${r.warnings.length ? `<p class="note">${r.warnings.map(esc).join('<br/>')}</p>` : ''}
    ${photosHtml}
    ${pdfFooter(profile, client.full_name, date)}`;

  return pdfDocument({ title: `Informe antropométrico · ${client.full_name}`, body, extraCss: CSS });
}

/** Estilos del resumen ISAK que se incrusta en el informe completo (clases con prefijo para no chocar con otros PDF). */
export const ISAK_SUMMARY_CSS = `
  .isk-tiles { display: flex; gap: 8px; margin-bottom: 8px; }
  .isk-tile { flex: 1; background: #F7F8FA; border-radius: 6px; padding: 7px 10px; }
  .isk-tile b { display: block; font-family: 'Manrope', 'Inter', sans-serif; font-size: 15px; color: #1B2A4A; }
  .isk-tile span { font-size: 9px; color: #5A6270; }
  .isk-legend { display: flex; flex-wrap: wrap; gap: 3px 12px; font-size: 9.5px; color: #2E2E2E; margin: 3px 0 8px; }
  .isk-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
  .isk-line { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; font-size: 10.5px; color: #2E2E2E; margin-bottom: 6px; }
  .isk-line b { color: #1B2A4A; }
  .isk-pill { display: inline-block; font-size: 9px; font-weight: 700; padding: 1px 8px; border-radius: 10px; background: #EEF0F4; color: #2E2E2E; }
  .isk-pill.good { background: #E3F1D3; color: #3F6B17; }
  .isk-pill.warn { background: #FFF1CC; color: #7A5200; }
  .isk-pill.bad { background: #FBE0DA; color: #B4442E; }
  .isk-note { font-size: 9px; color: #5A6270; margin: 2px 0 8px; }
`;

/**
 * Resumen compacto del análisis ISAK para el informe completo del cliente: cifras clave, reparto por
 * tejidos, somatotipo e índices de salud. El análisis entero está en su propio informe.
 */
export function buildIsakSummaryHtml(ctx: ReportContext): string {
  const { measurement: m, results: r } = ctx;
  const segments = tissueSegments(r);
  const healthItems: [string, Block<{ value: number; band: { label: string; tone: 'good' | 'neutral' | 'warn' | 'bad' } | null }>, number][] = [
    ['IMC', r.bmi, 1],
    ['Cintura / talla', r.waistHeightRatio, 2],
    ['Cintura / cadera', r.waistHipRatio, 2],
  ];
  const health = healthItems
    .filter(([, block]) => block.ok)
    .map(([label, block]) => {
      const v = (block as { ok: true; value: { value: number; band: { label: string; tone: 'good' | 'neutral' | 'warn' | 'bad' } | null } }).value;
      return `<span>${esc(label)} <b>${fmtEs(v.value, label === 'IMC' ? 1 : 2)}</b> ${v.band ? `<span class="isk-pill ${v.band.tone}">${esc(v.band.label)}</span>` : ''}</span>`;
    })
    .join('');
  return `<div style="page-break-inside: avoid">
    <div class="isk-tiles">
      <div class="isk-tile"><b>${blockValue(r.fat, (f) => `${fmtEs(f.pct, 1)} %`)}</b><span>% de grasa${r.fat.ok ? ` · ${esc(FAT_EQUATION_LABELS[r.fat.value.equation].split(' (')[0])}` : ''}</span></div>
      <div class="isk-tile"><b>${blockValue(r.muscle, (x) => `${fmtEs(x.kg, 1)} kg`)}</b><span>Masa muscular</span></div>
      <div class="isk-tile"><b>${blockValue(r.sum6, (x) => `${fmtEs(x, 1)} mm`)}</b><span>Σ 6 pliegues</span></div>
      <div class="isk-tile"><b>${blockValue(r.adipose, (x) => `${fmtEs(x.kg, 1)} kg`)}</b><span>Tejido adiposo</span></div>
    </div>
    ${segments.length ? `<div>${toSvgString(stackedBar(segments, { width: 700, height: 16, desc: 'Composición por tejidos' }))}</div>
    <div class="isk-legend">${segments.map((sg) => `<span><i style="background:${sg.color}"></i>${esc(sg.label)} ${m.weight_kg ? fmtEs((sg.value / m.weight_kg) * 100, 1) : '—'} %</span>`).join('')}</div>` : ''}
    ${r.somatotype.ok ? `<div class="isk-line"><span>Somatotipo <b>${esc(r.somatotype.value.categoryLabel)}</b></span><span>${fmtEs(r.somatotype.value.endo, 2)} · ${fmtEs(r.somatotype.value.meso, 2)} · ${fmtEs(r.somatotype.value.ecto, 2)} <span style="color:#5A6270">(endo · meso · ecto)</span></span></div>` : ''}
    ${health ? `<div class="isk-line">${health}</div>` : ''}
    <p class="isk-note">Resumen del análisis ISAK de ${esc(formatDateShort(m.measured_at))}. El informe antropométrico ISAK trae el detalle completo.</p>
  </div>`;
}
