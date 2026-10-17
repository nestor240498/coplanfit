import { ActivityIndicator, StyleSheet, Text, ViewStyle } from 'react-native';

import { hapticPress } from '@/lib/motion';

import { PressableScale } from './PressableScale';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }: Props) {
  const isDisabled = disabled || loading;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={() => {
        // Vibración ligera solo en la acción principal de la pantalla
        if (variant === 'primary') hapticPress();
        onPress?.();
      }}
      disabled={isDisabled}
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.navy : colors.surface} />
      ) : (
        <Text style={[styles.label, variant === 'primary' ? styles.labelOnLime : styles.labelOnNavy, variant === 'ghost' && styles.labelGhost]}>
          {title}
        </Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingVertical: s(8),
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(14),
  },
  primary: { backgroundColor: colors.lime },
  secondary: { backgroundColor: colors.navy },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelOnLime: { color: colors.navy },
  labelOnNavy: { color: colors.surface },
  labelGhost: { color: colors.navy },
});
