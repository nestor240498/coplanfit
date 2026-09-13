import { Check, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

const STEPS = [
  { id: 1, title: 'Analizando perfil y restricciones', desc: 'Historial de salud, lesiones y nivel de experiencia' },
  { id: 2, title: 'Evaluando biomecánica y equipamiento', desc: 'Gimnasio comercial, mancuernas, máquinas y poleas' },
  { id: 3, title: 'Estructurando división semanal', desc: 'Distribución de empuje, tirón, pierna y descansos' },
  { id: 4, title: 'Optimizando ejercicios y superseries', desc: '6 ejercicios por día, series, repeticiones y cargas' },
];

type Props = {
  visible: boolean;
  clientName?: string;
};

export function WorkoutAiPreloaderModal({ visible, clientName }: Props) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <WorkoutAiPreloaderContent clientName={clientName} />
    </Modal>
  );
}

function WorkoutAiPreloaderContent({ clientName }: { clientName?: string }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setCurrentStepIndex(1), 1000);
    const t2 = setTimeout(() => setCurrentStepIndex(2), 2200);
    const t3 = setTimeout(() => setCurrentStepIndex(3), 3600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* Header animado con IA */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Sparkles size={s(20)} color={colors.navy} />
          </View>
          <View style={{ gap: 2, flex: 1 }}>
            <Text style={styles.title}>Generando rutina con IA</Text>
            <Text style={styles.subtitle}>
              {clientName ? `Optimizando para ${clientName}` : 'Personalizando entrenamiento y biomecánica'}
            </Text>
          </View>
        </View>

        {/* Barra de progreso global */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` },
            ]}
          />
        </View>

        {/* Lista de pasos con estados */}
        <View style={styles.stepsList}>
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isPending = idx > currentStepIndex;

            return (
              <View key={step.id} style={styles.stepRow}>
                {/* Icono de estado */}
                <View
                  style={[
                    styles.stepIconWrap,
                    isCompleted && styles.stepIconCompleted,
                    isCurrent && styles.stepIconCurrent,
                    isPending && styles.stepIconPending,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={s(11)} color={colors.navy} strokeWidth={3} />
                  ) : isCurrent ? (
                    <ActivityIndicator size="small" color={colors.navy} />
                  ) : (
                    <Text style={styles.stepNumberText}>{step.id}</Text>
                  )}
                </View>

                {/* Textos del paso */}
                <View style={styles.stepTexts}>
                  <Text
                    style={[
                      styles.stepTitle,
                      isCompleted && styles.stepTitleCompleted,
                      isCurrent && styles.stepTitleCurrent,
                      isPending && styles.stepTitlePending,
                    ]}
                  >
                    {step.title}
                  </Text>
                  <Text
                    style={[
                      styles.stepDesc,
                      isCompleted && styles.stepDescCompleted,
                      isCurrent && styles.stepDescCurrent,
                      isPending && styles.stepDescPending,
                    ]}
                  >
                    {step.desc}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Mensaje de espera al pie */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            IA está cruzando variables clínicas y biomecánicas…
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(24),
  },
  card: {
    width: '100%',
    maxWidth: s(400),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(20),
    gap: s(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  iconWrap: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: colors.lime,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: s(4),
    backgroundColor: colors.background,
    borderRadius: radius.chip,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.lime,
    borderRadius: radius.chip,
  },
  stepsList: {
    gap: s(12),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(12),
  },
  stepIconWrap: {
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepIconCompleted: {
    backgroundColor: colors.lime,
  },
  stepIconCurrent: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.lime,
  },
  stepIconPending: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumberText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(9),
    color: colors.textMuted,
  },
  stepTexts: {
    flex: 1,
    gap: 1,
  },
  stepTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
  },
  stepTitleCompleted: {
    color: colors.navy,
  },
  stepTitleCurrent: {
    color: colors.navy,
  },
  stepTitlePending: {
    color: colors.textMuted,
  },
  stepDesc: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
  },
  stepDescCompleted: {
    color: colors.textSecondary,
  },
  stepDescCurrent: {
    color: colors.textSecondary,
  },
  stepDescPending: {
    color: colors.textMuted,
  },
  footer: {
    paddingTop: s(8),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
