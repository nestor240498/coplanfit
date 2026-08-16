import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  variant?: 'on-navy' | 'on-light';
  size?: 'sm' | 'md' | 'lg';
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
  showText = true,
  style,
}: Props) {
  const isNavyBg = variant === 'on-navy';

  // Dimensiones según el tamaño
  const scaleMultiplier = size === 'sm' ? 0.75 : size === 'lg' ? 1.3 : 1;
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

/** Icono de app / cuadrado isotipo estilizado (como en el mockup 1a) */
export function CoplanFitAppIcon({ size = s(44) }: { size?: number }) {
  const innerSize = size * 0.46;
  const innerRadius = innerSize * 0.32;

  return (
    <View
      style={[
        styles.appIconWrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: colors.navy,
        },
      ]}
    >
      <View style={{ width: size * 0.76, height: size * 0.76, position: 'relative' }}>
        {/* Forma blanca superior izquierda */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: innerSize,
            height: innerSize,
            borderRadius: innerRadius,
            backgroundColor: '#FFFFFF',
          }}
        />
        {/* Forma verde lima inferior derecha */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: innerSize,
            height: innerSize,
            borderRadius: innerRadius,
            backgroundColor: colors.lime,
          }}
        />
      </View>
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
  appIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
