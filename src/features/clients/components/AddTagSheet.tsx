import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet, SheetFooter } from '@/components/ui/BottomSheet';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { TagKind } from '../types';

const KIND_LABELS: Record<TagKind, string> = {
  condicion: 'Condición',
  alergia: 'Alergia',
  evita: 'Evita',
};

const SUGGESTIONS: Record<TagKind, string[]> = {
  condicion: ['Resistencia a la insulina', 'Hipertensión', 'Diabetes tipo 2', 'Hipotiroidismo'],
  alergia: ['Mariscos', 'Lactosa', 'Gluten', 'Frutos secos'],
  evita: ['Frutos secos', 'Brócoli', 'Cerdo', 'Azúcar refinada'],
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (kind: TagKind, label: string) => Promise<void> | void;
  /** Preselecciona el tipo cuando se abre desde una categoría concreta (+ Agregar de "Alergias", etc.) */
  initialKind?: TagKind;
};

/** Mockup ("Agregar a la ficha"): pills Condición/Alergia/Evita, buscar, sugeridos. */
export function AddTagSheet({ visible, onClose, onAdd, initialKind = 'alergia' }: Props) {
  const [kind, setKind] = useState<TagKind>(initialKind);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  function handleClose() {
    setText('');
    setKind(initialKind);
    onClose();
  }

  async function handleAdd() {
    if (text.trim().length === 0) return;
    setSaving(true);
    try {
      await onAdd(kind, text.trim());
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Agregar a la ficha">
      <Text style={styles.label}>Tipo de dato</Text>
      <View style={styles.pillRow}>
        {(Object.keys(KIND_LABELS) as TagKind[]).map((k) => {
          const selected = k === kind;
          return (
            <Pressable key={k} onPress={() => setKind(k)} style={[styles.pill, selected && styles.pillSelected]}>
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{KIND_LABELS[k]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Buscar o escribir</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Ej: Lactosa"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.label}>Sugeridas</Text>
      <View style={styles.suggestionRow}>
        {SUGGESTIONS[kind].map((suggestion) => (
          <Pressable key={suggestion} onPress={() => setText(suggestion)} style={styles.suggestionChip}>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </Pressable>
        ))}
      </View>

      <SheetFooter onCancel={handleClose} onConfirm={handleAdd} confirmLabel="Agregar" confirmDisabled={text.trim().length === 0 || saving} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: s(4),
  },
  pillRow: { flexDirection: 'row', gap: s(5) },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: s(7),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  pillText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  pillTextSelected: { fontFamily: fonts.bodyBold, color: colors.surface },
  input: {
    height: s(36),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: s(10),
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(5) },
  suggestionChip: {
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: s(5),
    paddingHorizontal: s(10),
  },
  suggestionText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
});
