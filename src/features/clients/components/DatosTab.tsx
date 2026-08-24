import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { calculateAge, formatDateShort } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { Client } from '../types';
import { DatePickerSheet } from './DatePickerSheet';

type Props = {
  client: Client;
  latestMeasurementLabel: string | null;
  onUpdateClient: (patch: {
    birth_date?: string | null;
    age?: number | null;
    notes?: string;
  }) => Promise<void>;
  onViewAnthropometry: () => void;
};

export function DatosTab({
  client,
  latestMeasurementLabel,
  onUpdateClient,
  onViewAnthropometry,
}: Props) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [notes, setNotes] = useState(client.notes ?? '');

  const computedAge =
    (client.birth_date ? calculateAge(client.birth_date) : null) ?? client.age;

  async function handleSelectBirthDate(isoDate: string | null) {
    const age = isoDate ? calculateAge(isoDate) : null;
    await onUpdateClient({ birth_date: isoDate, age });
  }

  function handleNotesBlur() {
    if (notes !== (client.notes ?? '')) {
      onUpdateClient({ notes });
    }
  }

  const birthDateLabel = client.birth_date
    ? formatDateShort(client.birth_date)
    : 'Elegir ▾';

  return (
    <View style={styles.container}>
      {/* Selector interactivo de Fecha de nacimiento */}
      <Pressable
        onPress={() => setDatePickerOpen(true)}
        style={styles.fieldRow}
        accessibilityRole="button"
        accessibilityLabel="Seleccionar fecha de nacimiento"
      >
        <Text style={styles.fieldLabel}>Fecha de nacimiento</Text>
        <Text style={styles.fieldValue}>{birthDateLabel}</Text>
      </Pressable>

      {/* Edad calculada informativa */}
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Edad</Text>
        <Text style={styles.infoValue}>
          {computedAge != null ? `${computedAge} años` : '—'}
        </Text>
      </View>

      {/* Notas generales */}
      <Text style={styles.groupLabel}>Notas y observaciones generales</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        onEndEditing={handleNotesBlur}
        multiline
        placeholder="Información relevante del asesorado, horarios, estilo de vida…"
        placeholderTextColor={colors.textMuted}
        style={styles.notes}
      />

      {/* Referencia a última medición */}
      <View style={styles.latestMeasurementBox}>
        <Text style={styles.latestMeasurementText}>
          Última medición antropométrica: {latestMeasurementLabel ?? 'Sin registros'}
        </Text>
        <Pressable onPress={onViewAnthropometry} style={styles.latestMeasurementLink}>
          <Text style={styles.latestMeasurementLinkText}>Ver antropometría ›</Text>
        </Pressable>
      </View>

      {/* Modal interactivo de selección de fecha */}
      <DatePickerSheet
        visible={datePickerOpen}
        initialDateIso={client.birth_date ?? null}
        onClose={() => setDatePickerOpen(false)}
        onSelectDate={handleSelectBirthDate}
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
  infoRow: {
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
  infoLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  infoValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.navy },
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
  latestMeasurementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(6),
    marginTop: s(4),
    paddingTop: s(8),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  latestMeasurementText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  latestMeasurementLink: {
    paddingVertical: s(2),
  },
  latestMeasurementLinkText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
});
