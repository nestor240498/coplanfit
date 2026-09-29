import { Camera, Download, Maximize2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { StorageImage } from '@/components/ui/StorageImage';
import { AppBackground } from '@/components/ui/AppBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { IncludePhotosToggle } from '@/features/clients/components/IncludePhotosToggle';
import { generateAndShareMeasurementComparisonPdf } from '@/features/clients/measurementPdf';
import { getMeasurementById } from '@/features/clients/measurementsRepository';
import { getClient } from '@/features/clients/repository';
import { Client, Measurement } from '@/features/clients/types';
import { getMyProfile } from '@/features/profile/repository';
import { formatDateShort } from '@/lib/format';
import { isChangeFavorable } from '@/lib/measurementTrends';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type MetricDef = {
  key: keyof Measurement;
  label: string;
  unit: string;
  decimals?: number;
};

type MetricGroup = {
  category: string;
  metrics: MetricDef[];
};

const METRIC_GROUPS: MetricGroup[] = [
  {
    category: 'COMPOSICIÓN CORPORAL',
    metrics: [
      { key: 'weight_kg', label: 'Peso', unit: 'kg', decimals: 1 },
      { key: 'height_cm', label: 'Estatura', unit: 'cm', decimals: 0 },
      { key: 'body_fat_pct', label: '% Grasa Corporal', unit: '%', decimals: 1 },
      { key: 'muscle_mass_pct', label: '% Masa Muscular', unit: '%', decimals: 1 },
      { key: 'visceral_fat', label: 'Grasa Visceral', unit: 'nivel', decimals: 0 },
      { key: 'bmr_kcal', label: 'Metabolismo Basal (BMR)', unit: 'kcal', decimals: 0 },
    ],
  },
  {
    category: 'INDICADORES Y RATIOS',
    metrics: [
      { key: 'bmi', label: 'Índice Masa Corporal (IMC)', unit: '', decimals: 1 },
      { key: 'waist_hip_ratio', label: 'Relación Cintura / Cadera', unit: '', decimals: 2 },
    ],
  },
  {
    category: 'PERÍMETROS CORPORALES (cm)',
    metrics: [
      { key: 'neck_cm', label: 'Cuello', unit: 'cm', decimals: 1 },
      { key: 'shoulders_cm', label: 'Hombros', unit: 'cm', decimals: 1 },
      { key: 'chest_cm', label: 'Pecho / Tórax', unit: 'cm', decimals: 1 },
      { key: 'waist_cm', label: 'Cintura', unit: 'cm', decimals: 1 },
      { key: 'abdomen_cm', label: 'Abdomen umbilical', unit: 'cm', decimals: 1 },
      { key: 'hip_cm', label: 'Cadera / Glúteos', unit: 'cm', decimals: 1 },
      { key: 'arm_right_cm', label: 'Bíceps relajado Der.', unit: 'cm', decimals: 1 },
      { key: 'arm_left_cm', label: 'Bíceps relajado Izq.', unit: 'cm', decimals: 1 },
      { key: 'arm_flexed_right_cm', label: 'Bíceps contraído Der.', unit: 'cm', decimals: 1 },
      { key: 'arm_flexed_left_cm', label: 'Bíceps contraído Izq.', unit: 'cm', decimals: 1 },
      { key: 'forearm_right_cm', label: 'Antebrazo Der.', unit: 'cm', decimals: 1 },
      { key: 'forearm_left_cm', label: 'Antebrazo Izq.', unit: 'cm', decimals: 1 },
      { key: 'thigh_right_cm', label: 'Muslo Der.', unit: 'cm', decimals: 1 },
      { key: 'thigh_left_cm', label: 'Muslo Izq.', unit: 'cm', decimals: 1 },
      { key: 'calf_right_cm', label: 'Pantorrilla Der.', unit: 'cm', decimals: 1 },
      { key: 'calf_left_cm', label: 'Pantorrilla Izq.', unit: 'cm', decimals: 1 },
    ],
  },
  {
    category: 'PLICOMETRÍA / PLIEGUES (mm)',
    metrics: [
      { key: 'triceps_mm', label: 'Tríceps', unit: 'mm', decimals: 1 },
      { key: 'biceps_mm', label: 'Bíceps', unit: 'mm', decimals: 1 },
      { key: 'subscapular_mm', label: 'Subescapular', unit: 'mm', decimals: 1 },
      { key: 'supraspinal_mm', label: 'Supraespinal', unit: 'mm', decimals: 1 },
      { key: 'suprailiac_mm', label: 'Suprailíaco', unit: 'mm', decimals: 1 },
      { key: 'abdominal_mm', label: 'Abdominal', unit: 'mm', decimals: 1 },
      { key: 'thigh_mm', label: 'Muslo frontal', unit: 'mm', decimals: 1 },
      { key: 'calf_mm', label: 'Pantorrilla medial', unit: 'mm', decimals: 1 },
      { key: 'chest_mm', label: 'Pectoral / Pecho', unit: 'mm', decimals: 1 },
    ],
  },
];

export default function CompareMeasurementsScreen() {
  const { id, a, b } = useLocalSearchParams<{ id: string; a: string; b: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [earlier, setEarlier] = useState<Measurement | null>(null);
  const [later, setLater] = useState<Measurement | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<{ url: string; title: string; date: string } | null>(null);

  useEffect(() => {
    Promise.all([getClient(id), getMeasurementById(a), getMeasurementById(b)]).then(([c, ma, mb]) => {
      setClient(c);
      const [first, second] =
        new Date(ma.measured_at).getTime() <= new Date(mb.measured_at).getTime() ? [ma, mb] : [mb, ma];
      setEarlier(first);
      setLater(second);
    });
  }, [id, a, b]);

  async function handleExportComparisonPdf() {
    if (!client || !earlier || !later) return;
    setExportingPdf(true);
    try {
      const profile = await getMyProfile();
      await generateAndShareMeasurementComparisonPdf({ client, profile, earlier, later, includePhotos });
    } catch (e) {
      Alert.alert('Error al exportar PDF', (e as Error).message);
    } finally {
      setExportingPdf(false);
    }
  }

  if (client == null || earlier == null || later == null) {
    return (
      <View style={styles.screen}>
        <AppBackground />
        <ScreenHeader title="Comparar mediciones" showBack />
        <ActivityIndicator style={styles.spinner} color={colors.navy} />
      </View>
    );
  }

  const hasAnyPhotos = (earlier.photos && earlier.photos.length > 0) || (later.photos && later.photos.length > 0);

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title="Comparar mediciones"
        subtitle={`${client.full_name} · evolución`}
        showBack
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SECCIÓN DE COMPARACIÓN DE FOTOS (UNA DEBAJO DE OTRA) */}
        {hasAnyPhotos && (
          <View style={styles.photoComparisonSection}>
            <View style={styles.photoSectionHeader}>
              <Camera size={s(15)} color={colors.navy} />
              <Text style={styles.photoSectionTitle}>EVOLUCIÓN VISUAL (FOTOS)</Text>
            </View>

            {/* TARJETA 1: MEDICIÓN ANTERIOR (ARRIBA) */}
            <View style={styles.photoCard}>
              <View style={styles.photoCardHeader}>
                <View style={styles.photoStageBadge}>
                  <Text style={styles.photoStageBadgeText}>INICIAL</Text>
                </View>
                <Text style={styles.photoCardDate}>{formatDateShort(earlier.measured_at)}</Text>
                <Text style={styles.photoCardStats}>
                  {earlier.weight_kg != null ? `${earlier.weight_kg} kg` : ''}
                  {earlier.body_fat_pct != null ? ` · ${earlier.body_fat_pct}% grasa` : ''}
                </Text>
              </View>

              {earlier.photos && earlier.photos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosScrollList}
                >
                  {earlier.photos.map((photoUrl, idx) => (
                    <Pressable
                      key={`earlier-${idx}-${photoUrl}`}
                      onPress={() =>
                        setSelectedPreview({
                          url: photoUrl,
                          title: `Medición Inicial - Foto ${idx + 1}`,
                          date: formatDateShort(earlier.measured_at),
                        })
                      }
                      style={styles.photoThumbContainer}
                    >
                      <StorageImage mediaRef={photoUrl} style={styles.photoThumbImg} contentFit="cover" />
                      <View style={styles.photoThumbOverlay}>
                        <View style={styles.photoThumbIndex}>
                          <Text style={styles.photoThumbIndexText}>{idx + 1}</Text>
                        </View>
                        <View style={styles.photoThumbZoomIcon}>
                          <Maximize2 size={s(10)} color={colors.surface} />
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noPhotosBox}>
                  <Text style={styles.noPhotosText}>Sin fotos registradas en esta fecha</Text>
                </View>
              )}
            </View>

            {/* TARJETA 2: MEDICIÓN POSTERIOR (DEBAJO) */}
            <View style={styles.photoCard}>
              <View style={styles.photoCardHeader}>
                <View style={[styles.photoStageBadge, styles.photoStageBadgeLater]}>
                  <Text style={[styles.photoStageBadgeText, styles.photoStageBadgeTextLater]}>FINAL</Text>
                </View>
                <Text style={styles.photoCardDate}>{formatDateShort(later.measured_at)}</Text>
                <Text style={styles.photoCardStats}>
                  {later.weight_kg != null ? `${later.weight_kg} kg` : ''}
                  {later.body_fat_pct != null ? ` · ${later.body_fat_pct}% grasa` : ''}
                </Text>
              </View>

              {later.photos && later.photos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosScrollList}
                >
                  {later.photos.map((photoUrl, idx) => (
                    <Pressable
                      key={`later-${idx}-${photoUrl}`}
                      onPress={() =>
                        setSelectedPreview({
                          url: photoUrl,
                          title: `Medición Final - Foto ${idx + 1}`,
                          date: formatDateShort(later.measured_at),
                        })
                      }
                      style={styles.photoThumbContainer}
                    >
                      <StorageImage mediaRef={photoUrl} style={styles.photoThumbImg} contentFit="cover" />
                      <View style={styles.photoThumbOverlay}>
                        <View style={[styles.photoThumbIndex, styles.photoThumbIndexLater]}>
                          <Text style={styles.photoThumbIndexText}>{idx + 1}</Text>
                        </View>
                        <View style={styles.photoThumbZoomIcon}>
                          <Maximize2 size={s(10)} color={colors.surface} />
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noPhotosBox}>
                  <Text style={styles.noPhotosText}>Sin fotos registradas en esta fecha</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {METRIC_GROUPS.map((group) => {
          const visibleMetrics = group.metrics.filter(
            (m) => earlier[m.key] != null || later[m.key] != null
          );
          if (visibleMetrics.length === 0) return null;

          return (
            <View key={group.category} style={styles.card}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{group.category}</Text>
              </View>

              <View style={[styles.row, styles.headerRow]}>
                <View style={styles.labelCol}>
                  <Text style={styles.colTitle}>Parámetro</Text>
                </View>
                <Text style={styles.headerCell}>{formatDateShort(earlier.measured_at)}</Text>
                <Text style={styles.headerCell}>{formatDateShort(later.measured_at)}</Text>
              </View>

              {visibleMetrics.map((metric) => {
                const prev = earlier[metric.key] as number | null;
                const next = later[metric.key] as number | null;

                const favorable =
                  prev != null && next != null
                    ? isChangeFavorable(metric.key, prev, next, client.goal)
                    : null;
                const changed = prev != null && next != null && prev !== next;
                const arrow = changed ? (next! > prev! ? ' ↑' : ' ↓') : '';
                return (
                  <View key={metric.key} style={styles.row}>
                    <Text style={styles.labelCell}>{metric.label}</Text>
                    <Text style={styles.valueCell}>{fmt(prev, metric.unit, metric.decimals)}</Text>
                    <Text
                      style={[
                        styles.valueCell,
                        styles.valueCellBold,
                        favorable === true && styles.favorable,
                      ]}
                    >
                      {fmt(next, metric.unit, metric.decimals)}
                      {arrow}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        {hasAnyPhotos && <IncludePhotosToggle value={includePhotos} onChange={setIncludePhotos} />}

        <Pressable
          accessibilityRole="button"
          onPress={handleExportComparisonPdf}
          disabled={exportingPdf}
          style={styles.exportCta}
        >
          {exportingPdf ? (
            <ActivityIndicator size="small" color={colors.navy} />
          ) : (
            <>
              <Download size={s(15)} color={colors.navy} strokeWidth={2.5} />
              <Text style={styles.exportCtaText}>Descargar comparativa en PDF</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* MODAL DE VISUALIZACIÓN EN PANTALLA COMPLETA */}
      <Modal
        visible={selectedPreview != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPreview(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{selectedPreview?.title}</Text>
              <Text style={styles.modalSubtitle}>{selectedPreview?.date}</Text>
            </View>
            <Pressable
              onPress={() => setSelectedPreview(null)}
              style={styles.modalCloseBtn}
              hitSlop={10}
            >
              <X size={s(18)} color={colors.surface} />
            </Pressable>
          </View>

          {selectedPreview && (
            <View style={styles.modalImageContainer}>
              <StorageImage
                mediaRef={selectedPreview.url}
                style={styles.modalFullImage}
                contentFit="contain"
              />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function fmt(value: number | null, unit: string, decimals = 0): string {
  if (value == null) return '—';
  return `${value.toFixed(decimals)}${unit ? ' ' + unit : ''}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  spinner: { marginTop: s(24) },
  scrollContent: { padding: s(16), gap: s(12), paddingBottom: s(32) },
  photoComparisonSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(14),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(12),
  },
  photoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: s(8),
  },
  photoSectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    color: colors.navy,
    letterSpacing: 0.5,
  },
  photoCard: {
    backgroundColor: '#FAFBFD',
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(8),
  },
  photoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  photoStageBadge: {
    backgroundColor: colors.navy,
    paddingHorizontal: s(6),
    paddingVertical: s(2),
    borderRadius: radius.pill,
  },
  photoStageBadgeLater: {
    backgroundColor: colors.lime,
  },
  photoStageBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.surface,
    letterSpacing: 0.3,
  },
  photoStageBadgeTextLater: {
    color: colors.navy,
  },
  photoCardDate: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  photoCardStats: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  photosScrollList: {
    gap: s(10),
    paddingVertical: s(2),
  },
  photoThumbContainer: {
    width: s(105),
    height: s(140),
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
  },
  photoThumbOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: s(6),
  },
  photoThumbIndex: {
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  photoThumbIndexLater: {
    backgroundColor: colors.lime,
  },
  photoThumbIndexText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.surface,
  },
  photoThumbZoomIcon: {
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  noPhotosBox: {
    paddingVertical: s(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPhotosText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(14),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(4),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    paddingVertical: s(6),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  categoryHeader: {
    paddingBottom: s(4),
    marginBottom: s(2),
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  categoryTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    color: colors.navy,
    letterSpacing: 0.4,
  },
  headerRow: { borderBottomWidth: 2, borderBottomColor: colors.navy, paddingBottom: s(8), marginBottom: s(4) },
  colTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.navy,
    textTransform: 'uppercase',
  },
  labelCol: { flex: 1.3 },
  headerCell: {
    flex: 1,
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.navy,
    textAlign: 'center',
  },
  labelCell: { flex: 1.3, fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.text },
  valueCell: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' },
  valueCellBold: { fontFamily: fonts.bodyBold, color: colors.text },
  favorable: { color: '#3B6B11', backgroundColor: '#EBF7D4', borderRadius: 4, paddingVertical: 2 },
  exportCta: {
    height: s(44),
    borderRadius: radius.button,
    backgroundColor: colors.lime,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    marginTop: s(4),
  },
  exportCtaText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.navy,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 26, 0.95)',
    justifyContent: 'space-between',
    paddingTop: s(40),
    paddingBottom: s(30),
    paddingHorizontal: s(16),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.base,
    color: colors.surface,
  },
  modalSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: '#A0AEC0',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageContainer: {
    flex: 1,
    marginVertical: s(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFullImage: {
    width: '100%',
    height: '100%',
  },
});
