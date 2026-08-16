import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

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
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.navy : colors.surface} />
      ) : (
        <Text style={[styles.label, variant === 'primary' ? styles.labelOnLime : styles.labelOnNavy, variant === 'ghost' && styles.labelGhost]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: s(36),
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(14),
  },
  primary: { backgroundColor: colors.lime },
  secondary: { backgroundColor: colors.navy },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelOnLime: { color: colors.navy },
  labelOnNavy: { color: colors.surface },
  labelGhost: { color: colors.navy },
});
