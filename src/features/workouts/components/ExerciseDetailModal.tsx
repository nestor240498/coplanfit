import { Dumbbell, Edit3, Flame, Info, Lightbulb, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { getCurrentUserRole } from '../exerciseService';
import { Exercise, MUSCLE_GROUPS } from '../types';
import { ExerciseImageCarousel } from './ExerciseImageCarousel';

type Props = {
  exercise: Exercise | null;
  visible: boolean;
  onClose: () => void;
  onSelect?: (exercise: Exercise) => void;
  onEdit?: (exercise: Exercise) => void;
};

/**
 * Convierte un texto de instrucciones en un array de pasos individuales
 */
function parseInstructionsToSteps(text?: string | null): string[] {
  if (!text || !text.trim()) return [];
  const rawParts = text
    .split(/(?:[\r\n]+|(?<=\s|^)(?=\d+[\.\)]\s))/g)
    .map((p) => p.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((p) => p.length > 0);

  return rawParts.length > 0 ? rawParts : [text.trim()];
}

export function ExerciseDetailModal({ exercise, visible, onClose, onSelect, onEdit }: Props) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      getCurrentUserRole().then((res) => {
        setIsSuperAdmin(res.isSuperAdmin);
        setCurrentUserId(res.userId);
      });
    }
  }, [visible]);

  if (!exercise || !visible) return null;

  const muscleLabel = MUSCLE_GROUPS.find((m) => m.id === exercise.muscle_group)?.label || exercise.muscle_group;
  const canEdit = isSuperAdmin || (exercise.is_custom && exercise.created_by === currentUserId);
  const stepList = parseInstructionsToSteps(exercise.instructions);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>{exercise.name}</Text>
              <View style={styles.badgesRow}>
                <View style={styles.muscleBadge}>
                  <Text style={styles.muscleBadgeText}>{muscleLabel}</Text>
                </View>
                <View style={styles.equipBadge}>
                  <Text style={styles.equipBadgeText}>{exercise.equipment}</Text>
                </View>
                <View style={[styles.typeBadge, exercise.is_custom ? styles.customBadge : styles.globalBadge]}>
                  <Text style={[styles.typeBadgeText, exercise.is_custom ? styles.customBadgeText : styles.globalBadgeText]}>
                    {exercise.is_custom ? '👤 Personalizado' : '🌍 Global Oficial'}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <X size={s(18)} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Carrusel Visual de Imágenes de Pasos */}
            <ExerciseImageCarousel
              key={exercise.id}
              images={exercise.images || (exercise.image_url ? [exercise.image_url] : null)}
              exerciseName={exercise.name}
              muscleGroup={exercise.muscle_group}
              height={s(170)}
            />

            {/* Ficha rápida */}
            <View style={styles.metaGrid}>
              <View style={styles.metaBox}>
                <View style={styles.metaIconWrap}>
                  <Flame size={s(13)} color={colors.navy} />
                </View>
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel} numberOfLines={1} adjustsFontSizeToFit>
                    DIFICULTAD
                  </Text>
                  <Text style={styles.metaValue} numberOfLines={1} adjustsFontSizeToFit>
                    {exercise.difficulty || 'Intermedio'}
                  </Text>
                </View>
              </View>
              <View style={styles.metaBox}>
                <View style={styles.metaIconWrap}>
                  <Dumbbell size={s(13)} color={colors.navy} />
                </View>
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel} numberOfLines={1} adjustsFontSizeToFit>
                    EQUIPAMIENTO
                  </Text>
                  <Text style={styles.metaValue} numberOfLines={1} adjustsFontSizeToFit>
                    {exercise.equipment}
                  </Text>
                </View>
              </View>
            </View>

            {/* Instrucciones de técnica estructuradas por Pasos */}
            {stepList.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Info size={s(14)} color={colors.navy} />
                  <Text style={styles.sectionTitle}>Instrucciones de Ejecución</Text>
                  <Text style={styles.stepsBadgeText}>{stepList.length} Pasos</Text>
                </View>

                <View style={styles.stepsList}>
                  {stepList.map((stepDesc, idx) => (
                    <View key={idx} style={styles.stepCard}>
                      <View style={styles.stepNumBadge}>
                        <Text style={styles.stepNumText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.stepCardText}>{stepDesc}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Consejos técnicos y tips */}
            {exercise.tips ? (
              <View style={[styles.section, styles.tipsSection]}>
                <View style={styles.sectionHeader}>
                  <Lightbulb size={s(14)} color={colors.navy} />
                  <Text style={styles.sectionTitle}>Consejos & Errores Comunes</Text>
                </View>
                <Text style={styles.tipsText}>{exercise.tips}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer de acción */}
          <View style={styles.footer}>
            {canEdit && onEdit && (
              <Pressable
                onPress={() => {
                  onClose();
                  onEdit(exercise);
                }}
                style={styles.editBtn}
              >
                <Edit3 size={s(14)} color={colors.navy} />
                <Text style={styles.editBtnText}>
                  {isSuperAdmin && !exercise.is_custom
                    ? 'Editar Ejercicio Global ✏️'
                    : 'Editar Ejercicio ✏️'}
                </Text>
              </Pressable>
            )}

            {onSelect && (
              <Button
                title="Seleccionar este ejercicio"
                onPress={() => {
                  onSelect(exercise);
                  onClose();
                }}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    maxHeight: '80%',
    paddingBottom: s(24),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: s(20),
    paddingTop: s(18),
    paddingBottom: s(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleWrap: {
    flex: 1,
    gap: s(6),
    paddingRight: s(10),
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.title,
    color: colors.navy,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(6),
  },
  muscleBadge: {
    backgroundColor: colors.navy,
    paddingHorizontal: s(8),
    paddingVertical: 2,
    borderRadius: radius.chip,
  },
  muscleBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.surface,
    textTransform: 'uppercase',
  },
  equipBadge: {
    backgroundColor: 'rgba(139, 197, 63, 0.2)',
    paddingHorizontal: s(8),
    paddingVertical: 2,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.lime,
  },
  equipBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.navy,
    textTransform: 'capitalize',
  },
  typeBadge: {
    paddingHorizontal: s(8),
    paddingVertical: 2,
    borderRadius: radius.chip,
  },
  typeBadgeText: {
    fontFamily: fonts.body,
    fontSize: s(7.5),
  },
  customBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customBadgeText: {
    color: colors.textSecondary,
  },
  globalBadge: {
    backgroundColor: 'rgba(139, 197, 63, 0.25)',
  },
  globalBadgeText: {
    fontFamily: fonts.bodyBold,
    color: colors.navy,
  },
  closeBtn: {
    padding: s(4),
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: s(20),
    gap: s(16),
  },
  metaGrid: {
    flexDirection: 'row',
    gap: s(8),
  },
  metaBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    backgroundColor: colors.background,
    paddingVertical: s(8),
    paddingHorizontal: s(8),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaIconWrap: {
    width: s(26),
    height: s(26),
    borderRadius: s(13),
    backgroundColor: 'rgba(139, 197, 63, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaTextWrap: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: s(6.8),
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  metaValue: {
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    color: colors.navy,
    textTransform: 'capitalize',
    marginTop: 1,
  },
  section: {
    gap: s(8),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
    flex: 1,
  },
  stepsBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.textSecondary,
  },
  stepsList: {
    gap: s(8),
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: s(10),
  },
  stepNumBadge: {
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(1),
  },
  stepNumText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8.5),
    color: colors.surface,
  },
  stepCardText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    lineHeight: s(15),
  },
  tipsSection: {
    backgroundColor: 'rgba(139, 197, 63, 0.12)',
    padding: s(12),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.lime,
  },
  tipsText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.navy,
    lineHeight: s(15),
  },
  footer: {
    paddingHorizontal: s(20),
    paddingTop: s(8),
    gap: s(8),
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    paddingVertical: s(10),
    borderRadius: radius.input,
    backgroundColor: 'rgba(139, 197, 63, 0.18)',
    borderWidth: 1,
    borderColor: colors.lime,
  },
  editBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
});
