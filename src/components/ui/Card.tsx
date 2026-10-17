import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { PressableScale } from './PressableScale';

type Props = ViewProps & {
  onPress?: () => void;
  /** Borde lima para estados destacados (ej. plan vigente, selección) */
  highlighted?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export function Card({ onPress, highlighted, style, children, ...rest }: Props) {
  const cardStyle = [styles.card, highlighted && styles.highlighted, style];
  if (onPress) {
    return (
      <PressableScale accessibilityRole="button" onPress={onPress} pressedScale={0.985} style={cardStyle} {...rest}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadows.card,
  },
  highlighted: {
    borderWidth: 1,
    borderColor: colors.lime,
  },
});
