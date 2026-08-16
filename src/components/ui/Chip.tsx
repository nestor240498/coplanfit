import { Pressable, StyleSheet, Text, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export type ChipVariant = 'danger' | 'neutral' | 'success';

type Props = {
  label: string;
  variant?: ChipVariant;
  /** Muestra "×" y lo hace tocable para quitar */
  onRemove?: () => void;
};

const palette: Record<ChipVariant, { bg: string; fg: string }> = {
  danger: { bg: colors.dangerBg, fg: colors.danger },
  neutral: { bg: colors.neutralChipBg, fg: colors.textSecondary },
  success: { bg: colors.successBg, fg: colors.success },
};

export function Chip({ label, variant = 'neutral', onRemove }: Props) {
  const { bg, fg } = palette[variant];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
      {onRemove && (
        <Pressable accessibilityLabel={`Quitar ${label}`} onPress={onRemove} hitSlop={8}>
          <Text style={[styles.remove, { color: fg }]}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

// Mockup (chips de ficha): texto 10px 600, padding 4x9, radio 20 (pill)
const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    borderRadius: radius.chip,
    paddingVertical: s(4),
    paddingHorizontal: s(9),
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: fontSizes.xs,
  },
  remove: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    marginTop: -1,
  },
});
