import { Check, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, LayoutChangeEvent, Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = {
  visible: boolean;
  title: string;
  clientName?: string;
  /** Lo que de verdad se envía a la IA (datos configurados y de la ficha). Nada de pasos simulados. */
  inputs: string[];
  /** Qué pasa si la IA no responde; se muestra solo cuando la espera se alarga. */
  slowHint: string;
};

// A partir de aquí la espera se considera larga (las funciones suelen responder en 10-25 s)
const SLOW_AFTER_S = 25;
const SEGMENT = 0.35; // ancho del tramo que recorre la barra, respecto a la pista

/**
 * Espera de la IA sin progreso inventado: la barra es indeterminada (no sabemos cuánto falta),
 * la lista enseña los datos que la IA está usando y el texto de estado dice la verdad sobre el tiempo.
 */
export function AiProgressModal({ visible, ...rest }: Props) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <AiProgressContent {...rest} />
    </Modal>
  );
}

function AiProgressContent({ title, clientName, inputs, slowHint }: Omit<Props, 'visible'>) {
  const reduceMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const trackWidth = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    sweep.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }), -1, false));
    return () => cancelAnimation(sweep);
  }, [reduceMotion, sweep]);

  const isSlow = elapsed >= SLOW_AFTER_S;

  useEffect(() => {
    if (isSlow) AccessibilityInfo.announceForAccessibility(slowHint);
  }, [isSlow, slowHint]);

  const segmentStyle = useAnimatedStyle(() => {
    const w = trackWidth.get();
    return {
      width: w * SEGMENT,
      transform: [{ translateX: -w * SEGMENT + sweep.get() * w * (1 + SEGMENT) }],
    };
  });

  function handleTrackLayout(e: LayoutChangeEvent) {
    trackWidth.set(e.nativeEvent.layout.width);
  }

  return (
    <View style={styles.overlay}>
      <View
        style={styles.card}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${title}. ${isSlow ? slowHint : 'Suele tardar entre 10 y 25 segundos.'}`}
      >
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Sparkles size={20} color={colors.navy} />
          </View>
          <View style={styles.headerTexts}>
            <Text style={styles.title}>{title}</Text>
            {clientName ? <Text style={styles.subtitle}>Para {clientName}</Text> : null}
          </View>
        </View>

        {reduceMotion ? (
          <View style={[styles.track, styles.trackStatic]} />
        ) : (
          <View style={styles.track} onLayout={handleTrackLayout}>
            <Animated.View style={[styles.segment, segmentStyle]} />
          </View>
        )}

        <View style={styles.inputs}>
          <Text style={styles.inputsLabel}>La IA está trabajando con</Text>
          {inputs.map((input) => (
            <View key={input} style={styles.inputRow}>
              <View style={styles.check}>
                <Check size={11} color={colors.navy} strokeWidth={3} />
              </View>
              <Text style={styles.inputText}>{input}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.status, isSlow && styles.statusSlow]}>
          {isSlow ? slowHint : `Suele tardar entre 10 y 25 segundos · ${elapsed} s`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 32, 61, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: s(20),
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(18),
    gap: s(14),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.headline, color: colors.navy },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutralChipBg,
    overflow: 'hidden',
  },
  // Sin movimiento: pista lima tenue fija, que sigue indicando «en curso» sin fingir un porcentaje
  trackStatic: { backgroundColor: colors.successBg },
  segment: { height: 4, borderRadius: 2, backgroundColor: colors.lime },
  inputs: { gap: s(8) },
  inputsLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10) },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 1,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputText: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.text },
  status: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted },
  statusSlow: { color: colors.textSecondary },
});
