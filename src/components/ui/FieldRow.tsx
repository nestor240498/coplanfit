import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = {
  label: string;
  value: string;
  /** Modo edición (mockup "Actualizar medición"): fondo lima claro, borde lima, valor navy. */
  editing?: boolean;
  onPress?: () => void;
};

/** Mockup: fila bordeada "label ... valor" (Peso, Edad, Cintura, etc.) usada en Salud/Antropometría. */
export function FieldRow({ label, value, editing, onPress }: Props) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={[styles.row, editing && styles.rowEditing]} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, editing && styles.valueEditing]}>
        {value}
        {editing ? ' ✎' : ''}
      </Text>
    </Wrapper>
  );
}

type InputRowProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suffix?: string;
  keyboardType?: 'numeric' | 'decimal-pad' | 'default';
};

/** Variante editable en línea (usada en "Actualizar medición"): mismo estilo, TextInput real dentro. */
export function InputFieldRow({ label, value, onChangeText, suffix, keyboardType = 'decimal-pad' }: InputRowProps) {
  return (
    <View style={[styles.row, styles.rowEditing]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder="—"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {suffix != null && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    paddingVertical: s(7),
    paddingHorizontal: s(9),
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowEditing: {
    backgroundColor: colors.successBg,
    borderColor: colors.lime,
  },
  label: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  value: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  valueEditing: { color: colors.navy },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  input: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
    width: s(48),
    textAlign: 'right',
    padding: 0,
  },
  suffix: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
});
