import { Camera, Download } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBackground } from '@/components/ui/AppBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { IncludePhotosToggle } from '@/features/clients/components/IncludePhotosToggle';
import { SendDocumentSheet } from '@/features/clients/components/SendDocumentSheet';
import { DocumentToDeliver } from '@/features/clients/sentLogRepository';
import { listMeasurements } from '@/features/clients/measurementsRepository';
import { getClient } from '@/features/clients/repository';
import { Client, Measurement } from '@/features/clients/types';
import { ChartView } from '@/features/anthropometry/charts/ChartView';
import { trendLine } from '@/features/anthropometry/charts/builders';
import { fmtEs, type IsakResults } from '@/features/anthropometry/engine';
import { computeMeasurementResults } from '@/features/anthropometry/fromMeasurement';
import { buildMeasurementDocumentHtml } from '@/features/anthropometry/measurementDocument';
import { SingleChoice } from '@/features/workouts/components/ExerciseFormControls';
import { formatDateShort } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

const MAX_SELECTION = 2;

function summarize(m: Measurement): string {
  const parts = [
    m.weight_kg != null ? `${m.weight_kg} kg` : null,
    m.body_fat_pct != null ? `${m.body_fat_pct}% grasa` : null,
    m.muscle_mass_pct != null ? `${m.muscle_mass_pct}% masa musc.` : null,
    m.waist_cm != null ? `cintura ${m.waist_cm}cm` : null,
    m.bmi != null ? `IMC ${m.bmi}` : null,
  ].filter(Boolean);
  return parts.join(' · ') || 'Sin datos';
}

type MetricId = 'weight' | 'fat' | 'sum6' | 'muscle' | 'adipose' | 'waist';

const METRICS: { id: MetricId; label: string; unit: string; decimals: number }[] = [
  { id: 'weight', label: 'Peso', unit: 'kg', decimals: 1 },
  { id: 'fat', label: '% grasa', unit: '%', decimals: 1 },
  { id: 'sum6', label: 'Σ6', unit: 'mm', decimals: 1 },
  { id: 'muscle', label: 'Músculo', unit: 'kg', decimals: 1 },
  { id: 'adipose', label: 'Adiposo', unit: 'kg', decimals: 1 },
  { id: 'waist', label: 'Cintura', unit: 'cm', decimals: 1 },
];

function metricValue(id: MetricId, m: Measurement, r: IsakResults): number | null {
  switch (id) {
    case 'weight':
      return m.weight_kg;
    case 'fat':
      return r.fat.ok ? r.fat.value.pct : m.body_fat_pct;
    case 'sum6':
      return r.sum6.ok ? r.sum6.value : null;
    case 'muscle':
      return r.muscle.ok ? r.muscle.value.kg : null;
    case 'adipose':
      return r.adipose.ok ? r.adipose.value.kg : null;
    case 'waist':
      return m.waist_cm;
  }
}

/** Evolución de una métrica a lo largo de todas las mediciones (una métrica por gráfica). */
function EvolutionCard({ client, measurements }: { client: Client; measurements: Measurement[] }) {
  const [metric, setMetric] = useState<MetricId>('weight');
  const [width, setWidth] = useState(0);
  const chronological = [...measurements].reverse();
  const rows = chronological.map((m) => ({ m, r: computeMeasurementResults(m, client) }));
  const available = METRICS.filter((def) => rows.filter(({ m, r }) => metricValue(def.id, m, r) != null).length >= 2);
  if (!available.length) return null;
  const active = available.find((d) => d.id === metric) ?? available[0];
  const points = rows.flatMap(({ m, r }) => {
    const value = metricValue(active.id, m, r);
    if (value == null) return [];
    // % grasa de registros sin pliegues (bioimpedancia): otro método, punto hueco
    const hollow = active.id === 'fat' && !r.fat.ok;
    return [{ label: formatDateShort(m.measured_at), value, hollow }];
  });
  const first = points[0];
  const last = points[points.length - 1];
  const diff = last.value - first.value;

  function handleLayout(e: LayoutChangeEvent) {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  }

  return (
    <View style={styles.evolution}>
      <Text style={styles.evolutionTitle}>Evolución</Text>
      <SingleChoice<MetricId> compact options={available.map(({ id, label }) => ({ id, label }))} value={active.id} onChange={setMetric} />
      <View onLayout={handleLayout}>
        {width > 0 && (
          <ChartView
            scene={trendLine(points, {
              width,
              decimals: active.decimals,
              unit: active.unit,
              desc: `Evolución de ${active.label}: de ${fmtEs(first.value, active.decimals)} a ${fmtEs(last.value, active.decimals)} ${active.unit}`,
            })}
          />
        )}
      </View>
      <Text style={styles.evolutionNote}>
        {points.length} mediciones · {diff >= 0 ? '+' : '−'}
        {fmtEs(Math.abs(diff), active.decimals)} {active.unit} desde la primera
        {points.some((p) => p.hollow) ? ' · ○ % grasa medido con otro método (p. ej. báscula)' : ''}
      </Text>
    </View>
  );
}

export default function MeasurementHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [sendMeasurement, setSendMeasurement] = useState<Measurement | null>(null);
  const [includePhotos, setIncludePhotos] = useState(false);

  useEffect(() => {
    getClient(id).then(setClient).catch(() => {});
    listMeasurements(id).then(setMeasurements).catch(() => {});
  }, [id]);

  function toggle(measurementId: string) {
    setSelected((prev) => {
      if (prev.includes(measurementId)) return prev.filter((x) => x !== measurementId);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, measurementId];
    });
  }

  const measurementDocument: DocumentToDeliver | null =
    client && sendMeasurement
      ? {
          clientId: client.id,
          kind: 'medicion',
          refId: sendMeasurement.id,
          label: `Evaluación antropométrica del ${formatDateShort(sendMeasurement.measured_at)}`,
          buildHtml: () => buildMeasurementDocumentHtml({ client, measurement: sendMeasurement, includePhotos }),
        }
      : null;

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title="Historial completo"
        backHref={`/client/${id}?tab=antropometria`}
        subtitle={`${client?.full_name ?? 'Cliente'} · antropometría`}
        showBack
      />

      {measurements === null ? (
        <ActivityIndicator style={styles.spinner} color={colors.navy} />
      ) : (
        <FlatList
          data={measurements}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              {client && <EvolutionCard client={client} measurements={measurements} />}
              <Text style={styles.hint}>Toca una medición para ver su análisis. Marca 2 casillas para compararlas.</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>Sin mediciones registradas todavía.</Text>}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.id);
            const disabled = !isSelected && selected.length >= MAX_SELECTION;
            const photoCount = item.photos?.length ?? 0;

            return (
              <View style={[styles.row, isSelected && styles.rowSelected, disabled && styles.rowDisabled]}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected, disabled }}
                  accessibilityLabel={`Comparar la medición del ${formatDateShort(item.measured_at)}`}
                  onPress={() => toggle(item.id)}
                  disabled={disabled}
                  style={styles.checkboxHit}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ver el análisis del ${formatDateShort(item.measured_at)}`}
                  onPress={() => router.push({ pathname: '/client/[id]/measurements/[measurementId]', params: { id, measurementId: item.id } })}
                  style={styles.rowMainPressable}
                >
                  <View style={styles.rowText}>
                    <View style={styles.dateBadgeRow}>
                      <Text style={styles.rowDate}>{formatDateShort(item.measured_at)}</Text>
                      {(item.protocol === 'isak_restricted' || item.protocol === 'skinfolds') && (
                        <View style={styles.isakBadge}>
                          <Text style={styles.isakBadgeText}>{item.protocol === 'skinfolds' ? 'PLIEGUES' : 'ISAK'}</Text>
                        </View>
                      )}
                      {photoCount > 0 && (
                        <View style={styles.photoCountBadge}>
                          <Camera size={s(11)} color={colors.navy} />
                          <Text style={styles.photoCountText}>
                            {photoCount} {photoCount === 1 ? 'foto' : 'fotos'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowSummary}>{summarize(item)}</Text>
                  </View>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Enviar o descargar el reporte en PDF"
                  onPress={() => setSendMeasurement(item)}
                  style={styles.downloadBtn}
                >
                  <Download size={s(15)} color={colors.navy} strokeWidth={2.2} />
                </Pressable>
              </View>
            );
          }}
          ListFooterComponent={
            measurements.length > 0 ? (
              <Pressable
                disabled={selected.length !== MAX_SELECTION}
                onPress={() => router.push(`/client/${id}/measurements/compare?a=${selected[0]}&b=${selected[1]}`)}
                style={[styles.compareCta, selected.length !== MAX_SELECTION && styles.compareCtaDisabled]}
              >
                <Text style={styles.compareCtaText}>Comparar seleccionadas ({selected.length})</Text>
              </Pressable>
            ) : null
          }
        />
      )}

      <SendDocumentSheet
        visible={sendMeasurement != null}
        onClose={() => setSendMeasurement(null)}
        document={measurementDocument}
        clientName={client?.full_name ?? ''}
        clientPhone={client?.phone}
      >
        {(sendMeasurement?.photos?.length ?? 0) > 0 && (
          <IncludePhotosToggle value={includePhotos} onChange={setIncludePhotos} />
        )}
      </SendDocumentSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  spinner: { marginTop: s(24) },
  list: { padding: s(16), gap: s(8) },
  header: { gap: s(8), marginBottom: s(8) },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: s(20),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: s(9),
    marginBottom: s(8),
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelected: { borderColor: colors.lime, backgroundColor: '#FAFEF6' },
  rowDisabled: { opacity: 0.5 },
  rowMainPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  checkbox: {
    width: s(18),
    height: s(18),
    borderRadius: s(4),
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.lime, borderColor: colors.lime },
  checkboxMark: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.navy },
  rowText: { flex: 1, gap: 2 },
  dateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  rowDate: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.text },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(3),
    backgroundColor: '#EBF7D4',
    paddingHorizontal: s(6),
    paddingVertical: s(1.5),
    borderRadius: radius.pill,
  },
  photoCountText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.micro,
    color: colors.navy,
  },
  rowSummary: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  checkboxHit: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -s(6) },
  isakBadge: { backgroundColor: colors.navy, paddingHorizontal: s(6), paddingVertical: 1, borderRadius: radius.pill },
  isakBadgeText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.micro, color: colors.lime },
  evolution: {
    gap: s(8),
    padding: s(14),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  evolutionTitle: { fontFamily: fonts.heading, fontSize: fontSizes.base, color: colors.navy },
  evolutionNote: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  downloadBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(8),
    borderRadius: radius.input,
    backgroundColor: colors.lime,
    marginLeft: s(8),
  },
  compareCta: {
    minHeight: 44,
    borderRadius: radius.button,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(8),
  },
  compareCtaDisabled: { opacity: 0.5 },
  compareCtaText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.surface },
});
