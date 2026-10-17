import { Plus, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export type ChipVariant = 'danger' | 'neutral' | 'success';

type Props = {
  label: string;
  variant?: ChipVariant;
  /** Muestra una X tocable para quitar */
  onRemove?: () => void;
};

const palette: Record<ChipVariant, { bg: string; fg: string }> = {
  danger: { bg: colors.dangerBg, fg: colors.danger },
  neutral: { bg: colors.navy, fg: colors.surface },
  success: { bg: colors.successBg, fg: colors.success },
};

export function Chip({ label, variant = 'neutral', onRemove }: Props) {
  const { bg, fg } = palette[variant];
  const reduceMotion = useReducedMotion();
  // Al quitarlo se desvanece y el resto de la fila se recoloca con suavidad (sin animar la entrada)
  return (
    <Animated.View
      layout={reduceMotion ? undefined : LinearTransition.duration(200)}
      exiting={reduceMotion ? undefined : FadeOut.duration(140)}
      style={[styles.chip, { backgroundColor: bg }]}
    >
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
      {onRemove && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${label}`}
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
          style={styles.removeBtn}
        >
          <X size={14} color={fg} strokeWidth={2.5} />
        </Pressable>
      )}
    </Animated.View>
  );
}

/** Chip punteado «Agregar» que acompaña a una fila de chips: misma altura y tipografía que Chip. */
export function AddChip({ onPress, label = 'Agregar', accessibilityLabel }: { onPress: () => void; label?: string; accessibilityLabel?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [styles.chip, styles.addChip, pressed && styles.addChipPressed]}
    >
      <Plus size={14} color={colors.navy} strokeWidth={2.5} />
      <Text style={[styles.label, styles.addLabel]}>{label}</Text>
    </Pressable>
  );
}

// Chips de ficha: pill, texto 13 pt; la X tiene área táctil ampliada con hitSlop (≈44 pt).
// La altura la fija minHeight (sin relleno vertical): así un chip con X y el «Agregar» sin X miden
// lo mismo; con Dynamic Type crecen ambos por igual con el texto.
const CHIP_HEIGHT = 36;

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    borderRadius: radius.chip,
    minHeight: CHIP_HEIGHT,
    paddingVertical: 2,
    paddingHorizontal: s(10),
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: fontSizes.xs,
  },
  addChip: {
    gap: s(4),
    borderWidth: 1,
    borderColor: colors.navy,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  addChipPressed: { backgroundColor: colors.neutralChipBg },
  addLabel: { fontFamily: fonts.bodyBold, color: colors.navy },
  removeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
  },
});
