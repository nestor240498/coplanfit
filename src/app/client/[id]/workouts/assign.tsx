import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash2, Users } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
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
import { WorkoutStepper } from '@/features/workouts/components/WorkoutStepper';
import { SingleExerciseExecution } from '@/features/workouts/types';
import { useWorkoutBuilderStore } from '@/features/workouts/workoutBuilderStore';
import { supabase } from '@/lib/supabase';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

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
    if (!id) return;
    setIsSaving(true);
    try {
      // Guardar o reemplazar borrador
      await supabase
        .from('workout_plan_versions')
        .delete()
        .eq('client_id', id)
        .filter('data->>is_draft', 'eq', 'true');

      const { error } = await supabase.from('workout_plan_versions').insert({
        client_id: id,
        version: 0,
        name: `${routineName.trim() || 'Rutina'} (Borrador)`,
        is_current: false,
        data: {
          weekly_schedule: days,
          notes: notes.trim() || undefined,
          is_draft: true,
        },
      });

      if (error) throw new Error(error.message);

      Alert.alert('Borrador guardado 💾', 'Puedes continuar editando esta rutina en cualquier momento desde la ficha del cliente.', [
        { text: 'Ir a la ficha', onPress: () => router.replace(`/client/${id}`) },
      ]);
    } catch (e) {
      Alert.alert('Error al guardar borrador', (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!id) return;
    setIsSaving(true);
    try {
      // 1. Eliminar cualquier borrador previo
      await supabase
        .from('workout_plan_versions')
        .delete()
        .eq('client_id', id)
        .filter('data->>is_draft', 'eq', 'true');

      // 2. Obtener última versión existente para incrementar versión
      const { data: existingVersions } = await supabase
        .from('workout_plan_versions')
        .select('version')
        .eq('client_id', id)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = (existingVersions?.[0]?.version ?? 0) + 1;

      // 3. Marcar versiones anteriores como no vigentes
      await supabase
        .from('workout_plan_versions')
        .update({ is_current: false })
        .eq('client_id', id);

      // 4. Insertar nueva versión vigente
      const { error } = await supabase.from('workout_plan_versions').insert({
        client_id: id,
        version: nextVersion,
        name: routineName.trim() || `Rutina Versión ${nextVersion}`,
        is_current: true,
        data: {
          weekly_schedule: days,
          notes: notes.trim() || undefined,
          is_draft: false,
        },
      });

      if (error) throw new Error(error.message);

      resetBuilder();
      Alert.alert(
        '¡Rutina publicada! 🎉',
        `La versión ${nextVersion} del plan de entrenamiento ha sido asignada con éxito al asesorado.`,
        [
          {
            text: 'Ver ficha del cliente',
            onPress: () => router.replace(`/client/${id}`),
          },
        ]
      );
    } catch (e) {
      Alert.alert('Error al publicar rutina', (e as Error).message);
    } finally {
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

                    {/* Inputs de series, reps, peso, rir, descanso */}
                    <View style={styles.paramsGrid}>
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
                          style={styles.paramInput}
                        />
                      </View>

                      <View style={styles.paramBox}>
                        <Text style={styles.paramLabel}>Reps</Text>
                        <TextInput
                          value={block.exercise.reps}
                          onChangeText={(v) =>
                            handleUpdateSingleExercise(block.id, 'reps', v)
                          }
                          placeholder="10-12"
                          placeholderTextColor={colors.textMuted}
                          style={styles.paramInput}
                        />
                      </View>

                      <View style={styles.paramBox}>
                        <Text style={styles.paramLabel}>Peso / Carga</Text>
                        <TextInput
                          value={block.exercise.weight || ''}
                          onChangeText={(v) =>
                            handleUpdateSingleExercise(block.id, 'weight', v)
                          }
                          placeholder="Ej: 60 kg"
                          placeholderTextColor={colors.textMuted}
                          style={styles.paramInput}
                        />
                      </View>

                      <View style={styles.paramBox}>
                        <Text style={styles.paramLabel}>RIR / RPE</Text>
                        <TextInput
                          value={block.exercise.rir || ''}
                          onChangeText={(v) =>
                            handleUpdateSingleExercise(block.id, 'rir', v)
                          }
                          placeholder="1-2"
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

                    {/* Notas de ejecución */}
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
                );
              }

              // Bloque Superserie
              return (
                <View key={block.id} style={styles.supersetCard}>
                  <View style={styles.supersetHeaderRow}>
                    <View style={styles.supersetTag}>
                      <Text style={styles.supersetTagText}>⚡ SUPERSERIE COMBINADA</Text>
                    </View>
                    <View style={styles.supersetSetsWrap}>
                      <Text style={styles.supersetSetsLabel}>Series combinadas:</Text>
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
                    <View key={sIdx} style={styles.subExerciseRow}>
                      <View style={styles.subLetterCircle}>
                        <Text style={styles.subLetterText}>
                          {String.fromCharCode(65 + sIdx)}
                        </Text>
                      </View>
                      <View style={styles.subExerciseContent}>
                        <Text style={styles.subExerciseName}>{subEx.name}</Text>
                        <View style={styles.subParamsRow}>
                          <View style={styles.subParamMiniBox}>
                            <Text style={styles.subParamLabel}>Peso:</Text>
                            <TextInput
                              value={subEx.weight || ''}
                              onChangeText={(v) =>
                                handleUpdateSupersetExercise(block.id, sIdx, 'weight', v)
                              }
                              placeholder="Ej: 20kg"
                              placeholderTextColor={colors.textMuted}
                              style={styles.subParamInput}
                            />
                          </View>
                          <View style={styles.subParamMiniBox}>
                            <Text style={styles.subParamLabel}>Reps:</Text>
                            <TextInput
                              value={subEx.reps}
                              onChangeText={(v) =>
                                handleUpdateSupersetExercise(block.id, sIdx, 'reps', v)
                              }
                              placeholder="12"
                              style={styles.subParamInput}
                            />
                          </View>
                          <View style={styles.subParamMiniBox}>
                            <Text style={styles.subParamLabel}>RIR:</Text>
                            <TextInput
                              value={subEx.rir || ''}
                              onChangeText={(v) =>
                                handleUpdateSupersetExercise(block.id, sIdx, 'rir', v)
                              }
                              placeholder="1"
                              style={styles.subParamInput}
                            />
                          </View>
                        </View>
                      </View>
                      <Pressable
                        hitSlop={8}
                        onPress={() => removeExerciseFromSuperset(activeDay.id, block.id, sIdx)}
                        style={styles.deleteSubExBtn}
                      >
                        <Trash2 size={s(12)} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))}

                  <View style={styles.supersetRestRow}>
                    <Text style={styles.supersetRestLabel}>
                      Descanso tras completar ronda:
                    </Text>
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
                    <Text style={styles.supersetSecText}>segundos</Text>
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
    maxHeight: s(42),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  daysBarContent: {
    paddingHorizontal: s(12),
    alignItems: 'center',
    gap: s(6),
  },
  dayTab: {
    paddingVertical: s(6),
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
    fontSize: fontSizes.xs,
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
    fontSize: s(8.5),
    color: colors.navy,
  },
  blockTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  paramsGrid: {
    flexDirection: 'row',
    gap: s(6),
  },
  paramBox: {
    flex: 1,
    gap: s(2),
  },
  paramLabel: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  paramInput: {
    backgroundColor: colors.background,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    height: s(28),
    paddingHorizontal: s(6),
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: colors.background,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: s(8),
    paddingVertical: s(4),
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
  },
  supersetTag: {
    backgroundColor: colors.navy,
    paddingHorizontal: s(6),
    paddingVertical: s(2),
    borderRadius: radius.chip,
  },
  supersetTagText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
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
    width: s(28),
    height: s(24),
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
    textAlign: 'center',
    padding: 0,
  },
  subExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    backgroundColor: colors.background,
    borderRadius: radius.input,
    padding: s(6),
  },
  subLetterCircle: {
    width: s(16),
    height: s(16),
    borderRadius: s(8),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subLetterText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.navy,
  },
  deleteSubExBtn: {
    padding: s(4),
  },
  subExerciseContent: {
    flex: 1,
    gap: s(3),
  },
  subExerciseName: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  subParamsRow: {
    flexDirection: 'row',
    gap: s(8),
  },
  subParamMiniBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
  },
  subParamLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  subParamInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    width: s(45),
    height: s(20),
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
    textAlign: 'center',
    padding: 0,
  },
  supersetRestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    paddingTop: s(4),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  supersetRestLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  supersetRestInput: {
    backgroundColor: colors.background,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    width: s(36),
    height: s(22),
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
