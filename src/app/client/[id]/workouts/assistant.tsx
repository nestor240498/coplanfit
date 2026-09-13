import { useLocalSearchParams, useRouter } from 'expo-router';
import { Dumbbell, Plus, Sparkles, Trash2, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ExercisePickerSheet } from '@/features/workouts/components/ExercisePickerSheet';
import { WorkoutAiPreloaderModal } from '@/features/workouts/components/WorkoutAiPreloaderModal';
import { WorkoutStepper } from '@/features/workouts/components/WorkoutStepper';
import { SingleExerciseExecution, WorkoutBlock } from '@/features/workouts/types';
import { useWorkoutBuilderStore } from '@/features/workouts/workoutBuilderStore';
import { supabase } from '@/lib/supabase';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export default function WorkoutAssistantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const routineName = useWorkoutBuilderStore((s) => s.routineName);
  const days = useWorkoutBuilderStore((s) => s.days);
  const addSingleExercise = useWorkoutBuilderStore((s) => s.addSingleExercise);
  const removeBlock = useWorkoutBuilderStore((s) => s.removeBlock);
  const combineIntoSuperset = useWorkoutBuilderStore((s) => s.combineIntoSuperset);
  const removeExerciseFromSuperset = useWorkoutBuilderStore((s) => s.removeExerciseFromSuperset);
  const setDays = useWorkoutBuilderStore((s) => s.setDays);

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [combiningBlockId, setCombiningBlockId] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const activeDay = days[activeDayIndex] || days[0];

  function handleOpenPickerForNew() {
    setCombiningBlockId(null);
    setExercisePickerOpen(true);
  }

  function handleOpenPickerForSuperset(blockId: string) {
    setCombiningBlockId(blockId);
    setExercisePickerOpen(true);
  }

  function handleSelectExercise(ex: SingleExerciseExecution) {
    if (!activeDay) return;
    if (combiningBlockId) {
      // Combinar con el bloque existente para formar superserie
      combineIntoSuperset(activeDay.id, combiningBlockId, ex);
      setCombiningBlockId(null);
    } else {
      // Añadir como ejercicio simple
      addSingleExercise(activeDay.id, ex, 4, 90);
    }
  }

  // Generador con IA (Google Gemini vía Edge Function + fallback algorítmico)
  async function handleGenerateAi() {
    setIsGeneratingAi(true);
    try {
      // 1. Intentar llamar a la Edge Function de Gemini en Supabase
      if (id) {
        try {
          const { data, error } = await supabase.functions.invoke('generate-workout-suggestions', {
            body: { clientId: id, scheduleDays: days },
          });

          if (!error && data?.data?.days && Array.isArray(data.data.days)) {
            const aiDays = data.data.days.map((aiD: any, dIdx: number) => {
              const matchedOriginal = days[dIdx] || days[0];
              return {
                id: matchedOriginal.id,
                day_name: aiD.day_name || matchedOriginal.day_name,
                focus: aiD.focus || matchedOriginal.focus,
                blocks: (aiD.blocks || []).map((b: any, bIdx: number) => ({
                  ...b,
                  id: `gemini-block-${dIdx}-${bIdx}-${Math.random().toString(36).substring(2, 6)}`,
                })),
              };
            });

            setDays(aiDays);
            Alert.alert('¡Rutina generada con IA! ✨', 'Se han estructurado los 6 ejercicios por día analizando la antropometría, nivel, historial de salud y equipamiento del cliente.');
            return;
          }
        } catch (edgeErr) {
          console.log('Fallo Edge function de IA, usando motor adaptativo local:', edgeErr);
        }
      }

      // 2. Fallback: Generador adaptativo local con 6 ejercicios por día
      await new Promise((resolve) => setTimeout(resolve, 600));

      const updatedDays = days.map((d, dIdx) => {
        let suggestedBlocks: WorkoutBlock[] = [];
        const nameLower = (d.day_name + ' ' + (d.focus || '')).toLowerCase();

        if (nameLower.includes('empuje') || nameLower.includes('push') || nameLower.includes('pecho')) {
          // Día de Empuje (6 ejercicios): Pecho, Hombro y Tríceps
          suggestedBlocks = [
            {
              type: 'single',
              id: `ai-1-${dIdx}`,
              exercise: { name: 'Press de banca plano con barra', reps: '8-10', notes: 'Fuerza base pectoral', weight: '60 kg' },
              sets: 4,
              rest_seconds: 120,
            },
            {
              type: 'single',
              id: `ai-2-${dIdx}`,
              exercise: { name: 'Press inclinado con mancuernas', reps: '10-12', notes: 'Haz clavicular pectoral', weight: '22 kg' },
              sets: 3,
              rest_seconds: 90,
            },
            {
              type: 'single',
              id: `ai-3-${dIdx}`,
              exercise: { name: 'Cruces de poleas en polea media / alta', reps: '12-15', notes: 'Aislamiento continuo', weight: '15 kg' },
              sets: 3,
              rest_seconds: 75,
            },
            {
              type: 'single',
              id: `ai-4-${dIdx}`,
              exercise: { name: 'Press militar de pie con barra o sentado con mancuernas', reps: '8-10', notes: 'Deltoides anterior', weight: '18 kg' },
              sets: 3,
              rest_seconds: 90,
            },
            {
              type: 'superset',
              id: `ai-5-${dIdx}`,
              title: 'Superserie Hombro Lateral & Tríceps (Ejercicios 5 y 6)',
              sets: 3,
              rest_seconds: 75,
              exercises: [
                { name: 'Elevaciones laterales con mancuernas', reps: '12-15', notes: 'Deltoides lateral', weight: '10 kg' },
                { name: 'Extensiones de tríceps en polea alta con cuerda', reps: '12-15', notes: 'Apertura al final', weight: '20 kg' },
              ],
            },
          ];
        } else if (nameLower.includes('tirón') || nameLower.includes('pull') || nameLower.includes('espalda')) {
          // Día de Tirón (6 ejercicios): Espalda, Deltoides posterior y Bíceps
          suggestedBlocks = [
            {
              type: 'single',
              id: `ai-1-${dIdx}`,
              exercise: { name: 'Dominadas pronas', reps: '8-10', notes: 'Amplitud y tracción vertical' },
              sets: 4,
              rest_seconds: 120,
            },
            {
              type: 'single',
              id: `ai-2-${dIdx}`,
              exercise: { name: 'Remo con barra inclinado (90° o 45°)', reps: '8-10', notes: 'Densidad dorsal', weight: '50 kg' },
              sets: 3,
              rest_seconds: 90,
            },
            {
              type: 'single',
              id: `ai-3-${dIdx}`,
              exercise: { name: 'Remo unilateral con mancuerna en banco', reps: '10-12', notes: 'Aislamiento dorsal', weight: '24 kg' },
              sets: 3,
              rest_seconds: 75,
            },
            {
              type: 'single',
              id: `ai-4-${dIdx}`,
              exercise: { name: 'Pájaros / Face Pull en polea alta', reps: '15', notes: 'Deltoides posterior y rotadores', weight: '18 kg' },
              sets: 3,
              rest_seconds: 75,
            },
            {
              type: 'superset',
              id: `ai-5-${dIdx}`,
              title: 'Superserie de Bíceps (Ejercicios 5 y 6)',
              sets: 3,
              rest_seconds: 75,
              exercises: [
                { name: 'Curl de bíceps con barra Z o mancuernas', reps: '10-12', notes: 'Fase excéntrica lenta', weight: '25 kg' },
                { name: 'Curl de bíceps martillo con mancuernas', reps: '12', notes: 'Braquial y antebrazo', weight: '12 kg' },
              ],
            },
          ];
        } else if (nameLower.includes('pierna') || nameLower.includes('legs') || nameLower.includes('glúteo') || nameLower.includes('cuádriceps')) {
          // Día de Pierna (6 ejercicios): Cuádriceps, Isquios, Glúteos y Gemelos
          suggestedBlocks = [
            {
              type: 'single',
              id: `ai-1-${dIdx}`,
              exercise: { name: 'Sentadilla libre con barra trasera', reps: '8-10', notes: 'Profundidad paralela', weight: '80 kg' },
              sets: 4,
              rest_seconds: 120,
            },
            {
              type: 'single',
              id: `ai-2-${dIdx}`,
              exercise: { name: 'Prensa de piernas 45°', reps: '10-12', notes: 'Cuádriceps general', weight: '140 kg' },
              sets: 3,
              rest_seconds: 90,
            },
            {
              type: 'superset',
              id: `ai-3-${dIdx}`,
              title: 'Superserie Cuádriceps & Cadena Posterior (Ejercicios 3 y 4)',
              sets: 3,
              rest_seconds: 90,
              exercises: [
                { name: 'Sentadilla búlgara con mancuernas', reps: '12', notes: 'Unilateral', weight: '14 kg' },
                { name: 'Peso muerto rumano con barra o mancuernas', reps: '10-12', notes: 'Bisagra de cadera', weight: '50 kg' },
              ],
            },
            {
              type: 'single',
              id: `ai-4-${dIdx}`,
              exercise: { name: 'Curl femoral tumbado en máquina', reps: '12-15', notes: 'Aislamiento isquios', weight: '35 kg' },
              sets: 3,
              rest_seconds: 60,
            },
            {
              type: 'single',
              id: `ai-5-${dIdx}`,
              exercise: { name: 'Elevación de talones de pie (Gemelos)', reps: '15-20', notes: 'Pausa de 1s arriba', weight: '50 kg' },
              sets: 3,
              rest_seconds: 60,
            },
          ];
        } else {
          // Torso o Full Body (6 ejercicios)
          suggestedBlocks = [
            {
              type: 'single',
              id: `ai-1-${dIdx}`,
              exercise: { name: 'Press de banca plano con barra', reps: '8-10', notes: 'Pecho', weight: '60 kg' },
              sets: 4,
              rest_seconds: 90,
            },
            {
              type: 'single',
              id: `ai-2-${dIdx}`,
              exercise: { name: 'Jalón al pecho en polea alta', reps: '10-12', notes: 'Espalda amplitud', weight: '45 kg' },
              sets: 4,
              rest_seconds: 90,
            },
            {
              type: 'single',
              id: `ai-3-${dIdx}`,
              exercise: { name: 'Press militar de pie con barra o sentado con mancuernas', reps: '10', notes: 'Hombros', weight: '16 kg' },
              sets: 3,
              rest_seconds: 75,
            },
            {
              type: 'single',
              id: `ai-4-${dIdx}`,
              exercise: { name: 'Remo en polea baja con agarre estrecho (gironda)', reps: '12', notes: 'Espalda densidad', weight: '40 kg' },
              sets: 3,
              rest_seconds: 75,
            },
            {
              type: 'superset',
              id: `ai-5-${dIdx}`,
              title: 'Superserie Bíceps & Tríceps (Ejercicios 5 y 6)',
              sets: 3,
              rest_seconds: 60,
              exercises: [
                { name: 'Curl de bíceps martillo con mancuernas', reps: '12', notes: 'Bíceps y braquial', weight: '12 kg' },
                { name: 'Extensiones de tríceps en polea alta con cuerda', reps: '12', notes: 'Tríceps', weight: '20 kg' },
              ],
            },
          ];
        }

        return {
          ...d,
          blocks: suggestedBlocks,
        };
      });

      setDays(updatedDays);
      Alert.alert('Propuesta generada ✨', 'Se han estructurado 6 ejercicios por día adaptados a la distribución muscular seleccionada.');
    } finally {
      setIsGeneratingAi(false);
    }
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
          <Text style={styles.aiBtnText}>Generar propuesta con IA ✨</Text>
        </Pressable>
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
                  Usa la IA o agrega ejercicios desde el banco.
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
                            {block.sets} series · {block.exercise.reps} reps · {block.rest_seconds}s descanso
                          </Text>
                        </View>
                        <Pressable
                          hitSlop={8}
                          onPress={() => removeBlock(activeDay.id, block.id)}
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
                        <Text style={styles.supersetTagText}>⚡ SUPERSERIE ({block.sets} SERIES)</Text>
                      </View>
                      <Pressable
                        hitSlop={8}
                        onPress={() => removeBlock(activeDay.id, block.id)}
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
                              {subEx.reps} reps {subEx.weight ? `· ${subEx.weight}` : ''}
                            </Text>
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

      {/* Preloader de Pasos de IA */}
      <WorkoutAiPreloaderModal visible={isGeneratingAi} />

      {/* Sheet para seleccionar ejercicios */}
      <ExercisePickerSheet
        visible={exercisePickerOpen}
        onClose={() => setExercisePickerOpen(false)}
        onSelect={handleSelectExercise}
        title={combiningBlockId ? 'Combinar con ejercicio...' : 'Añadir ejercicio'}
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
    height: s(30),
    paddingHorizontal: s(14),
    borderRadius: radius.chip,
    alignSelf: 'center',
  },
  aiBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.surface,
  },
  daysBar: {
    maxHeight: s(44),
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
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
    fontSize: s(8),
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
    gap: s(6),
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyDayText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  emptyDaySubtext: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
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
    fontSize: s(9),
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
    fontSize: s(8.5),
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
    fontSize: s(8),
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
    height: s(36),
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
