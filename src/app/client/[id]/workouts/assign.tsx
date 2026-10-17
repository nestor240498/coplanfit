import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash2, Users } from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { toast } from '@/components/ui/Toast';
import { WorkoutStepper } from '@/features/workouts/components/WorkoutStepper';
import { lateralitySuffix, targetFieldLabel } from '@/features/workouts/prescription';
import { SingleExerciseExecution } from '@/features/workouts/types';
import { useWorkoutBuilderStore } from '@/features/workouts/workoutBuilderStore';
import { publishWorkoutPlan, saveWorkoutDraft } from '@/features/workouts/workoutsRepository';
import { friendlyError } from '@/lib/errors';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

/** «Reps», «Reps (por lado)», «Tiempo»… según cómo se mide el ejercicio. */
function targetLabel(ex: SingleExerciseExecution): string {
  const suffix = lateralitySuffix(ex.laterality);
  return suffix ? `${targetFieldLabel(ex.metric)} (${suffix})` : targetFieldLabel(ex.metric);
}

export default function WorkoutAssignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const routineName = useWorkoutBuilderStore((s) => s.routineName);
  const days = useWorkoutBuilderStore((s) => s.days);
  const notes = useWorkoutBuilderStore((s) => s.notes);
  const setNotes = useWorkoutBuilderStore((s) => s.setNotes);
  const updateBlock = useWorkoutBuilderStore((s) => s.updateBlock);
  const removeExerciseFromSuperset = useWorkoutBuilderStore((s) => s.removeExerciseFromSuperset);
  const resetBuilder = useWorkoutBuilderStore((s) => s.reset);

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const activeDay = days[activeDayIndex] || days[0];

  function handleUpdateSingleExercise(
    blockId: string,
    field: keyof SingleExerciseExecution,
    val: string
  ) {
    if (!activeDay) return;
    const block = activeDay.blocks.find((b) => b.id === blockId);
    if (block && block.type === 'single') {
      updateBlock(activeDay.id, blockId, {
        exercise: {
          ...block.exercise,
          [field]: val,
        },
      });
    }
  }

  function handleUpdateSupersetExercise(
    blockId: string,
    exIndex: number,
    field: keyof SingleExerciseExecution,
    val: string
  ) {
    if (!activeDay) return;
    const block = activeDay.blocks.find((b) => b.id === blockId);
    if (block && block.type === 'superset') {
      const updatedList = [...block.exercises];
      updatedList[exIndex] = {
        ...updatedList[exIndex],
        [field]: val,
      };
      updateBlock(activeDay.id, blockId, {
        exercises: updatedList,
      });
    }
  }

  async function handleSaveDraft() {
    if (!id || isSaving) return;
    setIsSaving(true);
    try {
      await saveWorkoutDraft(id, routineName, { weekly_schedule: days, notes: notes.trim() || undefined });
      toast({ message: 'Borrador guardado. Puedes retomarlo desde la ficha.', tone: 'success' });
      // Vuelve a la ficha ya abierta (sin apilar otra encima)
      router.dismissTo(`/client/${id}`);
    } catch (e) {
      toast({ message: `No se pudo guardar el borrador: ${friendlyError(e)}`, tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!id || isSaving) return;
    setIsSaving(true);
    try {
      const created = await publishWorkoutPlan(id, routineName, {
        weekly_schedule: days,
        notes: notes.trim() || undefined,
      });
      resetBuilder();
      // Se cierra el asistente y se abre la rutina publicada con su sello de «vigente»; «atrás» vuelve a la ficha
      router.dismissTo(`/client/${id}`);
      router.push(`/client/${id}/workouts/preview?versionId=${created.id}&published=1`);
    } catch (e) {
      toast({ message: `No se pudo publicar la rutina: ${friendlyError(e)}`, tone: 'danger' });
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title={routineName}
        subtitle="Configurar series, repeticiones y descansos"
        showBack
        breadcrumbs={[
          { label: 'Clientes', href: '/', icon: Users },
          { label: 'Cliente', href: `/client/${id}` },
          { label: 'Series & Reps' },
        ]}
      />

      <WorkoutStepper
        currentStep={3}
        onStepPress={(step) => {
          if (step === 1) router.push(`/client/${id}/workouts/new`);
          if (step === 2) router.push(`/client/${id}/workouts/assistant`);
        }}
      />

      {/* Selector de Días (Tabs horizontales) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daysBar}
        contentContainerStyle={styles.daysBarContent}
      >
        {days.map((day, idx) => {
          const isActive = idx === activeDayIndex;
          return (
            <Pressable
              key={day.id}
              onPress={() => setActiveDayIndex(idx)}
              style={[styles.dayTab, isActive && styles.dayTabActive]}
            >
              <Text style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>
                {day.day_name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Contenido del Día Activo */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeDay && (
          <>
            <View style={styles.dayHeaderRow}>
              <Text style={styles.dayTitle}>{activeDay.day_name}</Text>
              {activeDay.focus ? (
                <Text style={styles.dayFocus}>{activeDay.focus}</Text>
              ) : null}
            </View>

            {activeDay.blocks.map((block, bIdx) => {
              if (block.type === 'single') {
                return (
                  <View key={block.id} style={styles.blockCard}>
                    <View style={styles.blockTopLine}>
                      <View style={styles.numBadge}>
                        <Text style={styles.numBadgeText}>{bIdx + 1}</Text>
                      </View>
                      <Text style={styles.blockTitle}>{block.exercise.name}</Text>
                    </View>

                    {/* Inputs de series, reps, peso y descanso en una sola fila */}
                    <View style={styles.paramsRow}>
                      <View style={styles.paramBox}>
                        <Text style={styles.paramLabel}>Series</Text>
                        <TextInput
                          value={String(block.sets)}
                          onChangeText={(v) =>
                            updateBlock(activeDay.id, block.id, {
                              sets: parseInt(v.replace(/\D/g, ''), 10) || 1,
                            })
                          }
                          keyboardType="number-pad"
                          placeholder="4"
                          placeholderTextColor={colors.textMuted}
                          style={styles.paramInput}
                        />
                      </View>

                      <View style={styles.paramBox}>
                        <Text style={styles.paramLabel}>{targetLabel(block.exercise)}</Text>
                        <TextInput
                          value={block.exercise.reps}
                          onChangeText={(v) =>
                            handleUpdateSingleExercise(block.id, 'reps', v)
                          }
                          placeholder="8-10"
                          placeholderTextColor={colors.textMuted}
                          style={styles.paramInput}
                        />
                      </View>

                      <View style={styles.paramBox}>
                        <Text style={styles.paramLabel}>Peso</Text>
                        <TextInput
                          value={block.exercise.weight || ''}
                          onChangeText={(v) =>
                            handleUpdateSingleExercise(block.id, 'weight', v)
                          }
                          placeholder="60 kg"
                          placeholderTextColor={colors.textMuted}
                          style={styles.paramInput}
                        />
                      </View>

                      <View style={styles.paramBox}>
                        <Text style={styles.paramLabel}>Descanso</Text>
                        <TextInput
                          value={String(block.rest_seconds)}
                          onChangeText={(v) =>
                            updateBlock(activeDay.id, block.id, {
                              rest_seconds: parseInt(v.replace(/\D/g, ''), 10) || 60,
                            })
                          }
                          keyboardType="number-pad"
                          placeholder="90s"
                          placeholderTextColor={colors.textMuted}
                          style={styles.paramInput}
                        />
                      </View>
                    </View>

                    {/* Notas / Instrucciones técnicas */}
                    <View style={styles.notesWrap}>
                      <Text style={styles.paramLabel}>Instrucciones o notas</Text>
                      <TextInput
                        value={block.exercise.notes || ''}
                        onChangeText={(v) =>
                          handleUpdateSingleExercise(block.id, 'notes', v)
                        }
                        placeholder="Instrucciones técnicas (ej: Pausa de 1s en contracción…)"
                        placeholderTextColor={colors.textMuted}
                        style={styles.notesInput}
                      />
                    </View>
                  </View>
                );
              }

              // Bloque Superserie
              return (
                <View key={block.id} style={styles.supersetCard}>
                  <View style={styles.supersetHeaderRow}>
                    <View style={styles.supersetTag}>
                      <Text style={styles.supersetTagText}>⚡ SUPERSERIE</Text>
                    </View>
                    <View style={styles.supersetSetsWrap}>
                      <Text style={styles.supersetSetsLabel}>Series de la ronda:</Text>
                      <TextInput
                        value={String(block.sets)}
                        onChangeText={(v) =>
                          updateBlock(activeDay.id, block.id, {
                            sets: parseInt(v.replace(/\D/g, ''), 10) || 1,
                          })
                        }
                        keyboardType="number-pad"
                        style={styles.supersetSetsInput}
                      />
                    </View>
                  </View>

                  {/* Lista de ejercicios dentro de la superserie */}
                  {block.exercises.map((subEx, sIdx) => (
                    <View key={sIdx} style={styles.subExerciseCard}>
                      <View style={styles.subExTopRow}>
                        <View style={styles.subLetterCircle}>
                          <Text style={styles.subLetterText}>
                            {String.fromCharCode(65 + sIdx)}
                          </Text>
                        </View>
                        <Text style={styles.subExerciseName}>{subEx.name}</Text>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${subEx.name}`}
                          hitSlop={8}
                          onPress={() => removeExerciseFromSuperset(activeDay.id, block.id, sIdx)}
                          style={styles.deleteSubExBtn}
                        >
                          <Trash2 size={s(13)} color={colors.danger} />
                        </Pressable>
                      </View>

                      {/* Inputs en 2 columnas: Repeticiones y Peso */}
                      <View style={styles.subParamsGrid}>
                        <View style={styles.subParamCol}>
                          <Text style={styles.subParamLabel}>{targetLabel(subEx)}</Text>
                          <TextInput
                            value={subEx.reps}
                            onChangeText={(v) =>
                              handleUpdateSupersetExercise(block.id, sIdx, 'reps', v)
                            }
                            placeholder="12-15"
                            placeholderTextColor={colors.textMuted}
                            style={styles.subParamInput}
                          />
                        </View>

                        <View style={styles.subParamCol}>
                          <Text style={styles.subParamLabel}>Peso / Carga</Text>
                          <TextInput
                            value={subEx.weight || ''}
                            onChangeText={(v) =>
                              handleUpdateSupersetExercise(block.id, sIdx, 'weight', v)
                            }
                            placeholder="Ej: 10 kg"
                            placeholderTextColor={colors.textMuted}
                            style={styles.subParamInput}
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  <View style={styles.supersetRestRow}>
                    <Text style={styles.supersetRestLabel}>
                      Descanso tras completar ronda:
                    </Text>
                    <View style={styles.supersetRestInputWrap}>
                      <TextInput
                        value={String(block.rest_seconds)}
                        onChangeText={(v) =>
                          updateBlock(activeDay.id, block.id, {
                            rest_seconds: parseInt(v.replace(/\D/g, ''), 10) || 90,
                          })
                        }
                        keyboardType="number-pad"
                        style={styles.supersetRestInput}
                      />
                      <Text style={styles.supersetSecText}>seg</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Observaciones generales de la rutina */}
            <View style={styles.generalNotesBox}>
              <Text style={styles.generalNotesLabel}>
                Observaciones generales de la rutina
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Calentamiento previo, protocolo de movilidad, recomendaciones de hidratación…"
                placeholderTextColor={colors.textMuted}
                style={styles.generalNotesInput}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer con Botón de Guardar Borrador y Publicar */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <Button
            title="Guardar borrador"
            variant="secondary"
            onPress={handleSaveDraft}
            disabled={isSaving || days.length === 0}
            style={styles.draftBtn}
          />
          <Button
            title={isSaving ? 'Publicando…' : 'Publicar rutina'}
            onPress={handlePublish}
            disabled={isSaving || days.length === 0}
            style={styles.publishBtn}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  daysBar: {
    flexGrow: 0,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  daysBarContent: {
    paddingHorizontal: s(12),
    paddingVertical: s(8),
    alignItems: 'center',
    gap: s(6),
  },
  dayTab: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: s(10),
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTabActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  dayTabText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  dayTabTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: s(16), gap: s(12), paddingBottom: s(90) },
  dayHeaderRow: {
    gap: s(2),
  },
  dayTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.navy,
  },
  dayFocus: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  blockCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(8),
  },
  blockTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  numBadge: {
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  blockTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  paramsRow: {
    flexDirection: 'row',
    gap: s(6),
  },
  paramBox: {
    flex: 1,
    gap: s(2),
  },
  paramLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  paramInput: {
    backgroundColor: colors.background,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    height: s(32),
    paddingHorizontal: s(4),
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
    textAlign: 'center',
  },
  notesWrap: {
    gap: s(2),
  },
  notesInput: {
    backgroundColor: colors.background,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: s(8),
    paddingVertical: s(6),
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  supersetCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1.5,
    borderColor: colors.lime,
    gap: s(8),
  },
  supersetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(6),
  },
  supersetTag: {
    backgroundColor: colors.navy,
    paddingHorizontal: s(6),
    paddingVertical: s(2),
    borderRadius: radius.chip,
  },
  supersetTagText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.surface,
    letterSpacing: 0.5,
  },
  supersetSetsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
  },
  supersetSetsLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  supersetSetsInput: {
    backgroundColor: colors.background,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    width: s(32),
    height: s(24),
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
    textAlign: 'center',
    padding: 0,
  },
  subExerciseCard: {
    backgroundColor: colors.background,
    borderRadius: radius.input,
    padding: s(8),
    gap: s(6),
  },
  subExTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  subLetterCircle: {
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subLetterText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  subExerciseName: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  deleteSubExBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(2),
  },
  subParamsGrid: {
    flexDirection: 'row',
    gap: s(8),
  },
  subParamCol: {
    flex: 1,
    gap: s(2),
  },
  subParamLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  subParamInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    height: s(28),
    paddingHorizontal: s(6),
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
    textAlign: 'center',
  },
  supersetRestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: s(6),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: s(6),
  },
  supersetRestLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  supersetRestInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
  },
  supersetRestInput: {
    backgroundColor: colors.background,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    width: s(38),
    height: s(24),
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
    textAlign: 'center',
    padding: 0,
  },
  supersetSecText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  generalNotesBox: {
    marginTop: s(8),
    gap: s(4),
  },
  generalNotesLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  generalNotesInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: s(8),
    minHeight: s(60),
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: s(16),
    paddingVertical: s(12),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: s(8),
  },
  draftBtn: {
    flex: 1,
  },
  publishBtn: {
    flex: 1.4,
  },
});
