import { Pressable, StyleSheet, Text } from 'react-native';

import { s } from '@/theme/scale';
import { colors, shadows } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
};

/** Mockup: círculo lima de 44px, "+" 18px Manrope 800 navy, anclado abajo-derecha a 16px. */
export function FAB({ onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Text style={styles.plus}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: s(16),
    right: s(16),
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  pressed: { opacity: 0.85 },
  plus: {
    fontFamily: fonts.heading,
    fontSize: s(18),
    color: colors.navy,
    marginTop: -2,
  },
});
