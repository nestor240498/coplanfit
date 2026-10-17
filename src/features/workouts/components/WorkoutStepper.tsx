import { Pressable, StyleSheet, Text, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

const STEPS = [
  { num: 1, label: 'Configuración' },
  { num: 2, label: 'Ejercicios e IA' },
  { num: 3, label: 'Series y Reps' },
];

export function WorkoutStepper({
  currentStep,
  onStepPress,
}: {
  currentStep: number;
  onStepPress?: (step: number) => void;
}) {
  return (
    <View style={styles.container}>
      {STEPS.map((sItem, index) => {
        const isDone = sItem.num < currentStep;
        const isCurrent = sItem.num === currentStep;

        return (
          <Pressable
            key={sItem.num}
            onPress={() => onStepPress && onStepPress(sItem.num)}
            disabled={!onStepPress}
            style={styles.stepItemWrap}
          >
            <View style={styles.stepCircleRow}>
              <View
                style={[
                  styles.circle,
                  isCurrent && styles.circleCurrent,
                  isDone && styles.circleDone,
                ]}
              >
                <Text
                  style={[
                    styles.circleText,
                    (isCurrent || isDone) && styles.circleTextActive,
                  ]}
                >
                  {isDone ? '✓' : sItem.num}
                </Text>
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    sItem.num < currentStep && styles.connectorDone,
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                isCurrent && styles.stepLabelCurrent,
                isDone && styles.stepLabelDone,
              ]}
              numberOfLines={1}
            >
              {sItem.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingVertical: s(12),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItemWrap: {
    flex: 1,
    alignItems: 'center',
    gap: s(4),
  },
  stepCircleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  circle: {
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleCurrent: {
    borderColor: colors.navy,
    backgroundColor: colors.navy,
  },
  circleDone: {
    borderColor: colors.lime,
    backgroundColor: colors.lime,
  },
  circleText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  circleTextActive: {
    color: colors.surface,
  },
  connector: {
    position: 'absolute',
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: colors.border,
    zIndex: 1,
  },
  connectorDone: {
    backgroundColor: colors.lime,
  },
  stepLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stepLabelCurrent: {
    fontFamily: fonts.bodyBold,
    color: colors.navy,
  },
  stepLabelDone: {
    color: colors.textSecondary,
  },
});
