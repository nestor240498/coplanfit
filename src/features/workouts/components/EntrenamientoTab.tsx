import { Dumbbell, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Client, ClientTag } from '@/features/clients/types';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import {
  EQUIPMENT_OPTIONS,
  EquipmentAccess,
  TRAINING_GOALS,
  TRAINING_LEVELS,
  TrainingGoal,
  TrainingLevel,
  WorkoutPlanVersion,
} from '../types';
import {
  EquipmentPickerSheet,
  FrequencyPickerSheet,
  TrainingGoalPickerSheet,
  TrainingLevelPickerSheet,
} from './TrainingSheets';

type Props = {
  client: Client;
  tags: ClientTag[];
  versions: WorkoutPlanVersion[];
  onUpdateClient: (patch: {
    training_goal?: TrainingGoal | null;
    training_level?: TrainingLevel | null;
    equipment_access?: EquipmentAccess | null;
    days_per_week?: number | null;
    training_notes?: string | null;
  }) => Promise<void>;
  onNewWorkoutPlan: () => void;
  onViewWorkoutPlan: (versionId: string) => void;
  onResumeDraft?: (draft: WorkoutPlanVersion) => void;
  onDeleteDraft?: (draftId: string) => void;
};

export function EntrenamientoTab({
  client,
  tags,
  versions,
  onUpdateClient,
  onNewWorkoutPlan,
  onViewWorkoutPlan,
  onResumeDraft,
  onDeleteDraft,
}: Props) {
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);
  const [equipmentSheetOpen, setEquipmentSheetOpen] = useState(false);
  const [frequencySheetOpen, setFrequencySheetOpen] = useState(false);
  const [trainingNotes, setTrainingNotes] = useState(client.training_notes ?? '');

  const goalObj = TRAINING_GOALS.find((g) => g.id === client.training_goal);
  const levelObj = TRAINING_LEVELS.find((l) => l.id === client.training_level);
  const equipObj = EQUIPMENT_OPTIONS.find((e) => e.id === client.equipment_access);

  // Tags médicos y de condiciones desde la pestaña Salud
  const medicalTags = tags.filter((t) => t.kind === 'condicion');

  const draft = versions.find((v) => v.data?.is_draft === true);
  const publishedVersions = versions.filter((v) => v.data?.is_draft !== true);

  function handleNotesBlur() {
    if (trainingNotes !== (client.training_notes ?? '')) {
      onUpdateClient({ training_notes: trainingNotes });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        {/* Encabezado descriptivo */}
        <View style={styles.headerSection}>
          <View style={styles.headerTitleRow}>
            <Dumbbell size={s(15)} color={colors.navy} />
            <Text style={styles.tabHeading}>PLANES DE ENTRENAMIENTO</Text>
          </View>
          <Text style={styles.tabSubtitle}>
            Perfil fitness, distribución semanal y rutinas con animaciones de ejercicios.
          </Text>
        </View>

        {/* Configuración del Perfil Fitness */}
        <View style={styles.fieldsGroup}>
          {/* Objetivo de entrenamiento */}
          <Pressable onPress={() => setGoalSheetOpen(true)} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Objetivo en pesas / fitness</Text>
            <Text style={styles.fieldValue}>{goalObj ? goalObj.label : 'Elegir'} ▾</Text>
          </Pressable>

          {/* Nivel de experiencia */}
          <Pressable onPress={() => setLevelSheetOpen(true)} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Nivel de experiencia</Text>
            <Text style={styles.fieldValue}>{levelObj ? levelObj.label : 'Elegir'} ▾</Text>
          </Pressable>

          {/* Equipamiento disponible */}
          <Pressable onPress={() => setEquipmentSheetOpen(true)} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Equipamiento disponible</Text>
            <Text style={styles.fieldValue}>{equipObj ? equipObj.label : 'Elegir'} ▾</Text>
          </Pressable>

          {/* Frecuencia semanal */}
          <Pressable onPress={() => setFrequencySheetOpen(true)} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Frecuencia semanal</Text>
            <Text style={styles.fieldValue}>
              {client.days_per_week ? `${client.days_per_week} días / semana` : 'Elegir'} ▾
            </Text>
          </Pressable>
        </View>

        {/* Resumen de consideraciones de salud / lesiones (informativo) */}
        {medicalTags.length > 0 && (
          <View style={styles.healthWarningBox}>
            <Text style={styles.healthWarningTitle}>
              Consideraciones de salud (desde pestaña Salud):
            </Text>
            <View style={styles.chipRow}>
              {medicalTags.map((t) => (
                <Chip key={t.id} label={t.label} variant="neutral" />
              ))}
            </View>
          </View>
        )}

        {/* Notas y preferencias de entrenamiento */}
        <Text style={styles.groupLabel}>Notas y observaciones de entrenamiento</Text>
        <TextInput
          value={trainingNotes}
          onChangeText={setTrainingNotes}
          onEndEditing={handleNotesBlur}
          multiline
          placeholder="Ej: Prefiere ejercicios con mancuernas, descanso mínimo de 90s, enfoque en glúteos…"
          placeholderTextColor={colors.textMuted}
          style={styles.notes}
        />

        {/* Separador de Rutinas */}
        <View style={styles.routinesSection}>
          <Text style={styles.routinesHeading}>RUTINAS Y VERSIONES</Text>
        </View>

        {/* Banner de borrador en progreso si existe */}
        {draft && (
          <View style={styles.draftCard}>
            <View style={styles.draftInfo}>
              <Text style={styles.draftBadge}>BORRADOR EN PROGRESO</Text>
              <Text style={styles.draftTitle}>{draft.name || 'Rutina sin publicar'}</Text>
              <Text style={styles.draftMeta}>
                {draft.data?.weekly_schedule?.length ?? 0} días configurados
              </Text>
            </View>
            <View style={styles.draftActions}>
              {onResumeDraft && (
                <Pressable
                  onPress={() => onResumeDraft(draft)}
                  style={styles.resumeBtn}
                >
                  <Text style={styles.resumeBtnText}>Continuar editando ›</Text>
                </Pressable>
              )}
              {onDeleteDraft && (
                <Pressable
                  onPress={() => onDeleteDraft(draft.id)}
                  style={styles.discardBtn}
                >
                  <Text style={styles.discardBtnText}>Descartar</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        <Pressable onPress={onNewWorkoutPlan} style={styles.newPlanCta}>
          <Plus size={s(14)} color={colors.success} strokeWidth={2.5} />
          <Text style={styles.newPlanText}>Nueva rutina de entrenamiento</Text>
        </Pressable>

        {publishedVersions.length === 0 ? (
          <Text style={styles.empty}>
            Aún no hay rutinas publicadas para este cliente.
          </Text>
        ) : (
          publishedVersions.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => onViewWorkoutPlan(v.id)}
              style={styles.versionCard}
            >
              <View style={styles.versionInfo}>
                <Text style={styles.versionTitle}>{v.name || `Versión ${v.version}`}</Text>
                <Text style={styles.versionMeta}>
                  {v.data?.weekly_schedule?.length ?? 0} días de entrenamiento
                </Text>
              </View>
              {v.is_current && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Vigente</Text>
                </View>
              )}
            </Pressable>
          ))
        )}
      </View>

      {/* Sheets de selección */}
      <TrainingGoalPickerSheet
        visible={goalSheetOpen}
        value={client.training_goal}
        onClose={() => setGoalSheetOpen(false)}
        onSelect={(training_goal) => onUpdateClient({ training_goal })}
      />

      <TrainingLevelPickerSheet
        visible={levelSheetOpen}
        value={client.training_level}
        onClose={() => setLevelSheetOpen(false)}
        onSelect={(training_level) => onUpdateClient({ training_level })}
      />

      <EquipmentPickerSheet
        visible={equipmentSheetOpen}
        value={client.equipment_access}
        onClose={() => setEquipmentSheetOpen(false)}
        onSelect={(equipment_access) => onUpdateClient({ equipment_access })}
      />

      <FrequencyPickerSheet
        visible={frequencySheetOpen}
        value={client.days_per_week}
        onClose={() => setFrequencySheetOpen(false)}
        onSelect={(days_per_week) => onUpdateClient({ days_per_week })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: s(16),
    gap: s(12),
  },
  contentWrap: {
    gap: s(8),
  },
  headerSection: {
    paddingBottom: s(6),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: s(2),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  tabHeading: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    color: colors.navy,
    letterSpacing: 0.5,
  },
  tabSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    lineHeight: s(14),
  },
  fieldsGroup: {
    gap: s(8),
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingVertical: s(8),
    paddingHorizontal: s(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.text },
  fieldValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.navy },
  healthWarningBox: {
    backgroundColor: colors.background,
    borderRadius: radius.input,
    padding: s(8),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(6),
  },
  healthWarningTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(6),
  },
  groupLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  notes: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: s(8),
    minHeight: s(50),
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    textAlignVertical: 'top',
  },
  routinesSection: {
    marginTop: s(6),
    paddingTop: s(8),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  routinesHeading: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  newPlanCta: {
    height: s(36),
    flexDirection: 'row',
    gap: s(6),
    borderRadius: radius.input,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPlanText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.success },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: s(12),
  },
  versionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  versionInfo: {
    gap: s(2),
  },
  versionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  versionMeta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  draftCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1.5,
    borderColor: colors.lime,
    gap: s(8),
  },
  draftInfo: {
    gap: s(2),
  },
  draftBadge: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.navy,
    backgroundColor: colors.lime,
    alignSelf: 'flex-start',
    paddingHorizontal: s(6),
    paddingVertical: 1,
    borderRadius: radius.chip,
    letterSpacing: 0.5,
  },
  draftTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  draftMeta: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  draftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    paddingTop: s(4),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resumeBtn: {
    flex: 1,
    backgroundColor: colors.navy,
    paddingVertical: s(6),
    borderRadius: radius.button,
    alignItems: 'center',
  },
  resumeBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.surface,
  },
  discardBtn: {
    paddingVertical: s(6),
    paddingHorizontal: s(10),
  },
  discardBtnText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.danger,
  },
  currentBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: s(6),
    paddingVertical: s(2),
    borderRadius: radius.chip,
  },
  currentBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.success,
  },
});
