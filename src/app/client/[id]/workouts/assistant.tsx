import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeftRight, Dumbbell, Plus, Sparkles, Trash2, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { friendlyError, isQuotaError } from '@/lib/errors';
import { hapticSuccess } from '@/lib/motion';
import { AiProgressModal } from '@/components/ui/AiProgressModal';
import { AppBackground } from '@/components/ui/AppBackground';
import { toast, toastWithUndo } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AiQuotaHint } from '@/features/ai/components/AiQuotaHint';
import { quotaHint, useAiQuota } from '@/features/ai/quota';
import { getClient } from '@/features/clients/repository';
import { listTags } from '@/features/clients/tagsRepository';
import { ExercisePickerSheet } from '@/features/workouts/components/ExercisePickerSheet';
import { SwapExerciseSheet } from '@/features/workouts/components/SwapExerciseSheet';
import { WorkoutStepper } from '@/features/workouts/components/WorkoutStepper';
import { getExercises } from '@/features/workouts/exerciseService';
import { formatPrescription } from '@/features/workouts/prescription';
import { generateRoutineWithAi } from '@/features/workouts/routineAi';
import {
  buildRoutineFromBank,
  ClientTrainingContext,
  conflictingContraindications,
  describeMissing,
  eligibleExercises,
  missingMuscles,
  replaceExecution,
  suggestReplacements,
} from '@/features/workouts/routineGenerator';
import { Exercise, SingleExerciseExecution, WorkoutDay } from '@/features/workouts/types';
import { useWorkoutBuilderStore } from '@/features/workouts/workoutBuilderStore';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

type SwapTarget = { blockId: string; exIndex: number | null; execution: SingleExerciseExecution };

function countExercises(days: WorkoutDay[]): number {
  return days.reduce(
    (acc, d) => acc + d.blocks.reduce((n, b) => n + (b.type === 'superset' ? b.exercises.length : 1), 0),
    0
  );
}

export default function WorkoutAssistantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const routineName = useWorkoutBuilderStore((s) => s.routineName);
  const days = useWorkoutBuilderStore((s) => s.days);
  const generation = useWorkoutBuilderStore((s) => s.generation);
  const addSingleExercise = useWorkoutBuilderStore((s) => s.addSingleExercise);
  const removeBlock = useWorkoutBuilderStore((s) => s.removeBlock);
  const replaceExercise = useWorkoutBuilderStore((s) => s.replaceExercise);
  const combineIntoSuperset = useWorkoutBuilderStore((s) => s.combineIntoSuperset);
  const removeExerciseFromSuperset = useWorkoutBuilderStore((s) => s.removeExerciseFromSuperset);
  const setDays = useWorkoutBuilderStore((s) => s.setDays);

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [combiningBlockId, setCombiningBlockId] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [bank, setBank] = useState<Exercise[]>([]);
  const quota = useAiQuota((st) => st.quota);
  const refreshQuota = useAiQuota((st) => st.refresh);
  const [clientName, setClientName] = useState<string | undefined>();
  const [trainingCtx, setTrainingCtx] = useState<ClientTrainingContext>({ conditions: [] });
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null);
  const [replacingFromBank, setReplacingFromBank] = useState<SwapTarget | null>(null);

  const activeDay = days[activeDayIndex] || days[0];
  const eligibleCount = eligibleExercises(bank, trainingCtx).length;

  useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);

  useEffect(() => {
    if (!id) return;
    Promise.all([getExercises(), getClient(id), listTags(id)])
      .then(([exercises, client, tags]) => {
        setBank(exercises);
        setClientName(client.full_name);
        setTrainingCtx({
          equipmentAccess: client.equipment_access,
          conditions: tags.filter((t) => t.kind === 'condicion').map((t) => t.label),
        });
      })
      .catch((e: Error) =>
        toast({ message: `No se pudo cargar el banco de ejercicios: ${friendlyError(e)}`, tone: 'danger' })
      );
  }, [id]);

  const bankById = new Map(bank.map((ex) => [ex.id, ex]));

  /** Contraindicaciones del ejercicio que chocan con la salud del cliente. */
  function warningsFor(execution: SingleExerciseExecution): string[] {
    const ex = execution.exercise_id ? bankById.get(execution.exercise_id) : undefined;
    return ex ? conflictingContraindications(ex, trainingCtx.conditions) : [];
  }

  function idsInActiveDay(): string[] {
    return (activeDay?.blocks ?? []).flatMap((b) =>
      (b.type === 'superset' ? b.exercises : [b.exercise]).map((e) => e.exercise_id).filter((x): x is string => !!x)
    );
  }

  // Quitar es inmediato y reversible: se guarda la rutina anterior para «Deshacer»
  function handleRemoveBlock(blockId: string) {
    if (!activeDay) return;
    const previous = useWorkoutBuilderStore.getState().days;
    const block = activeDay.blocks.find((b) => b.id === blockId);
    removeBlock(activeDay.id, blockId);
    const label = block?.type === 'single' ? `«${block.exercise.name}» quitado` : 'Superserie quitada';
    toastWithUndo(label, () => setDays(previous));
  }

  function handleRemoveFromSuperset(blockId: string, index: number, name: string) {
    if (!activeDay) return;
    const previous = useWorkoutBuilderStore.getState().days;
    removeExerciseFromSuperset(activeDay.id, blockId, index);
    toastWithUndo(`«${name}» quitado de la superserie`, () => setDays(previous));
  }

  function handleOpenPickerForNew() {
    setCombiningBlockId(null);
    setReplacingFromBank(null);
    setExercisePickerOpen(true);
  }

  function handleOpenPickerForSuperset(blockId: string) {
    setCombiningBlockId(blockId);
    setReplacingFromBank(null);
    setExercisePickerOpen(true);
  }

  function handleSelectExercise(ex: SingleExerciseExecution) {
    if (!activeDay) return;
    if (replacingFromBank) {
      const next = ex.exercise_id ? bankById.get(ex.exercise_id) : undefined;
      replaceExercise(
        activeDay.id,
        replacingFromBank.blockId,
        replacingFromBank.exIndex,
        next ? replaceExecution(replacingFromBank.execution, next) : ex
      );
      setReplacingFromBank(null);
    } else if (combiningBlockId) {
      combineIntoSuperset(activeDay.id, combiningBlockId, ex);
      setCombiningBlockId(null);
    } else {
      addSingleExercise(activeDay.id, ex, 3, 90);
    }
  }

  function handleChooseReplacement(next: Exercise) {
    if (!activeDay || !swapTarget) return;
    replaceExercise(activeDay.id, swapTarget.blockId, swapTarget.exIndex, replaceExecution(swapTarget.execution, next));
    setSwapTarget(null);
  }

  function handleBrowseBankForSwap() {
    setReplacingFromBank(swapTarget);
    setSwapTarget(null);
    setCombiningBlockId(null);
    setExercisePickerOpen(true);
  }

  async function runGeneration() {
    if (!id) return;
    const eligible = eligibleExercises(bank, trainingCtx);
    setIsGeneratingAi(true);
    try {
      let proposal: WorkoutDay[];
      let fromAi = true;
      let quotaMessage: string | null = null;
      try {
        proposal = await generateRoutineWithAi(id, days, eligible, generation);
        if (countExercises(proposal) === 0) throw new Error('La IA no propuso ejercicios.');
      } catch (aiError) {
        // Sin IA: la propuesta se arma igualmente con el banco (músculos de cada día)
        proposal = buildRoutineFromBank(days, eligible, generation);
        fromAi = false;
        if (isQuotaError(aiError)) quotaMessage = (aiError as Error).message;
      }
      setDays(proposal);
      const total = countExercises(proposal);
      if (fromAi) {
        hapticSuccess();
        toast({
          message: `Propuesta lista: ${total} ejercicios de tu banco. Cambia los que quieras.`,
          tone: 'success',
        });
      } else {
        toast({
          message:
            quotaMessage ??
            `La IA no respondió, así que elegimos ${total} ejercicios de tu banco según los músculos de cada día.`,
          duration: 5000,
        });
      }
    } finally {
      setIsGeneratingAi(false);
      refreshQuota();
    }
  }

  /** Propuesta sin IA, solo con el banco (cuando se agotaron las generaciones). */
  function runBankProposal() {
    const proposal = buildRoutineFromBank(days, eligibleExercises(bank, trainingCtx), generation);
    setDays(proposal);
    toast({ message: `Elegimos ${countExercises(proposal)} ejercicios de tu banco según los músculos de cada día.` });
  }

  function handleGenerateAi() {
    if (bank.length === 0) {
      toast('Un momento: aún se está cargando tu banco de ejercicios.');
      return;
    }
    const eligible = eligibleExercises(bank, trainingCtx);
    if (eligible.length === 0) {
      Alert.alert(
        'Sin ejercicios disponibles',
        'Ningún ejercicio del banco encaja con el equipo y la salud de este cliente. Añade ejercicios al banco primero.'
      );
      return;
    }

    const blocked = quotaHint(quota);
    if (blocked?.blocked) {
      Alert.alert('Sin generaciones con IA', `${blocked.text}\n\nMientras tanto puedes armar la propuesta con tu banco, sin IA.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Armar con mi banco', onPress: runBankProposal },
      ]);
      return;
    }

    const warnings: string[] = [];
    if (days.some((d) => !d.muscles?.length)) {
      warnings.push('Hay días sin músculos marcados: vuelve al paso 1 para indicarlos y la propuesta será más precisa.');
    }
    const missing = missingMuscles(days, eligible);
    if (missing.length > 0) {
      warnings.push(
        `Tu banco no tiene ejercicios de ${describeMissing(missing)} que este cliente pueda hacer. Esos músculos quedarán sin ejercicios; puedes crearlos en el banco.`
      );
    }
    const replacesExisting = countExercises(days) > 0;
    if (replacesExisting) warnings.push('La propuesta reemplazará los ejercicios que ya elegiste.');

    if (warnings.length === 0) {
      runGeneration();
      return;
    }
    Alert.alert('Antes de generar', warnings.join('\n\n'), [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Generar igualmente', onPress: runGeneration },
    ]);
  }

  function handleContinue() {
    if (!id) return;
    router.push(`/client/${id}/workouts/assign`);
  }

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title={routineName}
        subtitle="Selección de ejercicios"
        showBack
        breadcrumbs={[
          { label: 'Clientes', href: '/', icon: Users },
          { label: 'Cliente', href: `/client/${id}` },
          { label: 'Ejercicios' },
        ]}
      />

      <WorkoutStepper
        currentStep={2}
        onStepPress={(step) => {
          if (step === 1) router.push(`/client/${id}/workouts/new`);
          if (step === 3) router.push(`/client/${id}/workouts/assign`);
        }}
      />

      {/* Botón de Generar con IA */}
      <View style={styles.aiBanner}>
        <Pressable
          onPress={handleGenerateAi}
          disabled={isGeneratingAi}
          style={styles.aiBtn}
        >
          <Sparkles size={s(12)} color={colors.surface} />
          <Text style={styles.aiBtnText}>
            Proponer {generation.exercisesPerDay} ejercicios por día con IA
          </Text>
        </Pressable>
        <AiQuotaHint quota={quota} style={styles.quotaHint} />
      </View>

      {/* Selector de Días (Tabs horizontales) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daysBar}
        contentContainerStyle={styles.daysBarContent}
      >
        {days.map((day, idx) => {
          const isActive = idx === activeDayIndex;
          const totalExercises = day.blocks.reduce(
            (acc, b) => acc + (b.type === 'superset' ? b.exercises.length : 1),
            0
          );

          return (
            <Pressable
              key={day.id}
              onPress={() => setActiveDayIndex(idx)}
              style={[styles.dayTab, isActive && styles.dayTabActive]}
            >
              <Text style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>
                {day.day_name}
              </Text>
              <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                <Text style={styles.countBadgeText}>{totalExercises}</Text>
              </View>
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
            <View style={styles.dayInfoBanner}>
              <Text style={styles.dayInfoTitle}>{activeDay.day_name}</Text>
              {activeDay.focus ? (
                <Text style={styles.dayInfoFocus}>{activeDay.focus}</Text>
              ) : null}
            </View>

            {activeDay.blocks.length === 0 ? (
              <View style={styles.emptyDayBox}>
                <Dumbbell size={s(28)} color={colors.border} />
                <Text style={styles.emptyDayText}>
                  Aún no has agregado ejercicios a este día.
                </Text>
                <Text style={styles.emptyDaySubtext}>
                  Genera una propuesta con IA o añade ejercicios desde el banco.
                </Text>
              </View>
            ) : (
              activeDay.blocks.map((block, bIdx) => {
                if (block.type === 'single') {
                  return (
                    <View key={block.id} style={styles.exerciseCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.exIndexCircle}>
                          <Text style={styles.exIndexText}>{bIdx + 1}</Text>
                        </View>
                        <View style={styles.cardTitleWrap}>
                          <Text style={styles.exerciseTitle}>{block.exercise.name}</Text>
                          <Text style={styles.exerciseMeta}>
                            {block.sets} series · {formatPrescription(block.exercise)} · {block.rest_seconds}s descanso
                          </Text>
                          {warningsFor(block.exercise).length > 0 && (
                            <View style={styles.warningRow}>
                              <AlertTriangle size={s(12)} color={colors.danger} />
                              <Text style={styles.warningText}>
                                Contraindicado: {warningsFor(block.exercise).join(', ')}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Cambiar ${block.exercise.name}`}
                          onPress={() => setSwapTarget({ blockId: block.id, exIndex: null, execution: block.exercise })}
                          style={styles.swapBtn}
                        >
                          <ArrowLeftRight size={s(14)} color={colors.navy} />
                        </Pressable>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${block.exercise.name}`}
                          hitSlop={8}
                          onPress={() => handleRemoveBlock(block.id)}
                          style={styles.deleteBtn}
                        >
                          <Trash2 size={s(13)} color={colors.danger} />
                        </Pressable>
                      </View>

                      {/* Botón para convertir en Superserie */}
                      <Pressable
                        onPress={() => handleOpenPickerForSuperset(block.id)}
                        style={styles.combineBtn}
                      >
                        <Plus size={s(11)} color={colors.navy} strokeWidth={2.5} />
                        <Text style={styles.combineBtnText}>Combinar en Superserie (+)</Text>
                      </Pressable>
                    </View>
                  );
                }

                // Bloque Superserie
                return (
                  <View key={block.id} style={styles.supersetCard}>
                    <View style={styles.supersetHeader}>
                      <View style={styles.supersetTag}>
                        <Text style={styles.supersetTagText}>SUPERSERIE · {block.sets} SERIES</Text>
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel="Quitar superserie"
                        hitSlop={8}
                        onPress={() => handleRemoveBlock(block.id)}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={s(13)} color={colors.danger} />
                      </Pressable>
                    </View>

                    <View style={styles.supersetExercisesList}>
                      {block.exercises.map((subEx, sIdx) => (
                        <View key={sIdx} style={styles.supersetItemRow}>
                          <View style={styles.subIndexCircle}>
                            <Text style={styles.subIndexText}>
                              {String.fromCharCode(65 + sIdx)}
                            </Text>
                          </View>
                          <View style={styles.subInfoWrap}>
                            <Text style={styles.subExName}>{subEx.name}</Text>
                            <Text style={styles.subExReps}>
                              {formatPrescription(subEx)} {subEx.weight ? `· ${subEx.weight}` : ''}
                            </Text>
                            {warningsFor(subEx).length > 0 && (
                              <View style={styles.warningRow}>
                                <AlertTriangle size={s(12)} color={colors.danger} />
                                <Text style={styles.warningText}>Contraindicado: {warningsFor(subEx).join(', ')}</Text>
                              </View>
                            )}
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Cambiar ${subEx.name}`}
                            onPress={() => setSwapTarget({ blockId: block.id, exIndex: sIdx, execution: subEx })}
                            style={styles.swapBtn}
                          >
                            <ArrowLeftRight size={s(13)} color={colors.navy} />
                          </Pressable>
                          <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${subEx.name} de la superserie`}
                            hitSlop={8}
                            onPress={() => handleRemoveFromSuperset(block.id, sIdx, subEx.name)}
                            style={styles.deleteSubExBtn}
                          >
                            <Trash2 size={s(12)} color={colors.danger} />
                          </Pressable>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.supersetRestNote}>
                      Descanso: {block.rest_seconds}s al terminar cada ronda combinada
                    </Text>

                    <Pressable
                      onPress={() => handleOpenPickerForSuperset(block.id)}
                      style={styles.addMoreToSupersetBtn}
                    >
                      <Plus size={s(10)} color={colors.navy} />
                      <Text style={styles.addMoreToSupersetText}>Agregar otro ejercicio a la superserie</Text>
                    </Pressable>
                  </View>
                );
              })
            )}

            {/* Botón para añadir ejercicio nuevo */}
            <Pressable onPress={handleOpenPickerForNew} style={styles.addExerciseCta}>
              <Plus size={s(13)} color={colors.success} strokeWidth={2.5} />
              <Text style={styles.addExerciseCtaText}>Añadir ejercicio del banco</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <AiProgressModal
        visible={isGeneratingAi}
        title="Proponiendo la rutina"
        clientName={clientName}
        inputs={[
          `${days.length} ${days.length === 1 ? 'día' : 'días'} · ${generation.exercisesPerDay} ejercicios por día`,
          `${eligibleCount} ejercicios de tu banco aptos para su equipo y su salud`,
          generation.allowSupersets ? 'Superseries permitidas' : 'Sin superseries',
          'Objetivo, condiciones y última medición de su ficha',
        ]}
        slowHint="Está tardando más de lo normal. Si no responde, armaremos la propuesta con tu banco."
      />

      {/* Sheet para seleccionar ejercicios */}
      <ExercisePickerSheet
        visible={exercisePickerOpen}
        onClose={() => setExercisePickerOpen(false)}
        onSelect={handleSelectExercise}
        title={
          replacingFromBank ? 'Cambiar por…' : combiningBlockId ? 'Combinar con ejercicio…' : 'Añadir ejercicio'
        }
        trainingContext={trainingCtx}
      />

      <SwapExerciseSheet
        visible={swapTarget != null}
        onClose={() => setSwapTarget(null)}
        currentName={swapTarget?.execution.name ?? ''}
        suggestions={
          swapTarget ? suggestReplacements(swapTarget.execution, bank, trainingCtx, idsInActiveDay()) : []
        }
        onChoose={handleChooseReplacement}
        onBrowseBank={handleBrowseBankForSwap}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Continuar a configurar series y reps"
          onPress={handleContinue}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: s(4), marginTop: s(4) },
  warningText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.danger },
  screen: { flex: 1, backgroundColor: colors.background },
  aiBanner: {
    paddingHorizontal: s(16),
    paddingTop: s(6),
    paddingBottom: s(6),
    alignItems: 'center',
  },
  aiBtn: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    minHeight: 44,
    paddingHorizontal: s(14),
    borderRadius: radius.chip,
    alignSelf: 'center',
  },
  quotaHint: { marginTop: s(6), alignSelf: 'stretch' },
  aiBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.surface,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
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
  countBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: s(5),
    paddingVertical: 1,
    borderRadius: radius.chip,
  },
  countBadgeActive: {
    backgroundColor: colors.lime,
  },
  countBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  countBadgeTextActive: {
    color: colors.navy,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: s(16), gap: s(10), paddingBottom: s(90) },
  dayInfoBanner: {
    gap: s(2),
  },
  dayInfoTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.navy,
  },
  dayInfoFocus: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  emptyDayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(28),
    paddingHorizontal: s(20),
    gap: s(6),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyDayText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.text,
    textAlign: 'center',
  },
  emptyDaySubtext: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(8),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  exIndexCircle: {
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exIndexText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  cardTitleWrap: {
    flex: 1,
    gap: s(2),
  },
  exerciseTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  exerciseMeta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(4),
  },
  combineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(4),
    paddingVertical: s(4),
    backgroundColor: colors.background,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  combineBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  supersetCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1.5,
    borderColor: colors.lime,
    gap: s(8),
  },
  supersetHeader: {
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
    fontSize: fontSizes.label,
    color: colors.surface,
    letterSpacing: 0.5,
  },
  supersetExercisesList: {
    gap: s(6),
  },
  supersetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    paddingVertical: s(4),
    paddingHorizontal: s(6),
    backgroundColor: colors.background,
    borderRadius: radius.input,
  },
  subIndexCircle: {
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subIndexText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  subInfoWrap: {
    flex: 1,
  },
  subExName: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  subExReps: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  deleteSubExBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(4),
  },
  supersetRestNote: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  addMoreToSupersetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(4),
    paddingVertical: s(3),
  },
  addMoreToSupersetText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  addExerciseCta: {
    minHeight: 44,
    flexDirection: 'row',
    gap: s(6),
    borderRadius: radius.input,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(4),
  },
  addExerciseCtaText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.success,
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
});
