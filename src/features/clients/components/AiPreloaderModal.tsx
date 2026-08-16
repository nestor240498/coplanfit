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
  { id: 1, title: 'Analizando perfil y restricciones', desc: 'Alergias, alimentos a evitar y notas médicas' },
  { id: 2, title: 'Procesando antropometría y plicometría', desc: 'Composición corporal, masa muscular y grasa' },
  { id: 3, title: 'Calculando macros y requerimientos', desc: 'Proteínas, carbohidratos, grasas e hidratación' },
  { id: 4, title: 'Estructurando opciones y porciones', desc: 'Generando alimentos exactos y alternativas' },
];

type Props = {
  visible: boolean;
  clientName?: string;
};

export function AiPreloaderModal({ visible, clientName }: Props) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <AiPreloaderContent clientName={clientName} />
    </Modal>
  );
}

function AiPreloaderContent({ clientName }: { clientName?: string }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setCurrentStepIndex(1), 1200);
    const t2 = setTimeout(() => setCurrentStepIndex(2), 2600);
    const t3 = setTimeout(() => setCurrentStepIndex(3), 4200);

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
            <View style={{ gap: 2 }}>
              <Text style={styles.title}>Generando plan con IA</Text>
              <Text style={styles.subtitle}>
                {clientName ? `Optimizando para ${clientName}` : 'Personalizando nutrición deportiva'}
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
                      <Text style={styles.stepNumText}>{step.id}</Text>
                    )}
                  </View>

                  {/* Textos del paso */}
                  <View style={styles.stepTextWrap}>
                    <Text
                      style={[
                        styles.stepTitle,
                        isCurrent && styles.stepTitleCurrent,
                        isPending && styles.stepTitlePending,
                      ]}
                    >
                      {step.title}
                    </Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.footerNote}>
            Calculando porciones exactas en gramos y unidades...
          </Text>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 42, 74, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: s(20),
  },
  card: {
    width: '100%',
    maxWidth: s(320),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(16),
    gap: s(12),
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  iconWrap: {
    width: s(36),
    height: s(36),
    borderRadius: s(10),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: s(9.5),
    color: colors.textSecondary,
  },
  progressTrack: {
    height: s(5),
    borderRadius: s(3),
    backgroundColor: colors.neutralChipBg,
    overflow: 'hidden',
  },
  progressFill: {
    height: s(5),
    borderRadius: s(3),
    backgroundColor: colors.lime,
  },
  stepsList: {
    gap: s(10),
    marginVertical: s(4),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
  },
  stepIconWrap: {
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepIconCompleted: {
    backgroundColor: colors.lime,
  },
  stepIconCurrent: {
    backgroundColor: '#EAF6D8',
    borderWidth: 1.5,
    borderColor: colors.lime,
  },
  stepIconPending: {
    backgroundColor: colors.neutralChipBg,
  },
  stepNumText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8.5),
    color: colors.textMuted,
  },
  stepTextWrap: {
    flex: 1,
    gap: 1,
  },
  stepTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  stepTitleCurrent: {
    color: colors.navy,
  },
  stepTitlePending: {
    color: colors.textMuted,
  },
  stepDesc: {
    fontFamily: fonts.body,
    fontSize: s(8.5),
    color: colors.textSecondary,
  },
  footerNote: {
    fontFamily: fonts.body,
    fontSize: s(8.5),
    color: colors.textMuted,
    textAlign: 'center',
  },
});
