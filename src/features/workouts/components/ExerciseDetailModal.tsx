import { AlertTriangle, Copy, Dumbbell, Edit3, Flame, GitBranch, Info, Lightbulb, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { findSubstitutes, personalCopyTemplate, variantTemplate } from '../exerciseSearch';
import { getCurrentUserRole, removeExercise, RemoveExerciseResult } from '../exerciseService';
import {
  equipmentLabel,
  Exercise,
  exerciseTypeLabel,
  lateralityLabel,
  metricLabel,
  muscleLabel,
  patternLabel,
} from '../types';
import { ExerciseImageCarousel } from './ExerciseImageCarousel';
import { ExerciseVideo } from './ExerciseVideo';

type Props = {
  exercise: Exercise | null;
  visible: boolean;
  onClose: () => void;
  onSelect?: (exercise: Exercise) => void;
  onEdit?: (exercise: Exercise) => void;
  /** Tras quitarlo del banco (borrado o archivado). Sin esta prop no se muestra el botón. */
  onRemoved?: (exercise: Exercise, result: RemoveExerciseResult) => void;
  /** Banco completo: para mostrar variantes y sustitutos. */
  allExercises?: Exercise[];
  /** Abre otro ejercicio (al tocar una variante o un sustituto). */
  onOpenExercise?: (exercise: Exercise) => void;
  /** Abre el formulario de alta con datos iniciales (crear variante o hacer mi versión). */
  onCreateFrom?: (template: Partial<Exercise>) => void;
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

export function ExerciseDetailModal({
  exercise,
  visible,
  onClose,
  onSelect,
  onEdit,
  onRemoved,
  allExercises = [],
  onOpenExercise,
  onCreateFrom,
}: Props) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [removing, setRemoving] = useState(false);
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

  const secondaryLabels = (exercise.secondary_muscles ?? []).map(muscleLabel);
  const canEdit = isSuperAdmin || (exercise.is_custom && exercise.created_by === currentUserId);
  const isDefaultFallback = exercise.id.startsWith('default-');

  function handleRemove() {
    if (!exercise) return;
    const target = exercise;
    const message = target.is_custom
      ? 'Si alguna rutina lo usa, se archivará: desaparece del banco pero las rutinas lo conservan.'
      : 'Es un ejercicio del catálogo oficial: se archivará para todos los entrenadores. Las rutinas que ya lo usan lo conservan.';
    Alert.alert(`¿Quitar "${target.name}"?`, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          setRemoving(true);
          try {
            const result = await removeExercise(target);
            onClose();
            onRemoved?.(target, result);
          } catch (e) {
            Alert.alert('No se pudo quitar el ejercicio', (e as Error).message);
          } finally {
            setRemoving(false);
          }
        },
      },
    ]);
  }
  const stepList = parseInstructionsToSteps(exercise.instructions);
  const parent = exercise.parent_id ? allExercises.find((ex) => ex.id === exercise.parent_id) : null;
  const substitutes = findSubstitutes(exercise, allExercises);
  const extraEquipment = (exercise.extra_equipment ?? []).map(equipmentLabel);
  const facts = [
    { label: 'Tipo', value: exerciseTypeLabel(exercise.exercise_type) },
    { label: 'Cómo se mide', value: metricLabel(exercise.metric) },
    { label: 'Lateralidad', value: lateralityLabel(exercise.laterality) },
    { label: 'Patrón', value: patternLabel(exercise.movement_pattern) },
    { label: 'Equipo adicional', value: extraEquipment.length ? extraEquipment.join(', ') : null },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  function openCreateFrom(template: Partial<Exercise>) {
    onClose();
    onCreateFrom?.(template);
  }

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
                  <Text style={styles.muscleBadgeText}>{muscleLabel(exercise.muscle_group)}</Text>
                </View>
                <View style={styles.equipBadge}>
                  <Text style={styles.equipBadgeText}>{equipmentLabel(exercise.equipment)}</Text>
                </View>
                <View style={[styles.typeBadge, exercise.is_custom ? styles.customBadge : styles.globalBadge]}>
                  <Text style={[styles.typeBadgeText, exercise.is_custom ? styles.customBadgeText : styles.globalBadgeText]}>
                    {exercise.is_custom ? 'Personalizado' : 'Catálogo oficial'}
                  </Text>
                </View>
              </View>
              {secondaryLabels.length > 0 && (
                <Text style={styles.secondaryText}>También trabaja: {secondaryLabels.join(', ')}</Text>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <X size={s(18)} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Vídeo propio si lo hay; si no, las fotos de los pasos */}
            {exercise.video_path ? (
              <ExerciseVideo key={exercise.id} videoRef={exercise.video_path} height={s(190)} />
            ) : (
              <ExerciseImageCarousel
                key={exercise.id}
                images={exercise.images || (exercise.image_url ? [exercise.image_url] : null)}
                exerciseName={exercise.name}
                muscleGroup={exercise.muscle_group}
                height={s(170)}
              />
            )}

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
                    {equipmentLabel(exercise.equipment)}
                  </Text>
                </View>
              </View>
            </View>

            {facts.length > 0 && (
              <View style={styles.factsList}>
                {facts.map((f) => (
                  <View key={f.label} style={styles.factRow}>
                    <Text style={styles.factLabel}>{f.label}</Text>
                    <Text style={styles.factValue}>{f.value}</Text>
                  </View>
                ))}
                {parent && (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => onOpenExercise?.(parent)}
                    style={styles.factRow}
                  >
                    <Text style={styles.factLabel}>Variante de</Text>
                    <Text style={[styles.factValue, styles.factLink]} numberOfLines={1}>
                      {parent.name}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {(exercise.cues?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Indicaciones de sala</Text>
                <View style={styles.cuesRow}>
                  {exercise.cues!.map((cue) => (
                    <View key={cue} style={styles.cueChip}>
                      <Text style={styles.cueText}>«{cue}»</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {(exercise.contraindications?.length ?? 0) > 0 && (
              <View style={[styles.section, styles.warningSection]}>
                <View style={styles.sectionHeader}>
                  <AlertTriangle size={s(14)} color={colors.danger} />
                  <Text style={[styles.sectionTitle, styles.warningTitle]}>Evitar o adaptar si hay</Text>
                </View>
                <Text style={styles.warningText}>{exercise.contraindications!.join(' · ')}</Text>
              </View>
            )}

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

            {substitutes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Alternativas</Text>
                <Text style={styles.sectionHint}>
                  Ejercicios que trabajan el mismo movimiento. Úsalos si falta el equipo, la máquina está ocupada o el
                  cliente tiene molestias.
                </Text>
                {substitutes.map((sub) => (
                  <Pressable
                    key={sub.id}
                    accessibilityRole="button"
                    onPress={() => onOpenExercise?.(sub)}
                    disabled={!onOpenExercise}
                    style={styles.subRow}
                  >
                    <Text style={styles.subName} numberOfLines={1}>
                      {sub.name}
                    </Text>
                    <Text style={styles.subMeta}>
                      {sub.parent_id === exercise.id ? 'Variante' : muscleLabel(sub.muscle_group)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {onCreateFrom && !isDefaultFallback && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Crear a partir de este ejercicio</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openCreateFrom(variantTemplate(exercise))}
                  style={styles.createOption}
                >
                  <GitBranch size={s(16)} color={colors.navy} />
                  <View style={styles.createOptionTexts}>
                    <Text style={styles.createOptionTitle}>Crear una variante</Text>
                    <Text style={styles.createOptionText}>
                      El mismo movimiento con otro agarre, equipo o posición. Ej.: de «Sentadilla» a «Sentadilla
                      goblet». Se sugerirá como alternativa en las rutinas.
                    </Text>
                  </View>
                </Pressable>
                {!exercise.is_custom && !isSuperAdmin && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openCreateFrom(personalCopyTemplate(exercise))}
                    style={styles.createOption}
                  >
                    <Copy size={s(16)} color={colors.navy} />
                    <View style={styles.createOptionTexts}>
                      <Text style={styles.createOptionTitle}>Hacer mi versión</Text>
                      <Text style={styles.createOptionText}>
                        Una copia de este ejercicio oficial solo para ti, para ajustar la técnica, las indicaciones
                        o el vídeo a tu manera. El original no cambia.
                      </Text>
                    </View>
                  </Pressable>
                )}
              </View>
            )}
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
                  {isSuperAdmin && !exercise.is_custom ? 'Editar ejercicio oficial' : 'Editar ejercicio'}
                </Text>
              </Pressable>
            )}

            {canEdit && onRemoved && !isDefaultFallback && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quitar ejercicio del banco"
                onPress={handleRemove}
                disabled={removing}
                style={styles.removeBtn}
              >
                {removing ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <>
                    <Trash2 size={s(14)} color={colors.danger} />
                    <Text style={styles.removeBtnText}>Quitar del banco</Text>
                  </>
                )}
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
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    minHeight: 44,
    borderRadius: radius.input,
  },
  removeBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: fontSizes.xs,
    color: colors.danger,
  },
  factsList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: s(12),
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(12),
    minHeight: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  factLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  factValue: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.navy, textAlign: 'right' },
  factLink: { textDecorationLine: 'underline' },
  cuesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6), marginTop: s(6) },
  cueChip: {
    paddingHorizontal: s(10),
    paddingVertical: s(5),
    borderRadius: radius.chip,
    backgroundColor: colors.successBg,
  },
  cueText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.success },
  warningSection: { padding: s(10), borderRadius: radius.card, backgroundColor: colors.dangerBg },
  warningTitle: { color: colors.danger },
  warningText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.danger, marginTop: s(4) },
  sectionHint: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: s(2) },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  subName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.text },
  subMeta: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  createOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
    padding: s(10),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createOptionTexts: { flex: 1, gap: s(2) },
  createOptionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  createOptionText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, lineHeight: s(14) },
  secondaryText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: s(6),
  },
});
