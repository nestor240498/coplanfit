import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useRetained } from '@/lib/useRetained';
import { AddChip, Chip } from '@/components/ui/Chip';
import { toast, toastWithUndo } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
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
  // La hoja sigue pintada mientras se cierra; la key la reinicia en cada apertura
  const shownKind = useRetained(sheetKind);
  const [tagNonce, setTagNonce] = useState(0);

  function openTagSheet(kind: NonNullable<typeof sheetKind>) {
    setTagNonce((n) => n + 1);
    setSheetKind(kind);
  }
  const [medicalNotes, setMedicalNotes] = useState(client.medical_notes ?? '');

  async function handleAddTag(kind: TagKind, label: string) {
    await addTag(client.id, kind, label);
    onReloadTags();
  }

  /** Quita el dato al momento y ofrece «Deshacer» (lo vuelve a crear con el mismo tipo y texto). */
  async function handleRemoveTag(tag: ClientTag) {
    try {
      await removeTag(tag.id);
      onReloadTags();
      toastWithUndo(`«${tag.label}» quitado de la ficha`, async () => {
        await addTag(client.id, tag.kind, tag.label);
        onReloadTags();
      });
    } catch (e) {
      toast({ message: friendlyError(e), tone: 'danger' });
    }
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
              onRemove={() => handleRemoveTag(tag)}
            />
          ))}
          <AddChip onPress={() => openTagSheet('condicion')} accessibilityLabel="Agregar condición médica" />
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
              onRemove={() => handleRemoveTag(tag)}
            />
          ))}
          <AddChip onPress={() => openTagSheet('alergia')} accessibilityLabel="Agregar alergia o intolerancia" />
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

      {shownKind && (
        <AddTagSheet
          key={tagNonce}
          visible={sheetKind !== null}
          initialKind={shownKind}
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: s(6) },
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
