import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { listMeasurements } from '@/features/clients/measurementsRepository';
import { getClient } from '@/features/clients/repository';
import { Measurement } from '@/features/clients/types';
import { formatDateShort } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

const MAX_SELECTION = 2;

function summarize(m: Measurement): string {
  const parts = [
    m.weight_kg != null ? `${m.weight_kg} kg` : null,
    m.body_fat_pct != null ? `${m.body_fat_pct}% grasa` : null,
    m.waist_cm != null ? `cintura ${m.waist_cm}cm` : null,
    m.bmi != null ? `IMC ${m.bmi}` : null,
  ].filter(Boolean);
  return parts.join(' · ') || 'Sin datos';
}

/** Mockup ("Historial completo"): selección máx. 2 vía checkbox, "Comparar seleccionadas (n)". */
export default function MeasurementHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [clientName, setClientName] = useState('');
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    getClient(id).then((c) => setClientName(c.full_name));
    listMeasurements(id).then(setMeasurements);
  }, [id]);

  function toggle(measurementId: string) {
    setSelected((prev) => {
      if (prev.includes(measurementId)) return prev.filter((x) => x !== measurementId);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, measurementId];
    });
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Historial completo" subtitle={`${clientName} · antropometría`} showBack />

      {measurements === null ? (
        <ActivityIndicator style={styles.spinner} color={colors.navy} />
      ) : (
        <FlatList
          data={measurements}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.hint}>Máximo 2 selecciones — desmarca una para elegir otra</Text>}
          ListEmptyComponent={<Text style={styles.empty}>Sin mediciones registradas todavía.</Text>}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.id);
            const disabled = !isSelected && selected.length >= MAX_SELECTION;
            return (
              <Pressable
                onPress={() => toggle(item.id)}
                disabled={disabled}
                style={[styles.row, isSelected && styles.rowSelected, disabled && styles.rowDisabled]}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                  {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowDate}>{formatDateShort(item.measured_at)}</Text>
                  <Text style={styles.rowSummary}>{summarize(item)}</Text>
                </View>
              </Pressable>
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
    gap: s(8),
    backgroundColor: colors.background,
    borderRadius: radius.input,
    padding: s(9),
    marginBottom: s(8),
  },
  rowSelected: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lime },
  rowDisabled: { opacity: 0.5 },
  checkbox: {
    width: s(16),
    height: s(16),
    borderRadius: s(4),
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.lime, borderColor: colors.lime },
  checkboxMark: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.surface },
  rowText: { flex: 1, gap: 2 },
  rowDate: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.text },
  rowSummary: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted },
  compareCta: {
    height: s(40),
    borderRadius: radius.button,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(4),
  },
  compareCtaDisabled: { opacity: 0.5 },
  compareCtaText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
});
