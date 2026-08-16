import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { Client } from '../types';

type Props = {
  client: Client;
  onUpdateClient: (patch: { age?: number | null; medical_notes?: string }) => Promise<void>;
};

/** Tab Salud (README): edad, notas médicas generales. */
export function SaludTab({ client, onUpdateClient }: Props) {
  const [age, setAge] = useState(client.age != null ? String(client.age) : '');
  const [medicalNotes, setMedicalNotes] = useState(client.medical_notes ?? '');

  function handleAgeBlur() {
    const parsed = age.trim() === '' ? null : Number(age);
    if (parsed !== client.age) onUpdateClient({ age: parsed });
  }

  function handleNotesBlur() {
    if (medicalNotes !== (client.medical_notes ?? '')) onUpdateClient({ medical_notes: medicalNotes });
  }

  return (
    <View style={styles.container}>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Edad</Text>
        <TextInput
          value={age}
          onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
          onEndEditing={handleAgeBlur}
          keyboardType="number-pad"
          maxLength={3}
          placeholder="—"
          placeholderTextColor={colors.textMuted}
          style={styles.fieldInput}
        />
      </View>

      <Text style={styles.groupLabel}>Notas médicas generales</Text>
      <TextInput
        value={medicalNotes}
        onChangeText={setMedicalNotes}
        onEndEditing={handleNotesBlur}
        multiline
        placeholder="Condiciones médicas relevantes, medicación, indicaciones del médico…"
        placeholderTextColor={colors.textMuted}
        style={styles.notes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: s(16), gap: s(10) },
  groupLabel: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
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
  fieldInput: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
    textAlign: 'right',
    width: s(40),
    padding: 0,
  },
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
