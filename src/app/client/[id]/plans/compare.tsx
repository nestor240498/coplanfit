import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { AppBackground } from '@/components/ui/AppBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getPlanVersionById, PlanVersionWithData } from '@/features/clients/plansRepository';
import { getClient } from '@/features/clients/repository';
import { Client } from '@/features/clients/types';
import { formatDateShort } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

function formatMealValue(val: unknown): string {
  if (!val) return 'No incluida';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    const obj = val as { option1?: string; option2?: string };
    const parts = [
      obj.option1 ? `Opción 1: ${obj.option1}` : null,
      obj.option2 ? `Opción 2: ${obj.option2}` : null,
    ].filter(Boolean);
    return parts.join('\n') || 'No incluida';
  }
  return String(val);
}

/** Mockup ("Comparar planes"): tabla comida-por-comida, resaltado en verde lo que cambió. */
export default function ComparePlansScreen() {
  const { id, a, b } = useLocalSearchParams<{ id: string; a: string; b: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [earlier, setEarlier] = useState<PlanVersionWithData | null>(null);
  const [later, setLater] = useState<PlanVersionWithData | null>(null);

  useEffect(() => {
    Promise.all([getClient(id), getPlanVersionById(a), getPlanVersionById(b)]).then(([c, va, vb]) => {
      setClient(c);
      const [first, second] = va.version <= vb.version ? [va, vb] : [vb, va];
      setEarlier(first);
      setLater(second);
    });
  }, [id, a, b]);

  if (client == null || earlier == null || later == null) {
    return (
      <View style={styles.screen}>
        <AppBackground />
        <ScreenHeader title="Comparar planes" showBack />
        <ActivityIndicator style={styles.spinner} color={colors.navy} />
      </View>
    );
  }

  const earlierMeals = earlier.data?.meals ?? {};
  const laterMeals = later.data?.meals ?? {};
  const mealNames = Array.from(new Set([...Object.keys(earlierMeals), ...Object.keys(laterMeals)]));

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title="Comparar planes"
        subtitle={`Versión ${earlier.version} vs. Versión ${later.version} — ${client.full_name}`}
        showBack
      />
      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          <View style={styles.labelCol} />
          <Text style={styles.headerCell}>
            V{earlier.version} · {formatDateShort(earlier.created_at)}
          </Text>
          <Text style={[styles.headerCell, styles.headerCellCurrent]}>
            V{later.version} · {formatDateShort(later.created_at)}
            {later.is_current ? ' (vigente)' : ''}
          </Text>
        </View>

        {mealNames.length === 0 ? (
          <Text style={styles.empty}>Estas versiones todavía no tienen comidas configuradas.</Text>
        ) : (
          mealNames.map((meal) => {
            const before = earlierMeals[meal] ?? null;
            const after = laterMeals[meal] ?? null;
            const changed = JSON.stringify(before) !== JSON.stringify(after);
            return (
              <View key={meal} style={styles.mealRow}>
                <Text style={styles.mealLabel}>{meal}</Text>
                <Text style={styles.mealValue}>{formatMealValue(before)}</Text>
                <Text style={[styles.mealValue, changed && styles.mealValueChanged]}>{formatMealValue(after)}</Text>
              </View>
            );
          })
        )}

        <Text style={styles.legend}>Verde = agregado o modificado en la versión más reciente</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  spinner: { marginTop: s(24) },
  table: { padding: s(16), gap: s(6) },
  row: { flexDirection: 'row', gap: s(4), paddingBottom: s(6) },
  headerRow: { borderBottomWidth: 1, borderBottomColor: colors.border },
  labelCol: { flex: 0.9 },
  headerCell: { flex: 1, fontFamily: fonts.headingSemi, fontSize: fontSizes.label, color: colors.textSecondary },
  headerCellCurrent: { color: colors.success },
  mealRow: { flexDirection: 'row', gap: s(4), paddingVertical: s(6), borderBottomWidth: 1, borderBottomColor: '#F2F3F6' },
  mealLabel: { flex: 0.9, fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.text },
  mealValue: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textSecondary },
  mealValueChanged: { fontFamily: fonts.bodyMedium, color: colors.success },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: s(20),
  },
  legend: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted, marginTop: s(6) },
});
