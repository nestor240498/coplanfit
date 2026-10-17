import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { DURATION, EASE_OUT, hapticSuccess } from '@/lib/motion';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, TIGHT_FONT_SCALE } from '@/theme/typography';

type Props = {
  /** «Plan nutricional» o «Rutina». */
  documentName: string;
  version: number;
  clientName: string;
  /** Ya se envió desde esta pantalla. */
  sent: boolean;
};

/**
 * Momento de «publicado»: un sello con la versión cae sobre la tarjeta (como el sello de un documento
 * oficial) y la vibración de éxito confirma que el cliente ya tiene una versión vigente nueva.
 * Tras enviarla, el texto pasa a confirmar el envío.
 */
export function PublishedBanner({ documentName, version, clientName, sent }: Props) {
  const reduceMotion = useReducedMotion();
  const firstName = clientName.split(' ')[0] || clientName;
  const stamp = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    hapticSuccess();
    if (!reduceMotion) stamp.set(withDelay(120, withTiming(1, { duration: DURATION.sheetIn, easing: EASE_OUT })));
  }, [reduceMotion, stamp]);

  const stampStyle = useAnimatedStyle(() => {
    const p = stamp.get();
    return {
      opacity: p,
      transform: [{ scale: 1.6 - 0.6 * p }, { rotate: `${-18 + 10 * p}deg` }],
    };
  });

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(DURATION.state)}
      style={styles.card}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${documentName} versión ${version} vigente. ${sent ? `Ya se la enviaste a ${firstName}.` : ''}`}
    >
      <Animated.View style={[styles.stamp, stampStyle]}>
        <Text style={styles.stampVersion} maxFontSizeMultiplier={TIGHT_FONT_SCALE}>
          v{version}
        </Text>
        <Text style={styles.stampLabel} maxFontSizeMultiplier={TIGHT_FONT_SCALE}>
          VIGENTE
        </Text>
      </Animated.View>
      <View style={styles.texts}>
        <Text style={styles.title}>
          {documentName} v{version} vigente
        </Text>
        {sent ? (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(DURATION.state)} style={styles.sentRow}>
            <Check size={14} color={colors.success} strokeWidth={3} />
            <Text style={styles.body}>Ya se la enviaste a {firstName}. Queda anotado en su historial de envíos.</Text>
          </Animated.View>
        ) : (
          <Text style={styles.body}>Desde hoy es la versión que sigue {firstName}. Envíasela para que la tenga a mano.</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    padding: s(14),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.lime,
    backgroundColor: colors.successBg,
  },
  stamp: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: colors.navy,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampVersion: { fontFamily: fonts.heading, fontSize: fontSizes.headline, color: colors.navy, lineHeight: 20 },
  stampLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.micro, color: colors.navy, letterSpacing: 0.6 },
  texts: { flex: 1, gap: s(3) },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.base, color: colors.navy },
  sentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: s(6) },
  body: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
});
