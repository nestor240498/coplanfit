import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Fragment } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Step = {
  number: 1 | 2 | 3;
  label: string;
};

const STEPS: Step[] = [
  { number: 1, label: 'Configuración' },
  { number: 2, label: 'Alimentos IA' },
  { number: 3, label: 'Asignar comidas' },
];

const STEP_ROUTES: Record<1 | 2 | 3, string> = {
  1: 'new',
  2: 'assistant',
  3: 'assign',
};

type Props = {
  currentStep: 1 | 2 | 3;
  clientId?: string;
  onStepPress?: (step: 1 | 2 | 3) => void;
};

export function PlanStepper({ currentStep, clientId, onStepPress }: Props) {
  const router = useRouter();

  function handlePressStep(stepNumber: 1 | 2 | 3) {
    // Solo permitir retroceder a pasos anteriores (nunca hacia adelante)
    if (stepNumber < currentStep) {
      if (onStepPress) {
        onStepPress(stepNumber);
      } else if (clientId) {
        const route = STEP_ROUTES[stepNumber];
        router.push(`/client/${clientId}/plans/${route}`);
      }
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          return (
            <Fragment key={step.number}>
              {/* Línea conectora entre pasos */}
              {index > 0 && (
                <View style={styles.connectorTrack}>
                  <View
                    style={[
                      styles.connectorFill,
                      currentStep >= step.number && styles.connectorFillActive,
                    ]}
                  />
                </View>
              )}

              {/* Paso interactivo */}
              <Pressable
                onPress={() => handlePressStep(step.number)}
                disabled={!isCompleted}
                style={({ pressed }) => [
                  styles.stepItem,
                  isCompleted && styles.stepItemClickable,
                  pressed && isCompleted && styles.stepItemPressed,
                ]}
                hitSlop={8}
              >
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isCurrent && styles.circleCurrent,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={s(9)} color={colors.navy} strokeWidth={3} />
                  ) : (
                    <Text
                      style={[
                        styles.circleNumber,
                        isCurrent && styles.circleNumberCurrent,
                      ]}
                    >
                      {step.number}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    isCompleted && styles.labelCompleted,
                    isCurrent && styles.labelCurrent,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </Pressable>
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.navy,
    paddingHorizontal: s(12),
    paddingTop: s(6),
    paddingBottom: s(6),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: s(-7),
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    gap: s(2),
    width: s(70),
    zIndex: 2,
  },
  stepItemClickable: {
    cursor: Platform.OS === 'web' ? ('pointer' as unknown as undefined) : undefined,
  },
  stepItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  connectorTrack: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: s(8), // Centro del círculo reducido
    marginHorizontal: -s(8),
    zIndex: 1,
  },
  connectorFill: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  connectorFillActive: {
    backgroundColor: colors.lime,
  },
  circle: {
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  circleCurrent: {
    backgroundColor: colors.surface,
    borderColor: colors.lime,
    borderWidth: 1.5,
  },
  circleNumber: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.onNavyMuted,
  },
  circleNumberCurrent: {
    color: colors.navy,
    fontWeight: '800',
  },
  label: {
    fontFamily: fonts.body,
    fontSize: s(7.5),
    color: colors.onNavyMuted,
    textAlign: 'center',
  },
  labelCompleted: {
    color: colors.lime,
    fontFamily: fonts.bodySemi,
  },
  labelCurrent: {
    color: colors.surface,
    fontFamily: fonts.bodyBold,
  },
});


