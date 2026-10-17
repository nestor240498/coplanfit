import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Trash2, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getClient } from '@/features/clients/repository';
import { listTags } from '@/features/clients/tagsRepository';
import { Client, ClientTag } from '@/features/clients/types';
import { WorkoutStepper } from '@/features/workouts/components/WorkoutStepper';
import { MultiSelectField } from '@/features/workouts/components/ExerciseFormControls';
import {
  EQUIPMENT_OPTIONS,
  MUSCLE_GROUPS,
  MuscleGroup,
  TRAINING_GOALS,
  TRAINING_LEVELS,
  WorkoutDay,
} from '@/features/workouts/types';
import { useWorkoutBuilderStore } from '@/features/workouts/workoutBuilderStore';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type SplitDay = { name: string; focus: string; muscles: MuscleGroup[] };

const DEFAULT_SPLITS: Record<number, { name: string; days: SplitDay[] }> = {
  3: {
    name: 'Rutina Full Body (3 días)',
    days: [
      { name: 'Día 1: Full Body A', focus: 'Énfasis Cuádriceps y Pecho', muscles: ['cuadriceps', 'pecho', 'espalda', 'core'] },
      { name: 'Día 2: Full Body B', focus: 'Énfasis Isquios y Espalda', muscles: ['isquiotibiales', 'espalda', 'pecho', 'gluteos'] },
      { name: 'Día 3: Full Body C', focus: 'Énfasis Hombros y Brazos', muscles: ['hombros', 'biceps', 'triceps', 'cuadriceps'] },
    ],
  },
  4: {
    name: 'Rutina Torso / Pierna (4 días)',
    days: [
      { name: 'Día 1: Torso Pesado (Fuerza)', focus: 'Pecho, Espalda y Hombros', muscles: ['pecho', 'espalda', 'hombros'] },
      { name: 'Día 2: Pierna Completa', focus: 'Cuádriceps, Isquios y Gemelos', muscles: ['cuadriceps', 'isquiotibiales', 'gemelos'] },
      { name: 'Día 3: Torso Hipertrofia', focus: 'Pecho, Espalda y Brazos', muscles: ['pecho', 'espalda', 'biceps', 'triceps'] },
      { name: 'Día 4: Pierna y Glúteos', focus: 'Enfoque Isquios, Glúteos y Core', muscles: ['isquiotibiales', 'gluteos', 'core'] },
    ],
  },
  5: {
    name: 'Rutina Push / Pull / Legs + Torso / Pierna (5 días)',
    days: [
      { name: 'Día 1: Empuje (Push)', focus: 'Pecho, Hombro anterior/lateral y Tríceps', muscles: ['pecho', 'hombros', 'triceps'] },
      { name: 'Día 2: Tirón (Pull)', focus: 'Espalda, Hombro posterior y Bíceps', muscles: ['espalda', 'biceps', 'trapecio'] },
      { name: 'Día 3: Pierna (Legs)', focus: 'Cuádriceps, Isquios y Gemelos', muscles: ['cuadriceps', 'isquiotibiales', 'gemelos'] },
      { name: 'Día 4: Torso Completo', focus: 'Pecho, Espalda y Brazos', muscles: ['pecho', 'espalda', 'biceps', 'triceps'] },
      { name: 'Día 5: Pierna y Core', focus: 'Glúteos, Isquios y Abdomen', muscles: ['gluteos', 'isquiotibiales', 'core'] },
    ],
  },
};

/** Ejercicios por día sugeridos según la duración de sesión del cliente (~9 min por ejercicio). */
function suggestedExercisesPerDay(sessionMinutes: number | null | undefined): number {
  if (!sessionMinutes) return 6;
  return Math.min(10, Math.max(3, Math.round(sessionMinutes / 9)));
}

export default function NewWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [medicalTags, setMedicalTags] = useState<ClientTag[]>([]);

  const routineName = useWorkoutBuilderStore((s) => s.routineName);
  const days = useWorkoutBuilderStore((s) => s.days);
  const setRoutineName = useWorkoutBuilderStore((s) => s.setRoutineName);
  const addDay = useWorkoutBuilderStore((s) => s.addDay);
  const removeDay = useWorkoutBuilderStore((s) => s.removeDay);
  const updateDayName = useWorkoutBuilderStore((s) => s.updateDayName);
  const initBuilder = useWorkoutBuilderStore((s) => s.initBuilder);
  const setDayMuscles = useWorkoutBuilderStore((s) => s.setDayMuscles);
  const generation = useWorkoutBuilderStore((s) => s.generation);
  const setGeneration = useWorkoutBuilderStore((s) => s.setGeneration);

  useEffect(() => {
    if (!id) return;
    Promise.all([getClient(id), listTags(id)]).then(([c, tags]) => {
      setClient(c);
      setMedicalTags(tags.filter((t) => t.kind === 'condicion'));

      const freq = c.days_per_week || 4;
      const split = DEFAULT_SPLITS[freq] || DEFAULT_SPLITS[4];

      const initialDays: WorkoutDay[] = split.days.map((d, index) => ({
        id: `day-${Date.now()}-${index}`,
        day_name: d.name,
        focus: d.focus,
        muscles: d.muscles,
        blocks: [],
      }));

      initBuilder(id, split.name, initialDays);
      setGeneration({ exercisesPerDay: suggestedExercisesPerDay(c.session_duration_min) });
    });
  }, [id, initBuilder, setGeneration]);

  function handleContinue() {
    if (!id) return;
    router.push(`/client/${id}/workouts/assistant`);
  }

  const goalLabel = TRAINING_GOALS.find((g) => g.id === client?.training_goal)?.label || 'General / Hipertrofia';
  const levelLabel = TRAINING_LEVELS.find((l) => l.id === client?.training_level)?.label || 'Intermedio';
  const equipLabel = EQUIPMENT_OPTIONS.find((e) => e.id === client?.equipment_access)?.label || 'Gimnasio completo';

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title="Nueva rutina"
        subtitle={client ? client.full_name : ''}
        showBack
        breadcrumbs={[
          { label: 'Clientes', href: '/', icon: Users },
          { label: client?.full_name || 'Cliente', href: `/client/${id}` },
          { label: 'Nueva rutina' },
        ]}
      />

      <WorkoutStepper
        currentStep={1}
        onStepPress={(step) => {
          if (step === 2) router.push(`/client/${id}/workouts/assistant`);
          if (step === 3) router.push(`/client/${id}/workouts/assign`);
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Resumen del perfil fitness */}
        <View style={styles.clientProfileCard}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileTitle}>Perfil fitness del cliente</Text>
          </View>
          <View style={styles.profileRows}>
            <View style={styles.profileParamRow}>
              <Text style={styles.profileLabel}>Objetivo:</Text>
              <Text style={styles.profileValue}>{goalLabel}</Text>
            </View>
            <View style={styles.profileParamRow}>
              <Text style={styles.profileLabel}>Nivel:</Text>
              <Text style={styles.profileValue}>{levelLabel}</Text>
            </View>
            <View style={styles.profileParamRow}>
              <Text style={styles.profileLabel}>Equipamiento:</Text>
              <Text style={styles.profileValue}>{equipLabel}</Text>
            </View>
          </View>

          {medicalTags.length > 0 && (
            <View style={styles.medicalNotice}>
              <Text style={styles.medicalNoticeTitle}>Limitaciones / Lesiones médicas a considerar:</Text>
              <View style={styles.chipRow}>
                {medicalTags.map((t) => (
                  <Chip key={t.id} label={t.label} variant="neutral" />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Nombre de la rutina */}
        <View style={styles.inputGroup}>
          <Text style={styles.groupLabel}>Nombre de la rutina</Text>
          <TextInput
            value={routineName}
            onChangeText={setRoutineName}
            placeholder="Ej: Rutina Torso / Pierna Hipertrofia"
            placeholderTextColor={colors.textMuted}
            style={styles.nameInput}
          />
        </View>

        {/* Cómo arma la propuesta la IA */}
        <View style={styles.inputGroup}>
          <Text style={styles.groupLabel}>Propuesta de ejercicios</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingTexts}>
                <Text style={styles.settingTitle}>Ejercicios por día</Text>
                <Text style={styles.settingHint}>
                  {client?.session_duration_min
                    ? `Sugerido para sesiones de ${client.session_duration_min} min`
                    : 'Cuenta cada ejercicio de una superserie'}
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Menos ejercicios"
                  onPress={() => setGeneration({ exercisesPerDay: Math.max(1, generation.exercisesPerDay - 1) })}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{generation.exercisesPerDay}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Más ejercicios"
                  onPress={() => setGeneration({ exercisesPerDay: Math.min(12, generation.exercisesPerDay + 1) })}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingTexts}>
                <Text style={styles.settingTitle}>Permitir superseries</Text>
                <Text style={styles.settingHint}>Dos ejercicios seguidos sin descanso entre ellos</Text>
              </View>
              <Switch
                accessibilityLabel="Permitir superseries"
                value={generation.allowSupersets}
                onValueChange={(allowSupersets) => setGeneration({ allowSupersets })}
                trackColor={{ false: colors.border, true: colors.lime }}
                thumbColor={colors.surface}
                ios_backgroundColor={colors.border}
              />
            </View>
          </View>
        </View>

        {/* Distribución de días */}
        <View style={styles.daysSection}>
          <View style={styles.daysHeader}>
            <Text style={styles.groupLabel}>Días de entrenamiento ({days.length})</Text>
            <Pressable
              onPress={() => addDay(`Día ${days.length + 1}`, '', [])}
              style={styles.addDayBtn}
            >
              <Plus size={s(12)} color={colors.navy} strokeWidth={2.5} />
              <Text style={styles.addDayBtnText}>Agregar día</Text>
            </Pressable>
          </View>

          {days.map((day, index) => (
            <View key={day.id} style={styles.dayCard}>
              <View style={styles.dayTopRow}>
                <TextInput
                  value={day.day_name}
                  onChangeText={(text) => updateDayName(day.id, text, day.focus)}
                  style={styles.dayNameInput}
                  placeholder={`Día ${index + 1}`}
                  placeholderTextColor={colors.textMuted}
                />
                {days.length > 1 && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${day.day_name}`}
                    hitSlop={8}
                    onPress={() => removeDay(day.id)}
                    style={styles.removeDayBtn}
                  >
                    <Trash2 size={s(13)} color={colors.danger} />
                  </Pressable>
                )}
              </View>
              <TextInput
                value={day.focus}
                onChangeText={(focus) => updateDayName(day.id, day.day_name, focus)}
                style={styles.dayFocusInput}
                placeholder="Descripción (ej: Fuerza, énfasis en pecho)"
                placeholderTextColor={colors.textMuted}
              />
              <View style={styles.musclesField}>
                <MultiSelectField
                  label="Músculos del día"
                  options={MUSCLE_GROUPS}
                  values={day.muscles ?? []}
                  onChange={(muscles) => setDayMuscles(day.id, muscles)}
                  empty="Toca para elegir"
                  sheetTitle={`Músculos · ${day.day_name}`}
                  sheetHint="La propuesta de ejercicios usará estos músculos."
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer con CTA */}
      <View style={styles.footer}>
        <Button
          title="Continuar a selección de ejercicios"
          onPress={handleContinue}
          disabled={days.length === 0 || routineName.trim().length === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: s(16), gap: s(14), paddingBottom: s(100) },
  musclesField: { marginTop: s(8) },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: s(12),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    minHeight: 56,
    paddingVertical: s(6),
  },
  settingTexts: { flex: 1 },
  settingTitle: { fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.navy },
  settingHint: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: s(2) },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.base, color: colors.navy },
  stepperValue: {
    minWidth: s(24),
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    color: colors.navy,
  },
  clientProfileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(12),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(8),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: s(6),
  },
  profileTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  profileRows: {
    gap: s(4),
  },
  profileParamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: s(2),
  },
  profileLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  profileValue: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  medicalNotice: {
    marginTop: s(4),
    paddingTop: s(6),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: s(4),
  },
  medicalNoticeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.danger,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(4),
  },
  inputGroup: {
    gap: s(4),
  },
  groupLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: s(12),
    height: s(38),
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  daysSection: {
    gap: s(8),
  },
  daysHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    paddingVertical: s(2),
    paddingHorizontal: s(6),
  },
  addDayBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(6),
  },
  dayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(6),
  },
  dayNameInput: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.navy,
    padding: 0,
  },
  removeDayBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(4),
  },
  dayFocusInput: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    borderRadius: radius.input,
    paddingHorizontal: s(8),
    height: s(28),
    borderWidth: 1,
    borderColor: colors.border,
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
