import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  variant?: 'on-navy' | 'on-light';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  scale?: number;
  showText?: boolean;
  style?: ViewStyle;
};

/**
 * Logotipo oficial de CoplanFit (Propuesta 1a):
 * Isotipo: Dos formas redondeadas superpuestas (entrenador y cliente co-planificando).
 * Wordmark: "Coplan" + "Fit" en negrita.
 */
export function CoplanFitLogo({
  variant = 'on-navy',
  size = 'md',
  scale,
  showText = true,
  style,
}: Props) {
  const isNavyBg = variant === 'on-navy';

  // Dimensiones según el tamaño (xs es 50% de lg)
  const scaleMultiplier =
    scale ??
    (size === 'xs' ? 0.65 : size === 'sm' ? 0.8 : size === 'lg' ? 1.3 : 1);
  const markWidth = s(38 * scaleMultiplier);
  const markHeight = s(26 * scaleMultiplier);
  const boxWidth = s(22 * scaleMultiplier);
  const boxHeight = s(22 * scaleMultiplier);
  const boxRadius = s(7 * scaleMultiplier);
  const fontSize = s(20 * scaleMultiplier);

  const backBoxColor = isNavyBg ? '#FFFFFF' : colors.navy;
  const frontBoxColor = colors.lime;
  const textColor = isNavyBg ? '#FFFFFF' : colors.navy;

  return (
    <View style={[styles.container, style]}>
      {/* Isotipo: dos formas superpuestas */}
      <View style={[styles.markWrap, { width: markWidth, height: markHeight }]}>
        <View
          style={[
            styles.box,
            styles.backBox,
            {
              width: boxWidth,
              height: boxHeight,
              borderRadius: boxRadius,
              backgroundColor: backBoxColor,
            },
          ]}
        />
        <View
          style={[
            styles.box,
            styles.frontBox,
            {
              width: boxWidth,
              height: boxHeight,
              borderRadius: boxRadius,
              backgroundColor: frontBoxColor,
            },
          ]}
        />
      </View>

      {/* Wordmark: CoplanFit */}
      {showText && (
        <Text style={[styles.wordmark, { fontSize }]}>
          <Text style={{ color: textColor }}>Coplan</Text>
          <Text style={{ color: colors.lime }}>Fit</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  markWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  box: {
    position: 'absolute',
  },
  backBox: {
    left: 0,
    top: 0,
  },
  frontBox: {
    right: 0,
    bottom: 0,
  },
  wordmark: {
    fontFamily: fonts.heading,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
