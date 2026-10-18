import { Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { AiQuota, formatResetDay } from '../quota';

type Props = { quota: AiQuota };

/** Uso de la IA al estilo de Claude: una barra para hoy y otra para el mes, con cuándo se renuevan. */
export function AiQuotaCard({ quota }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Sparkles size={16} color={colors.navy} />
        </View>
        <View style={styles.headerTexts}>
          <Text style={styles.title} accessibilityRole="header">
            Generaciones con IA
          </Text>
          <Text style={styles.subtitle}>Cuenta cada plan, rutina, ejercicio o informe PDF que completas con IA.</Text>
        </View>
      </View>

      <UsageBar
        label="Hoy"
        used={quota.daily_used}
        limit={quota.daily_limit}
        note="Se renueva a medianoche"
      />
      <UsageBar
        label="Este mes"
        used={quota.monthly_used}
        limit={quota.monthly_limit}
        note={`Se renueva el ${formatResetDay(quota.month_resets_at)}`}
      />

      {quota.extra_credits > 0 ? (
        <Text style={styles.extra}>
          + {quota.extra_credits} {quota.extra_credits === 1 ? 'generación extra' : 'generaciones extra'}: se usan al
          agotar las del mes y no caducan.
        </Text>
      ) : null}
    </View>
  );
}

function UsageBar({ label, used, limit, note }: { label: string; used: number; limit: number; note: string }) {
  const ratio = limit > 0 ? Math.min(1, used / limit) : 1;
  const full = used >= limit;
  const low = !full && ratio >= 0.8;
  return (
    <View
      style={styles.usage}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${used} de ${limit} usadas. ${note}.`}
      accessibilityValue={{ min: 0, max: limit, now: Math.min(used, limit) }}
    >
      <View style={styles.usageTop}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={[styles.usageCount, full && styles.usageCountFull]}>
          {used} de {limit}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${ratio * 100}%` },
            low && styles.fillLow,
            full && styles.fillFull,
          ]}
        />
      </View>
      <Text style={styles.note}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    gap: s(14),
    padding: s(14),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10) },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.base, color: colors.navy },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  usage: { gap: s(5) },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  usageLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.text },
  usageCount: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  usageCountFull: { color: colors.danger },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.neutralChipBg, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.lime },
  fillLow: { backgroundColor: colors.warning },
  fillFull: { backgroundColor: colors.danger },
  note: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted },
  extra: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
});
