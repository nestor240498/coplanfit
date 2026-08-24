import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { addTag, removeTag } from '../tagsRepository';
import { Client, ClientTag, TagKind } from '../types';
import { AddTagSheet } from './AddTagSheet';

type Props = {
  client: Client;
  tags: ClientTag[];
  onReloadTags: () => void;
  onUpdateClient: (patch: { medical_notes?: string }) => Promise<void>;
};

export function SaludTab({ client, tags, onReloadTags, onUpdateClient }: Props) {
  const [sheetKind, setSheetKind] = useState<TagKind | null>(null);
  const [medicalNotes, setMedicalNotes] = useState(client.medical_notes ?? '');

  async function handleAddTag(kind: TagKind, label: string) {
    await addTag(client.id, kind, label);
    onReloadTags();
  }

  async function handleRemoveTag(tagId: string) {
    await removeTag(tagId);
    onReloadTags();
  }

  function handleNotesBlur() {
    if (medicalNotes !== (client.medical_notes ?? '')) {
      onUpdateClient({ medical_notes: medicalNotes });
    }
  }

  const conditionTags = tags.filter((t) => t.kind === 'condicion');
  const allergyTags = tags.filter((t) => t.kind === 'alergia');

  return (
    <View style={styles.container}>
      {/* Condiciones médicas */}
      <View style={styles.group}>
        <Text style={styles.groupLabel}>Condiciones médicas / Patologías</Text>
        <View style={styles.chipRow}>
          {conditionTags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.label}
              variant="neutral"
              onRemove={() => handleRemoveTag(tag.id)}
            />
          ))}
          <Pressable onPress={() => setSheetKind('condicion')} style={styles.addChip}>
            <Text style={styles.addChipText}>+ Agregar</Text>
          </Pressable>
        </View>
      </View>

      {/* Alergias / Intolerancias */}
      <View style={styles.group}>
        <Text style={styles.groupLabel}>Alergias e Intolerancias</Text>
        <View style={styles.chipRow}>
          {allergyTags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.label}
              variant="danger"
              onRemove={() => handleRemoveTag(tag.id)}
            />
          ))}
          <Pressable onPress={() => setSheetKind('alergia')} style={styles.addChip}>
            <Text style={styles.addChipText}>+ Agregar</Text>
          </Pressable>
        </View>
      </View>

      {/* Notas médicas y lesiones */}
      <Text style={styles.groupLabel}>Notas médicas, lesiones o limitaciones</Text>
      <TextInput
        value={medicalNotes}
        onChangeText={setMedicalNotes}
        onEndEditing={handleNotesBlur}
        multiline
        placeholder="Condiciones médicas relevantes, medicación, lesiones, cirugías…"
        placeholderTextColor={colors.textMuted}
        style={styles.notes}
      />

      {sheetKind && (
        <AddTagSheet
          visible={sheetKind !== null}
          initialKind={sheetKind}
          onClose={() => setSheetKind(null)}
          onAdd={handleAddTag}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: s(16), gap: s(10) },
  group: { gap: s(4) },
  groupLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6) },
  addChip: {
    paddingVertical: s(4),
    paddingHorizontal: s(8),
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.navy,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  addChipText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.navy },
  notes: {
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
});
