import { Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { AiQuota, quotaHint } from '../quota';

/** Aviso discreto junto al botón de generar; no se muestra mientras quede de sobra. */
export function AiQuotaHint({ quota, style }: { quota: AiQuota | null; style?: object }) {
  const hint = quotaHint(quota);
  if (!hint) return null;
  return (
    <View style={[styles.row, style]} accessibilityLiveRegion="polite">
      <Sparkles size={13} color={hint.blocked ? colors.danger : colors.textSecondary} />
      <Text style={[styles.text, hint.blocked && styles.textBlocked]}>{hint.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  text: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textSecondary },
  textBlocked: { color: colors.danger },
});
