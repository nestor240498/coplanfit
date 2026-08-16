import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { formatGoal } from '@/lib/format';
import { addTag, removeTag } from '../tagsRepository';
import { Client, ClientTag, Goal, TagKind } from '../types';
import { AddTagSheet } from './AddTagSheet';
import { GoalPickerSheet } from './GoalPickerSheet';

const GROUPS: { kind: TagKind; label: string }[] = [
  { kind: 'condicion', label: 'Condiciones' },
  { kind: 'alergia', label: 'Alergias' },
  { kind: 'evita', label: 'Alimentos a evitar' },
];

type Props = {
  client: Client;
  tags: ClientTag[];
  latestMeasurementLabel: string | null;
  onReloadTags: () => void;
  onUpdateClient: (patch: { goal?: Goal; notes?: string }) => Promise<void>;
  onViewAnthropometry: () => void;
};

/**
 * Tab Datos (README): chips por Condiciones/Alergias/Alimentos a evitar + Agregar,
 * Objetivo (select), Notas adicionales, y referencia a la última medición.
 * Ver memoria coplanfit-ficha-cliente-datos-salud: estos campos están dibujados bajo
 * el tab "Salud" en el HTML, pero el README los asigna a "Datos" — se siguió el README.
 */
export function DatosTab({ client, tags, latestMeasurementLabel, onReloadTags, onUpdateClient, onViewAnthropometry }: Props) {
  const [sheetKind, setSheetKind] = useState<TagKind | null>(null);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [notes, setNotes] = useState(client.notes ?? '');

  async function handleAddTag(kind: TagKind, label: string) {
    await addTag(client.id, kind, label);
    onReloadTags();
  }

  async function handleRemoveTag(tagId: string) {
    await removeTag(tagId);
    onReloadTags();
  }

  async function handleSelectGoal(goal: Goal) {
    await onUpdateClient({ goal });
  }

  function handleNotesBlur() {
    if (notes !== (client.notes ?? '')) {
      onUpdateClient({ notes });
    }
  }

  return (
    <View style={styles.container}>
      {GROUPS.map((group) => {
        const groupTags = tags.filter((t) => t.kind === group.kind);
        return (
          <View key={group.kind} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.chipRow}>
              {groupTags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.label}
                  variant={group.kind === 'alergia' ? 'danger' : 'neutral'}
                  onRemove={() => handleRemoveTag(tag.id)}
                />
              ))}
              <Pressable onPress={() => setSheetKind(group.kind)} style={styles.addChip}>
                <Text style={styles.addChipText}>+ Agregar</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable onPress={() => setGoalSheetOpen(true)} style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Objetivo</Text>
        <Text style={styles.fieldValue}>{client.goal ? formatGoal(client.goal) : 'Elegir'} ▾</Text>
      </Pressable>

      <Text style={styles.groupLabel}>Notas adicionales</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        onEndEditing={handleNotesBlur}
        multiline
        placeholder="Preferencias, restricciones puntuales…"
        placeholderTextColor={colors.textMuted}
        style={styles.notes}
      />

      {latestMeasurementLabel != null && (
        <Pressable onPress={onViewAnthropometry}>
          <Text style={styles.measurementRef}>
            Última medición antropométrica: <Text style={styles.measurementRefValue}>{latestMeasurementLabel}</Text>
          </Text>
        </Pressable>
      )}

      <GoalPickerSheet visible={goalSheetOpen} onClose={() => setGoalSheetOpen(false)} value={client.goal} onSelect={handleSelectGoal} />
      <AddTagSheet
        visible={sheetKind != null}
        initialKind={sheetKind ?? 'alergia'}
        onClose={() => setSheetKind(null)}
        onAdd={handleAddTag}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: s(16), gap: s(10) },
  group: { gap: s(5) },
  groupLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(5) },
  addChip: {
    borderRadius: radius.chip,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C7CEDB',
    paddingVertical: s(4),
    paddingHorizontal: s(9),
  },
  addChipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textSecondary },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingVertical: s(6),
    paddingHorizontal: s(8),
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.text },
  fieldValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.success },
  notes: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: s(8),
    minHeight: s(40),
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    textAlignVertical: 'top',
  },
  measurementRef: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: s(2),
  },
  measurementRefValue: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
});
