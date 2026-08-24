import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Trash2, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getClient } from '@/features/clients/repository';
import { listTags } from '@/features/clients/tagsRepository';
import { Client, ClientTag } from '@/features/clients/types';
import { WorkoutStepper } from '@/features/workouts/components/WorkoutStepper';
import {
  EQUIPMENT_OPTIONS,
  TRAINING_GOALS,
  TRAINING_LEVELS,
  WorkoutDay,
} from '@/features/workouts/types';
import { useWorkoutBuilderStore } from '@/features/workouts/workoutBuilderStore';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

const DEFAULT_SPLITS: Record<number, { name: string; days: { name: string; focus: string }[] }> = {
  3: {
    name: 'Rutina Full Body (3 días)',
    days: [
      { name: 'Día 1: Full Body A', focus: 'Énfasis Cuádriceps y Pecho' },
      { name: 'Día 2: Full Body B', focus: 'Énfasis Isquios y Espalda' },
      { name: 'Día 3: Full Body C', focus: 'Énfasis Hombros y Brazos' },
    ],
  },
  4: {
    name: 'Rutina Torso / Pierna (4 días)',
    days: [
      { name: 'Día 1: Torso Pesado (Fuerza)', focus: 'Pecho, Espalda y Hombros' },
      { name: 'Día 2: Pierna Completa', focus: 'Cuádriceps, Isquios y Gemelos' },
      { name: 'Día 3: Torso Hipertrofia', focus: 'Pecho, Espalda y Brazos' },
      { name: 'Día 4: Pierna y Glúteos', focus: 'Enfoque Isquios, Glúteos y Core' },
    ],
  },
  5: {
    name: 'Rutina Push / Pull / Legs + Torso / Pierna (5 días)',
    days: [
      { name: 'Día 1: Empuje (Push)', focus: 'Pecho, Hombro anterior/lateral y Tríceps' },
      { name: 'Día 2: Tirón (Pull)', focus: 'Espalda, Hombro posterior y Bíceps' },
      { name: 'Día 3: Pierna (Legs)', focus: 'Cuádriceps, Isquios y Gemelos' },
      { name: 'Día 4: Torso Completo', focus: 'Pecho, Espalda y Brazos' },
      { name: 'Día 5: Pierna y Core', focus: 'Glúteos, Isquios y Abdomen' },
    ],
  },
};

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
        blocks: [],
      }));

      initBuilder(id, split.name, initialDays);
    });
  }, [id, initBuilder]);

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

        {/* Distribución de días */}
        <View style={styles.daysSection}>
          <View style={styles.daysHeader}>
            <Text style={styles.groupLabel}>Días de entrenamiento ({days.length})</Text>
            <Pressable
              onPress={() => addDay(`Día ${days.length + 1}`, 'Enfoque muscular')}
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
                  <Pressable
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
                placeholder="Enfoque muscular (ej: Pecho, Hombro, Tríceps)"
                placeholderTextColor={colors.textMuted}
              />
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
    fontSize: s(9),
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
