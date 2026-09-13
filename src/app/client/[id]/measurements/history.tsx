import { Camera, Download } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBackground } from '@/components/ui/AppBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { generateAndShareMeasurementPdf } from '@/features/clients/measurementPdf';
import { listMeasurements } from '@/features/clients/measurementsRepository';
import { getClient } from '@/features/clients/repository';
import { Client, Measurement } from '@/features/clients/types';
import { getMyProfile } from '@/features/profile/repository';
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

export default function MeasurementHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  async function handleDownloadPdf(m: Measurement) {
    if (!client) return;
    setDownloadingId(m.id);
    try {
      const profile = await getMyProfile();
      await generateAndShareMeasurementPdf({ client, profile, measurement: m });
    } catch (e) {
      Alert.alert('Error al exportar PDF', (e as Error).message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title="Historial completo"
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
          ListHeaderComponent={<Text style={styles.hint}>Selecciona 2 mediciones para compararlas o descarga el PDF individual</Text>}
          ListEmptyComponent={<Text style={styles.empty}>Sin mediciones registradas todavía.</Text>}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.id);
            const disabled = !isSelected && selected.length >= MAX_SELECTION;
            const isDownloading = downloadingId === item.id;
            const photoCount = item.photos?.length ?? 0;

            return (
              <View style={[styles.row, isSelected && styles.rowSelected, disabled && styles.rowDisabled]}>
                <Pressable
                  onPress={() => toggle(item.id)}
                  disabled={disabled}
                  style={styles.rowMainPressable}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                  <View style={styles.rowText}>
                    <View style={styles.dateBadgeRow}>
                      <Text style={styles.rowDate}>{formatDateShort(item.measured_at)}</Text>
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
                  accessibilityLabel="Descargar reporte en PDF"
                  onPress={() => handleDownloadPdf(item)}
                  disabled={isDownloading}
                  style={styles.downloadBtn}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={colors.navy} />
                  ) : (
                    <Download size={s(15)} color={colors.navy} strokeWidth={2.2} />
                  )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  spinner: { marginTop: s(24) },
  list: { padding: s(16), gap: s(8) },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted, marginBottom: s(8) },
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
    fontSize: fontSizes.label - 1,
    color: colors.navy,
  },
  rowSummary: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted },
  downloadBtn: {
    padding: s(8),
    borderRadius: radius.input,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: s(8),
  },
  compareCta: {
    height: s(40),
    borderRadius: radius.button,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(8),
  },
  compareCtaDisabled: { opacity: 0.5 },
  compareCtaText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.surface },
});
