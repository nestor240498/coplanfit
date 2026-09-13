import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, Dumbbell, ShieldCheck, Sparkles } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExerciseStep, MuscleGroup } from '../types';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = {
  steps?: ExerciseStep[] | null;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  instructions?: string | null;
  size?: number;
};

/**
 * Genera 3 pasos estándar a partir de las instrucciones de texto si el ejercicio no tiene el array steps guardado
 */
function parseStepsFromInstructions(
  instructions?: string | null,
  exerciseName = 'Ejercicio',
  muscleGroup = 'pecho'
): ExerciseStep[] {
  if (!instructions) {
    return [
      {
        step: 1,
        title: 'Posición Inicial & Setup',
        description: `Adopta una postura estable y firme adecuada para ${exerciseName}. Ajusta el equipo a tu anatomía y activa el core.`,
      },
      {
        step: 2,
        title: 'Fase Excéntrica (Control)',
        description: `Inicia el movimiento de forma lenta y controlada (2-3 segundos), manteniendo la tensión constante en ${muscleGroup}. Inhala profundamente.`,
      },
      {
        step: 3,
        title: 'Fase Concéntrica (Empuje)',
        description: `Aplica fuerza de forma sólida y exhala el aire, contrayendo firmemente ${muscleGroup} en el punto de máxima contracción.`,
      },
    ];
  }

  // Si las instrucciones tienen formato "1. ... \n2. ... \n3. ..."
  const parts = instructions.split(/\n\s*\n|\n(?=\d+\.)/);
  const cleanParts = parts.map((p) => p.replace(/^\d+\.\s*(Posición inicial:?|Fase excéntrica[^:]*:?|Fase concéntrica[^:]*:?)?\s*/i, '').trim()).filter(Boolean);

  if (cleanParts.length >= 3) {
    return [
      { step: 1, title: 'Posición Inicial & Setup', description: cleanParts[0] },
      { step: 2, title: 'Fase Excéntrica (Bajada)', description: cleanParts[1] },
      { step: 3, title: 'Fase Concéntrica (Empuje)', description: cleanParts[2] },
    ];
  }

  if (cleanParts.length === 2) {
    return [
      { step: 1, title: 'Posición Inicial & Setup', description: cleanParts[0] },
      { step: 2, title: 'Ejecución & Contracción', description: cleanParts[1] },
    ];
  }

  return [
    { step: 1, title: 'Ejecución Técnica', description: instructions },
  ];
}

export function ExerciseStepGuide({
  steps,
  exerciseName,
  muscleGroup,
  instructions,
  size = s(160),
}: Props) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const parsedSteps = useMemo(() => {
    if (steps && steps.length > 0) return steps;
    return parseStepsFromInstructions(instructions, exerciseName, muscleGroup);
  }, [steps, instructions, exerciseName, muscleGroup]);

  const currentStep = parsedSteps[activeStepIndex] || parsedSteps[0];
  const totalSteps = parsedSteps.length;

  function handleNext() {
    if (activeStepIndex < totalSteps - 1) {
      setActiveStepIndex((i) => i + 1);
    } else {
      setActiveStepIndex(0);
    }
  }

  function handlePrev() {
    if (activeStepIndex > 0) {
      setActiveStepIndex((i) => i - 1);
    } else {
      setActiveStepIndex(totalSteps - 1);
    }
  }

  return (
    <View style={styles.cardContainer}>
      {/* Selector de Pestañas de Pasos */}
      <View style={styles.tabsHeader}>
        {parsedSteps.map((sItem, idx) => {
          const isActive = idx === activeStepIndex;
          return (
            <Pressable
              key={idx}
              onPress={() => setActiveStepIndex(idx)}
              style={[styles.stepTab, isActive && styles.stepTabActive]}
            >
              <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                  {idx + 1}
                </Text>
              </View>
              <Text
                style={[styles.tabTitle, isActive && styles.tabTitleActive]}
                numberOfLines={1}
              >
                {sItem.title.split(/&|\(/)[0].trim()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Contenido Visual del Paso Activo */}
      <View style={styles.stepContentBox}>
        {/* Gráfico / Imagen del Paso */}
        <View style={[styles.visualArea, { minHeight: size * 0.95 }]}>
          {currentStep.image_url ? (
            <Image
              source={{ uri: currentStep.image_url }}
              style={styles.stepImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={styles.placeholderVisual}>
              <View style={styles.illustrationCircle}>
                <Dumbbell size={s(32)} color={colors.navy} strokeWidth={2.2} />
              </View>
              <View style={styles.stepBadgeOverlay}>
                <Text style={styles.stepBadgeOverlayText}>
                  PASO {currentStep.step} DE {totalSteps}
                </Text>
              </View>
              <Text style={styles.illustrationMuscle}>
                Enfoque: {muscleGroup.toUpperCase()}
              </Text>
            </View>
          )}

          {/* Botones de navegación sobre la imagen */}
          {totalSteps > 1 && (
            <>
              <Pressable
                onPress={handlePrev}
                style={[styles.navBtn, styles.navBtnLeft]}
                hitSlop={8}
              >
                <ChevronLeft size={s(16)} color={colors.navy} />
              </Pressable>
              <Pressable
                onPress={handleNext}
                style={[styles.navBtn, styles.navBtnRight]}
                hitSlop={8}
              >
                <ChevronRight size={s(16)} color={colors.navy} />
              </Pressable>
            </>
          )}
        </View>

        {/* Detalle y Explicación Técnica */}
        <View style={styles.stepTextCard}>
          <View style={styles.stepTitleRow}>
            <View style={styles.stepNumCircle}>
              <Text style={styles.stepNumText}>{currentStep.step}</Text>
            </View>
            <Text style={styles.stepMainTitle}>{currentStep.title}</Text>
          </View>
          <Text style={styles.stepDescription}>{currentStep.description}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tabsHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: s(4),
    gap: s(4),
  },
  stepTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(6),
    paddingHorizontal: s(6),
    borderRadius: radius.chip,
    gap: s(4),
  },
  stepTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBadge: {
    width: s(16),
    height: s(16),
    borderRadius: s(8),
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    backgroundColor: colors.navy,
  },
  tabBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.surface,
  },
  tabTitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  tabTitleActive: {
    fontFamily: fonts.bodyBold,
    color: colors.navy,
  },
  stepContentBox: {
    padding: s(12),
    gap: s(10),
  },
  visualArea: {
    position: 'relative',
    backgroundColor: colors.background,
    borderRadius: radius.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepImage: {
    width: '100%',
    height: '100%',
    minHeight: s(150),
    borderRadius: radius.card,
  },
  placeholderVisual: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(24),
    gap: s(6),
  },
  illustrationCircle: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    backgroundColor: 'rgba(139, 197, 63, 0.25)',
    borderWidth: 1.5,
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeOverlay: {
    backgroundColor: colors.navy,
    paddingHorizontal: s(8),
    paddingVertical: 2,
    borderRadius: radius.chip,
    marginTop: s(4),
  },
  stepBadgeOverlayText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.surface,
    letterSpacing: 0.5,
  },
  illustrationMuscle: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textMuted,
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -s(14),
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  navBtnLeft: {
    left: s(8),
  },
  navBtnRight: {
    right: s(8),
  },
  stepTextCard: {
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: s(10),
    gap: s(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  stepNumCircle: {
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8.5),
    color: colors.navy,
  },
  stepMainTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  stepDescription: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.text,
    lineHeight: s(16),
  },
});
