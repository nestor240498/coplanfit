import { useLocalSearchParams, useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TabBar, type TabItem } from '@/components/ui/TabBar';
import { ChartView } from '@/features/anthropometry/charts/ChartView';
import { AnalysisCard, IndicatorRow, KV } from '@/features/anthropometry/components/AnalysisCard';
import { phantomChart, rangeBar, somatochart, stackedBar } from '@/features/anthropometry/charts/builders';
import {
  type Block,
  FAT_EQUATION_LABELS,
  fmtEs,
  GROUP_LABELS,
  GROUP_ORDER,
  type MeasurementReadings,
  MUSCLE_BONE_RANGES,
  SITE_BY_ID,
  type SiteId,
  SITES,
} from '@/features/anthropometry/engine';
import { EXPLANATIONS, type ExplanationId } from '@/features/anthropometry/explanations';
import { buildIsakPdfHtml } from '@/features/anthropometry/isakPdf';
import {
  buildReportContext,
  conicityRange,
  DISTRIBUTION_COLORS,
  phantomZRows,
  RANGES,
  type ReportContext,
  tissueSegments,
  toneColor,
  whrRange,
} from '@/features/anthropometry/report';
import { IncludePhotosToggle } from '@/features/clients/components/IncludePhotosToggle';
import { SendDocumentSheet } from '@/features/clients/components/SendDocumentSheet';
import { getMeasurementById, listMeasurements } from '@/features/clients/measurementsRepository';
import { getClient, updateClient } from '@/features/clients/repository';
import type { DocumentToDeliver } from '@/features/clients/sentLogRepository';
import type { Client, Measurement, Sex } from '@/features/clients/types';
import { getMyProfile } from '@/features/profile/repository';
import type { Profile } from '@/features/profile/types';
import { friendlyError } from '@/lib/errors';
import { formatDateShort } from '@/lib/format';
import { isChangeFavorable } from '@/lib/measurementTrends';
import { useRetained } from '@/lib/useRetained';
import { s } from '@/theme/scale';
import { chartColors } from '@/theme/colors';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

type AnalysisTab = 'resumen' | 'composicion' | 'forma' | 'salud' | 'medidas';

const ALL_TABS: TabItem<AnalysisTab>[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'composicion', label: 'Composición' },
  { key: 'forma', label: 'Forma' },
  { key: 'salud', label: 'Salud' },
  { key: 'medidas', label: 'Medidas' },
];
// Pliegues y registros rápidos no tienen somatotipo ni Phantom: solo lo que se puede calcular
const SIMPLE_TABS = ALL_TABS.filter((tab) => tab.key !== 'forma');

const PROTOCOL_LABELS = {
  isak_restricted: 'Evaluación ISAK',
  skinfolds: 'Pliegues Jackson-Pollock',
  manual: 'Registro rápido',
  import: 'Importada desde Excel',
} as const;

/** Lista legible de lo que falta para un bloque («Faltan: diámetro de muñeca y fémur»). */
function missingText(block: Block<unknown>): string {
  if (block.ok) return '';
  if (block.reason) return block.reason;
  const parts = block.missing.map((id) => SITE_BY_ID[id as SiteId]?.short.toLowerCase() ?? id);
  if (block.needs.includes('sex')) parts.push('el sexo del cliente');
  if (block.needs.includes('age')) parts.push('su edad');
  if (!parts.length) return 'Sin datos suficientes.';
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0];
  return `Faltan: ${list}.`;
}

/** Cambio respecto a la evaluación anterior, coloreado si mejora o empeora. */
function Delta({ current, previous, decimals, unit, metric, client }: {
  current: number | null;
  previous: number | null;
  decimals: number;
  unit: string;
  metric: string;
  client: Client;
}) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 10 ** -decimals / 2) return <Text style={styles.deltaNeutral}>Sin cambios</Text>;
  const favorable = isChangeFavorable(metric, previous, current, client.goal);
  const style = favorable === true ? styles.deltaGood : favorable === false ? styles.deltaBad : styles.deltaNeutral;
  return (
    <Text style={style}>
      {diff > 0 ? '+' : '−'}
      {fmtEs(Math.abs(diff), decimals)} {unit}
    </Text>
  );
}

export default function MeasurementAnalysisScreen() {
  const { id, measurementId, saved } = useLocalSearchParams<{ id: string; measurementId: string; saved?: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ client: Client; measurement: Measurement; history: Measurement[] } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [tab, setTab] = useState<AnalysisTab>('resumen');
  const scrollRef = useRef<ScrollView>(null);
  const [savedBannerVisible, setSavedBannerVisible] = useState(saved === '1');

  // El aviso de «guardada» se retira solo a los 5 s
  useEffect(() => {
    if (!savedBannerVisible) return;
    const timer = setTimeout(() => setSavedBannerVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [savedBannerVisible]);
  const [explain, setExplain] = useState<ExplanationId | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(false);
  const shownExplain = useRetained(explain);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getClient(id), getMeasurementById(measurementId), listMeasurements(id)])
      .then(([client, measurement, history]) => {
        if (!cancelled) setData({ client, measurement, history });
      })
      .catch((e) => {
        if (!cancelled) setLoadError(friendlyError(e));
      });
    getMyProfile()
      .then((p) => !cancelled && setProfile(p))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, measurementId]);

  // Se recalcula en cada render a partir de los datos cargados (p. ej. al indicar el sexo)
  const ctx: ReportContext | null = data ? buildReportContext(data.measurement, data.client, data.history) : null;

  async function handleSetSex(sex: Sex) {
    if (!data) return;
    try {
      await updateClient(data.client.id, { sex });
      setData({ ...data, client: { ...data.client, sex } });
    } catch (e) {
      Alert.alert('No se pudo guardar', friendlyError(e));
    }
  }

  function handleLayout(e: LayoutChangeEvent) {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  }

  const m = ctx?.measurement;
  const client = ctx?.client;
  const r = ctx?.results;
  const muscleBoneBandLabel = r?.muscleBoneIndex.ok ? r.muscleBoneIndex.value.band?.label : undefined;
  const prev = ctx?.previousResults ?? null;
  const firstName = client?.full_name.split(' ')[0] ?? '';
  const chartW = Math.max(0, width - s(14) * 2);

  const document: DocumentToDeliver | null =
    ctx && m
      ? {
          clientId: ctx.client.id,
          kind: 'medicion',
          refId: m.id,
          label: `Evaluación antropométrica ${formatDateShort(m.measured_at)}`,
          buildHtml: () => buildIsakPdfHtml({ ctx, profile, includePhotos }),
        }
      : null;

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title="Análisis de la medición"
        backHref={`/client/${id}?tab=antropometria`}
        subtitle={m ? `${client?.full_name} · ${formatDateShort(m.measured_at)}` : undefined}
        showBack
        breadcrumbs={[
          { label: 'Clientes', href: '/', icon: Users },
          { label: client?.full_name || 'Cliente', href: `/client/${id}?tab=antropometria` },
          { label: 'Análisis' },
        ]}
      />

      {loadError ? (
        <View style={styles.center}>
          <Text style={styles.error}>{loadError}</Text>
          <Button title="Volver" onPress={() => router.back()} />
        </View>
      ) : !ctx || !m || !client || !r ? (
        <ActivityIndicator style={styles.spinner} color={colors.navy} />
      ) : (
        <>
        <TabBar items={m.protocol === 'isak_restricted' ? ALL_TABS : SIMPLE_TABS} active={tab} onChange={(next) => {
            setTab(next);
            scrollRef.current?.scrollTo({ y: 0, animated: false });
          }}
        />
        <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
          <View onLayout={handleLayout} style={styles.measureWidth} />

          {savedBannerVisible && (
            <View style={styles.savedBanner}>
              <Text style={styles.savedText}>Evaluación guardada. Ya puedes enviársela a {firstName}.</Text>
            </View>
          )}

          {tab === 'resumen' && (
          <>
          {/* Cabecera */}
          <AnalysisCard title={PROTOCOL_LABELS[m.protocol ?? 'manual']}>
            <Text style={styles.meta}>
              Evaluación nº {ctx.evaluationNumber} de {ctx.evaluationsTotal}
              {ctx.daysSincePrevious != null ? ` · ${ctx.daysSincePrevious} días desde la anterior` : ''}
              {ctx.ageYears != null ? ` · ${ctx.ageYears} años` : ''}
            </Text>
            {(m.readings as MeasurementReadings | null)?.source === 'isakmetry_pdf' && (
              <Text style={styles.meta}>Medidas importadas de un informe PDF.</Text>
            )}
            {ctx.tem.length > 0 && (
              <View style={styles.chips}>
                {ctx.tem.map((t) => (
                  <View key={t.group} style={styles.chip}>
                    <Text style={[styles.chipText, { color: toneColor(t.tone) }]}>
                      {GROUP_LABELS[t.group]}: ETM {fmtEs(t.relativePct, 1)} % · {t.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </AnalysisCard>


          {!client.sex && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>Indica el sexo de {firstName} para calcular el % de grasa y la masa muscular.</Text>
              <View style={styles.row}>
                <Button title="Hombre" variant="secondary" onPress={() => handleSetSex('hombre')} style={styles.flex} />
                <Button title="Mujer" variant="secondary" onPress={() => handleSetSex('mujer')} style={styles.flex} />
              </View>
            </View>
          )}

          </>
          )}

          {tab === 'resumen' && (
          <AnalysisCard title="Resumen" onExplain={() => setExplain('resumen')}>
            <View style={styles.tiles}>
              <Tile
                label="% de grasa"
                caption={r.fat.ok ? FAT_EQUATION_LABELS[r.fat.value.equation].split(' (')[0] : undefined}
                value={r.fat.ok ? `${fmtEs(r.fat.value.pct, 1)} %` : '—'}
                delta={<Delta current={r.fat.ok ? r.fat.value.pct : null} previous={prev?.fat.ok && prev.fat.value.equation === (r.fat.ok ? r.fat.value.equation : null) ? prev.fat.value.pct : null} decimals={1} unit="%" metric="body_fat_pct" client={client} />}
              />
              <Tile
                label="Masa muscular"
                caption="Tejido muscular"
                value={r.muscle.ok ? `${fmtEs(r.muscle.value.kg, 1)} kg` : '—'}
                delta={<Delta current={r.muscle.ok ? r.muscle.value.kg : null} previous={prev?.muscle.ok ? prev.muscle.value.kg : null} decimals={1} unit="kg" metric="muscle_kg" client={client} />}
              />
              <Tile
                label="Σ 6 pliegues"
                caption="Suma de pliegues"
                value={r.sum6.ok ? `${fmtEs(r.sum6.value, 1)} mm` : '—'}
                delta={<Delta current={r.sum6.ok ? r.sum6.value : null} previous={prev?.sum6.ok ? prev.sum6.value : null} decimals={1} unit="mm" metric="sum6_mm" client={client} />}
              />
              <Tile
                label="Peso"
                caption={r.bmi.ok ? `IMC ${fmtEs(r.bmi.value.value, 1)}` : undefined}
                value={m.weight_kg != null ? `${fmtEs(m.weight_kg, 1)} kg` : '—'}
                delta={<Delta current={m.weight_kg} previous={ctx.previous?.weight_kg ?? null} decimals={1} unit="kg" metric="weight_kg" client={client} />}
              />
            </View>
          </AnalysisCard>
          )}

          {tab === 'resumen' && m.protocol !== 'isak_restricted' && m.protocol !== 'skinfolds' && (
            <View style={styles.softNote}>
              <Text style={styles.softNoteText}>Solo se muestra lo que se puede calcular con estas medidas.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push(`/client/${id}/measurements/session?profile=isak` as never)} style={styles.softNoteLink}>
                <Text style={styles.softNoteLinkText}>Hacer una evaluación ISAK ›</Text>
              </Pressable>
            </View>
          )}

          {tab === 'composicion' && (
          <>
          {/* Composición */}
          <AnalysisCard title="Composición corporal" onExplain={() => setExplain('composicion')}>
            {r.fat.ok ? (
              <>
                <KV label="Masa grasa" value={r.fat.value.fatKg != null ? `${fmtEs(r.fat.value.fatKg, 2)} kg (${fmtEs(r.fat.value.pct, 2)} %)` : `${fmtEs(r.fat.value.pct, 2)} %`} />
                {r.fat.value.ffmKg != null && <KV label="Masa libre de grasa" value={`${fmtEs(r.fat.value.ffmKg, 2)} kg`} />}
                <Text style={styles.method}>Método: {FAT_EQUATION_LABELS[r.fat.value.equation]}</Text>
              </>
            ) : (
              <Text style={styles.missing}>{missingText(r.fat)}</Text>
            )}
          </AnalysisCard>

          <AnalysisCard title="Tejidos" onExplain={() => setExplain('tejidos')}>
            {tissueSegments(r).length > 0 && chartW > 0 ? (
              <>
                <ChartView scene={stackedBar(tissueSegments(r), { width: chartW, desc: 'Reparto del peso en tejido muscular, adiposo, óseo y residual' })} />
                {tissueSegments(r).map((seg) => (
                  <Legend key={seg.label} color={seg.color} label={`Tejido ${seg.label.toLowerCase()}`} value={`${fmtEs(seg.value, 2)} kg · ${m.weight_kg ? fmtEs((seg.value / m.weight_kg) * 100, 1) : '—'} %`} />
                ))}
              </>
            ) : (
              <>
                {(['adipose', 'muscle', 'bone'] as const).map((key) => {
                  const block = r[key];
                  const label = key === 'adipose' ? 'Tejido adiposo' : key === 'muscle' ? 'Tejido muscular' : 'Tejido óseo';
                  return block.ok ? (
                    <KV key={key} label={label} value={`${fmtEs(block.value.kg, 2)} kg`} />
                  ) : (
                    <KV key={key} label={label} value="—" note={missingText(block)} />
                  );
                })}
              </>
            )}
          </AnalysisCard>

          <AnalysisCard title="Índices de tejidos" onExplain={() => setExplain('indices')}>
            {r.adiposeMuscleIndex.ok ? (
              <KV label="Adiposo-muscular" value={fmtEs(r.adiposeMuscleIndex.value, 2)} note="Kilos de tejido adiposo por cada kilo de músculo. Cuanto menor, mejor." />
            ) : (
              <KV label="Adiposo-muscular" value="—" note={missingText(r.adiposeMuscleIndex)} />
            )}
            {r.muscleBoneIndex.ok ? (
              <IndicatorRow label="Músculo-óseo" value={fmtEs(r.muscleBoneIndex.value.value, 2)} band={r.muscleBoneIndex.value.band}>
                {chartW > 0 && (
                  <ChartView scene={rangeBar({ width: chartW, ...RANGES.muscleBone, value: r.muscleBoneIndex.value.value, desc: `Índice músculo-óseo ${fmtEs(r.muscleBoneIndex.value.value, 2)}` })} />
                )}
                <View style={styles.rangeLegend}>
                  {MUSCLE_BONE_RANGES.map((x, i) => {
                    const active = muscleBoneBandLabel === x.label;
                    return (
                      <View key={x.label} style={[styles.rangeRow, active && styles.rangeRowActive]}>
                        <View style={[styles.rangeSwatch, { backgroundColor: chartColors.ordinal[i] }]} />
                        <Text style={[styles.rangeLabel, active && styles.rangeActiveText]}>{x.label}</Text>
                        <Text style={[styles.rangeValue, active && styles.rangeActiveText]}>{x.range}</Text>
                      </View>
                    );
                  })}
                </View>
              </IndicatorRow>
            ) : (
              <KV label="Músculo-óseo" value="—" note={missingText(r.muscleBoneIndex)} />
            )}
          </AnalysisCard>

          <AnalysisCard title="Distribución" onExplain={() => setExplain('distribucion')}>
            {r.adiposeDistribution.ok && chartW > 0 ? (
              <>
                <Text style={styles.subTitle}>Tejido adiposo</Text>
                <ChartView
                  scene={stackedBar(
                    [
                      { label: 'Superior', value: r.adiposeDistribution.value.superior, color: DISTRIBUTION_COLORS[0] },
                      { label: 'Central', value: r.adiposeDistribution.value.central, color: DISTRIBUTION_COLORS[1] },
                      { label: 'Inferior', value: r.adiposeDistribution.value.inferior, color: DISTRIBUTION_COLORS[2] },
                    ],
                    { width: chartW, desc: 'Distribución del tejido adiposo' }
                  )}
                />
                <Legend color={DISTRIBUTION_COLORS[0]} label="Superior (brazo y espalda)" value={`${fmtEs(r.adiposeDistribution.value.superior, 1)} %`} />
                <Legend color={DISTRIBUTION_COLORS[1]} label="Central (abdomen y cadera)" value={`${fmtEs(r.adiposeDistribution.value.central, 1)} %`} />
                <Legend color={DISTRIBUTION_COLORS[2]} label="Inferior (piernas)" value={`${fmtEs(r.adiposeDistribution.value.inferior, 1)} %`} />
              </>
            ) : (
              <KV label="Tejido adiposo" value="—" note={missingText(r.adiposeDistribution)} />
            )}
            {r.muscleDistribution.ok && chartW > 0 ? (
              <>
                <Text style={styles.subTitle}>Tejido muscular</Text>
                <ChartView
                  scene={stackedBar(
                    [
                      { label: 'Brazo', value: r.muscleDistribution.value.arm, color: DISTRIBUTION_COLORS[0] },
                      { label: 'Muslo', value: r.muscleDistribution.value.thigh, color: DISTRIBUTION_COLORS[1] },
                      { label: 'Pierna', value: r.muscleDistribution.value.calf, color: DISTRIBUTION_COLORS[2] },
                    ],
                    { width: chartW, desc: 'Distribución del tejido muscular' }
                  )}
                />
                <Legend color={DISTRIBUTION_COLORS[0]} label="Brazo" value={`${fmtEs(r.muscleDistribution.value.arm, 1)} %`} />
                <Legend color={DISTRIBUTION_COLORS[1]} label="Muslo" value={`${fmtEs(r.muscleDistribution.value.thigh, 1)} %`} />
                <Legend color={DISTRIBUTION_COLORS[2]} label="Pierna" value={`${fmtEs(r.muscleDistribution.value.calf, 1)} %`} />
              </>
            ) : (
              <KV label="Tejido muscular" value="—" note={missingText(r.muscleDistribution)} />
            )}
          </AnalysisCard>

          </>
          )}

          {tab === 'forma' && (
          <>
          <AnalysisCard title="Somatotipo" onExplain={() => setExplain('somatotipo')}>
            {r.somatotype.ok ? (
              <>
                <View style={styles.somaValues}>
                  <SomaValue label="Endomorfia" meaning="Adiposidad" value={r.somatotype.value.endo} />
                  <SomaValue label="Mesomorfia" meaning="Músculo" value={r.somatotype.value.meso} />
                  <SomaValue label="Ectomorfia" meaning="Linealidad" value={r.somatotype.value.ecto} />
                </View>
                <Text style={styles.category}>{r.somatotype.value.categoryLabel}</Text>
                {chartW > 0 && (
                  <ChartView
                    scene={somatochart(
                      {
                        current: { x: r.somatotype.value.x, y: r.somatotype.value.y },
                        previous: ctx.earlier.flatMap((e) => (e.results.somatotype.ok ? [{ x: e.results.somatotype.value.x, y: e.results.somatotype.value.y }] : [])),
                      },
                      { width: chartW, desc: `Somatocarta: ${r.somatotype.value.categoryLabel}` }
                    )}
                  />
                )}
              </>
            ) : (
              <Text style={styles.missing}>{missingText(r.somatotype)}</Text>
            )}
          </AnalysisCard>

          <AnalysisCard title="Proporcionalidad (Phantom)" onExplain={() => setExplain('phantom')}>
            {r.phantom.some((row) => row.z != null) && chartW > 0 ? (
              <>
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={styles.dotNow} />
                    <Text style={styles.legendText}>Actual</Text>
                  </View>
                  {prev && (
                    <View style={styles.legendItem}>
                      <View style={styles.dotPrev} />
                      <Text style={styles.legendText}>Anterior</Text>
                    </View>
                  )}
                  <View style={styles.legendItem}>
                    <View style={styles.bandSwatch} />
                    <Text style={styles.legendText}>±1 (lo habitual)</Text>
                  </View>
                </View>
                <ChartView scene={phantomChart(phantomZRows(r, prev), { width: chartW, desc: 'Puntuaciones Z de proporcionalidad respecto al Phantom' })} />
              </>
            ) : (
              <Text style={styles.missing}>Hace falta la talla para comparar con el Phantom.</Text>
            )}
          </AnalysisCard>

          <AnalysisCard title="Proporciones del cuerpo" onExplain={() => setExplain('proporcionalidad')}>
            {[
              { label: 'Índice córmico', block: r.cormicIndex, d: 2 },
              { label: 'Índice de Manouvrier', block: r.manouvrierIndex, d: 0 },
              { label: 'Envergadura relativa', block: r.relativeSpan, d: 2 },
            ].map(({ label, block, d }) =>
              block.ok ? (
                <KV key={label} label={label} value={fmtEs(block.value.value, d)} note={block.value.band?.label} />
              ) : (
                <KV key={label} label={label} value="—" note={missingText(block)} />
              )
            )}
          </AnalysisCard>

          </>
          )}

          {tab === 'salud' && (
          <>
          <AnalysisCard title="Índices de salud" onExplain={() => setExplain('salud')}>
            {r.bmi.ok && (
              <IndicatorRow label="IMC" value={fmtEs(r.bmi.value.value, 1)} band={r.bmi.value.band}>
                {chartW > 0 && <ChartView scene={rangeBar({ width: chartW, ...RANGES.bmi, value: r.bmi.value.value, desc: `IMC ${fmtEs(r.bmi.value.value, 1)}` })} />}
              </IndicatorRow>
            )}
            {r.waistHeightRatio.ok && (
              <IndicatorRow label="Cintura / talla" value={fmtEs(r.waistHeightRatio.value.value, 2)} band={r.waistHeightRatio.value.band}>
                {chartW > 0 && <ChartView scene={rangeBar({ width: chartW, ...RANGES.whtr, value: r.waistHeightRatio.value.value, desc: `Índice cintura talla ${fmtEs(r.waistHeightRatio.value.value, 2)}` })} />}
              </IndicatorRow>
            )}
            {r.waistHipRatio.ok && (
              <IndicatorRow label="Cintura / cadera" value={fmtEs(r.waistHipRatio.value.value, 2)} band={r.waistHipRatio.value.band}>
                {chartW > 0 && client.sex && <ChartView scene={rangeBar({ width: chartW, ...whrRange(client.sex), value: r.waistHipRatio.value.value, desc: `Índice cintura cadera ${fmtEs(r.waistHipRatio.value.value, 2)}` })} />}
              </IndicatorRow>
            )}
            {r.conicityIndex.ok && (
              <IndicatorRow label="Índice de conicidad" value={fmtEs(r.conicityIndex.value.value, 2)} band={r.conicityIndex.value.band}>
                {chartW > 0 && client.sex && <ChartView scene={rangeBar({ width: chartW, ...conicityRange(client.sex), value: r.conicityIndex.value.value, desc: `Índice de conicidad ${fmtEs(r.conicityIndex.value.value, 2)}` })} />}
              </IndicatorRow>
            )}
            {r.fatDistributionIndex.ok && (
              <KV
                label="Índice de distribución grasa"
                value={fmtEs(r.fatDistributionIndex.value.value, 2)}
                note={`Tronco ${fmtEs(r.fatDistributionIndex.value.trunkPct, 1)} % · extremidades ${fmtEs(r.fatDistributionIndex.value.limbsPct, 1)} %. Un valor menor indica más grasa en el tronco.`}
              />
            )}
            {!r.bmi.ok && !r.waistHeightRatio.ok && <Text style={styles.missing}>{missingText(r.waistHeightRatio)}</Text>}
          </AnalysisCard>

          <AnalysisCard title="Sumatorios y perímetros corregidos" onExplain={() => setExplain('sumatorios')}>
            <KV label="Σ 6 pliegues" value={r.sum6.ok ? `${fmtEs(r.sum6.value, 1)} mm` : '—'} note={r.sum6.ok ? undefined : missingText(r.sum6)} />
            <KV label="Σ 8 pliegues" value={r.sum8.ok ? `${fmtEs(r.sum8.value, 1)} mm` : '—'} note={r.sum8.ok ? undefined : missingText(r.sum8)} />
            {r.correctedGirths.ok && (
              <>
                <KV label="Brazo corregido" value={`${fmtEs(r.correctedGirths.value.arm, 2)} cm`} />
                <KV label="Muslo corregido" value={`${fmtEs(r.correctedGirths.value.thigh, 2)} cm`} />
                <KV label="Pierna corregida" value={`${fmtEs(r.correctedGirths.value.calf, 2)} cm`} />
              </>
            )}
            {r.armFlexedDiff.ok && <KV label="Brazo flexionado − relajado" value={`${fmtEs(r.armFlexedDiff.value, 1)} cm`} />}
          </AnalysisCard>

          <Text style={styles.disclaimer}>Información orientativa: no es un diagnóstico ni sustituye una valoración médica.</Text>

          </>
          )}

          {tab === 'composicion' && r.fatAlternatives.length > 1 && (
            <AnalysisCard title="Otras ecuaciones de % grasa" onExplain={() => setExplain('ecuaciones')}>
              {r.fatAlternatives.map((alt) => (
                <KV key={alt.equation} label={FAT_EQUATION_LABELS[alt.equation]} value={`${fmtEs(alt.pct, 2)} %`} />
              ))}
            </AnalysisCard>
          )}

          {tab === 'medidas' && <MeasuredData ctx={ctx} />}

          {r.warnings.map((w) => (
            <Text key={w} style={styles.warning}>
              {w}
            </Text>
          ))}
        </ScrollView>
        </>
      )}

      {ctx && (
        <View style={styles.footer}>
          <Button
            title={saved === '1' ? `Enviar a ${firstName}` : 'Enviar o descargar'}
            onPress={() => setSendOpen(true)}
            style={styles.flex}
          />
          <Button title="Ficha" variant="secondary" onPress={() => router.dismissTo(`/client/${id}`)} style={styles.footerSide} />
        </View>
      )}

      <SendDocumentSheet
        visible={sendOpen}
        onClose={() => setSendOpen(false)}
        document={document}
        clientName={client?.full_name ?? ''}
        clientPhone={client?.phone}
      >
        {(m?.photos?.length ?? 0) > 0 && <IncludePhotosToggle value={includePhotos} onChange={setIncludePhotos} />}
      </SendDocumentSheet>

      <BottomSheet visible={explain != null} onClose={() => setExplain(null)} title={shownExplain ? EXPLANATIONS[shownExplain].title : ''}>
        {shownExplain &&
          EXPLANATIONS[shownExplain].body.map((p) => (
            <Text key={p} style={styles.explainText}>
              {p}
            </Text>
          ))}
      </BottomSheet>
    </View>
  );
}

/** Cifra destacada del resumen: mismo formato que las tarjetas del somatotipo (nombre, valor, cambio y nota). */
function Tile({ label, value, delta, caption }: { label: string; value: string; delta?: ReactNode; caption?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
      <Text style={styles.tileValue}>{value}</Text>
      <View style={styles.tileDelta}>{delta}</View>
      {caption ? (
        <Text style={styles.tileCaption} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

/** Nivel de un componente del somatotipo (Heath-Carter: bajo hasta 2,5 · moderado hasta 5 · alto hasta 7). */
function somaLevel(value: number): string {
  return value <= 2.5 ? 'Bajo' : value <= 5 ? 'Moderado' : value <= 7 ? 'Alto' : 'Muy alto';
}

function SomaValue({ label, meaning, value }: { label: string; meaning: string; value: number }) {
  return (
    <View style={styles.somaValue} accessible accessibilityLabel={`${label}: ${fmtEs(value, 2)}, nivel ${somaLevel(value).toLowerCase()}. ${meaning}`}>
      <Text style={styles.somaName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
      <Text style={styles.somaNumber}>{fmtEs(value, 2)}</Text>
      <View style={styles.somaTrack}>
        <View style={[styles.somaFill, { width: `${Math.min(100, (value / 7) * 100)}%` }]} />
      </View>
      <Text style={styles.somaLevel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {somaLevel(value)}
      </Text>
      <Text style={styles.somaMeaning} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {meaning}
      </Text>
    </View>
  );
}

/** Medidas finales con sus lecturas (desplegable). */
function MeasuredData({ ctx }: { ctx: ReportContext }) {
  const m = ctx.measurement as unknown as Record<string, number | null | undefined>;
  const readings = (ctx.measurement.readings as MeasurementReadings | null)?.sites ?? {};
  const groups = GROUP_ORDER.map((group) => ({ group, sites: SITES.filter((site) => site.group === group && m[site.id] != null) })).filter(
    (g) => g.sites.length > 0
  );
  if (!groups.length) return <Text style={styles.missing}>Esta medición no tiene medidas ISAK anotadas.</Text>;
  return (
    <>
      {groups.map(({ group, sites }) => (
        <AnalysisCard key={group} title={GROUP_LABELS[group]}>
          {sites.map((site) => (
            <KV
              key={site.id}
              label={site.short}
              value={`${fmtEs(m[site.id]!, site.decimals)} ${site.unit}`}
              note={readings[site.id] && readings[site.id]!.length > 1 ? `Lecturas: ${readings[site.id]!.map((v) => fmtEs(v, site.decimals)).join(' · ')}` : undefined}
            />
          ))}
        </AnalysisCard>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  spinner: { marginTop: s(32) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: s(12), padding: s(24) },
  error: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.danger, textAlign: 'center' },
  body: { padding: s(16), gap: s(16), paddingBottom: s(40) },
  measureWidth: { position: 'absolute', top: 0, left: s(16), right: s(16), height: 0 },
  savedBanner: { padding: s(12), borderRadius: radius.card, backgroundColor: colors.successBg },
  savedText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.success },
  softNote: { gap: 0, alignItems: 'center' },
  softNoteText: { textAlign: 'center', fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  softNoteLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: s(12) },
  softNoteLinkText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.navy },
  infoBanner: { gap: s(8), padding: s(14), borderRadius: radius.card, backgroundColor: '#FFF4DB' },
  infoText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: '#5C3D00' },
  row: { flexDirection: 'row', gap: s(8) },
  meta: { fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6) },
  chip: { paddingHorizontal: s(10), paddingVertical: s(4), borderRadius: radius.chip, backgroundColor: colors.background },
  chipText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.label },
  subTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.textSecondary, textTransform: 'uppercase', marginTop: s(8) },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: s(10) },
  tile: { flexGrow: 1, flexBasis: '45%', alignItems: 'center', gap: s(4), paddingVertical: s(12), paddingHorizontal: s(6), borderRadius: radius.input, backgroundColor: colors.background },
  tileLabel: { alignSelf: 'stretch', textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.textSecondary },
  tileValue: { fontFamily: fonts.heading, fontSize: fontSizes.headline, lineHeight: lineHeights.headline, color: colors.navy },
  tileDelta: { minHeight: 20, alignItems: 'center', justifyContent: 'center' },
  tileCaption: { alignSelf: 'stretch', textAlign: 'center', fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textSecondary },
  deltaGood: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.success },
  deltaBad: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.danger },
  deltaNeutral: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.textSecondary },
  method: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  missing: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary },
  rangeLegend: { gap: s(2) },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: s(10), minHeight: 36, paddingHorizontal: s(8), borderRadius: radius.input },
  rangeRowActive: { backgroundColor: colors.background },
  rangeSwatch: { width: 16, height: 16, borderRadius: 4 },
  rangeLabel: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.text },
  rangeValue: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  rangeActiveText: { fontFamily: fonts.bodyBold, color: colors.navy },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: s(16), rowGap: s(6) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  legendText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  dotNow: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.navy },
  dotPrev: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: chartColors.muted, backgroundColor: colors.surface },
  bandSwatch: { width: 16, height: 10, borderRadius: 2, backgroundColor: chartColors.grid },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: s(10), minHeight: 36 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.text },
  legendValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  somaValues: { flexDirection: 'row', gap: s(10) },
  somaValue: { flex: 1, alignItems: 'center', gap: s(4), paddingVertical: s(12), paddingHorizontal: s(4), borderRadius: radius.input, backgroundColor: colors.background },
  somaName: { alignSelf: 'stretch', textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.textSecondary },
  somaNumber: { fontFamily: fonts.heading, fontSize: fontSizes.headline, lineHeight: lineHeights.headline, color: colors.navy },
  somaTrack: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: chartColors.grid, overflow: 'hidden', marginVertical: s(2) },
  somaFill: { height: 4, borderRadius: 2, backgroundColor: colors.navy },
  somaLevel: { alignSelf: 'stretch', textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.navy },
  somaMeaning: { alignSelf: 'stretch', textAlign: 'center', fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textSecondary },
  category: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: chartColors.muscle, textAlign: 'center' },
  disclaimer: { textAlign: 'center', fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary },
  warning: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.danger },
  explainText: { fontFamily: fonts.body, fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.text },
  footer: {
    flexDirection: 'row',
    gap: s(8),
    padding: s(14),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerSide: { flex: 0.6 },
});
