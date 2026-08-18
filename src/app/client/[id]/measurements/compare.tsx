import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { AppBackground } from '@/components/ui/AppBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getMeasurementById } from '@/features/clients/measurementsRepository';
import { getClient } from '@/features/clients/repository';
import { Client, Measurement } from '@/features/clients/types';
import { formatDateShort, formatGoal } from '@/lib/format';
import { isChangeFavorable } from '@/lib/measurementTrends';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type MetricDef = { key: keyof Measurement; label: string; unit: string; decimals?: number };

const METRICS: MetricDef[] = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg', decimals: 1 },
  { key: 'body_fat_pct', label: '% grasa', unit: '%' },
  { key: 'waist_cm', label: 'Cintura', unit: 'cm' },
  { key: 'hip_cm', label: 'Cadera', unit: 'cm' },
  { key: 'arm_cm', label: 'Brazo', unit: 'cm' },
  { key: 'bmi', label: 'IMC', unit: '', decimals: 1 },
  { key: 'waist_hip_ratio', label: 'Cintura/cadera', unit: '', decimals: 2 },
  { key: 'triceps_mm', label: 'Tríceps', unit: 'mm' },
];

/** Mockup ("Comparar mediciones"): tabla con flechas ↑/↓ de tendencia relativas al objetivo. */
export default function CompareMeasurementsScreen() {
  const { id, a, b } = useLocalSearchParams<{ id: string; a: string; b: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [earlier, setEarlier] = useState<Measurement | null>(null);
  const [later, setLater] = useState<Measurement | null>(null);

  useEffect(() => {
    Promise.all([getClient(id), getMeasurementById(a), getMeasurementById(b)]).then(([c, ma, mb]) => {
      setClient(c);
      const [first, second] =
        new Date(ma.measured_at).getTime() <= new Date(mb.measured_at).getTime() ? [ma, mb] : [mb, ma];
      setEarlier(first);
      setLater(second);
    });
  }, [id, a, b]);

  if (client == null || earlier == null || later == null) {
    return (
      <View style={styles.screen}>
        <AppBackground />
        <ScreenHeader title="Comparar mediciones" showBack />
        <ActivityIndicator style={styles.spinner} color={colors.navy} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader title="Comparar mediciones" subtitle={client.full_name} showBack />
      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          <View style={styles.labelCol} />
          <Text style={styles.headerCell}>{formatDateShort(earlier.measured_at)}</Text>
          <Text style={styles.headerCell}>{formatDateShort(later.measured_at)}</Text>
        </View>

        {METRICS.map((metric) => {
          const prev = earlier[metric.key] as number | null;
          const next = later[metric.key] as number | null;
          const favorable = prev != null && next != null ? isChangeFavorable(metric.key, prev, next, client.goal) : null;
          const changed = prev != null && next != null && prev !== next;
          const arrow = changed ? (next! > prev! ? ' ↑' : ' ↓') : '';
          return (
            <View key={metric.key} style={styles.row}>
              <Text style={styles.labelCell}>{metric.label}</Text>
              <Text style={styles.valueCell}>{fmt(prev, metric.unit, metric.decimals)}</Text>
              <Text style={[styles.valueCell, styles.valueCellBold, favorable === true && styles.favorable]}>
                {fmt(next, metric.unit, metric.decimals)}
                {arrow}
              </Text>
            </View>
          );
        })}

        <Text style={styles.legend}>Verde = cambio favorable para el objetivo{client.goal ? ` de ${formatGoal(client.goal)}` : ''}</Text>
      </View>
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
  table: { padding: s(16), gap: s(4) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    paddingVertical: s(4),
  },
  headerRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: s(6), marginBottom: s(2) },
  labelCol: { flex: 1.3 },
  headerCell: {
    flex: 1,
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelCell: { flex: 1.3, fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.text },
  valueCell: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' },
  valueCellBold: { fontFamily: fonts.bodyBold, color: colors.text },
  favorable: { color: colors.success },
  legend: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    marginTop: s(6),
  },
});
