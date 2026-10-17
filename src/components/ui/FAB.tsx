import { Plus } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { hapticPress } from '@/lib/motion';

import { PressableScale } from './PressableScale';
import { s } from '@/theme/scale';
import { colors, shadows } from '@/theme/tokens';

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
};

/** Botón flotante lima de 56 pt con icono «+» navy, anclado abajo a la derecha. */
export function FAB({ onPress, accessibilityLabel }: Props) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        hapticPress();
        onPress();
      }}
      pressedScale={0.92}
      style={styles.fab}
    >
      <Plus size={26} color={colors.navy} strokeWidth={2.75} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: s(16),
    right: s(16),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
});
