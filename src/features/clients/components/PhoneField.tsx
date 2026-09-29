import { StyleSheet, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { onlyDigits } from '@/lib/phone';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = {
  prefix: string;
  localNumber: string;
  onChangePrefix: (prefix: string) => void;
  onChangeLocalNumber: (localNumber: string) => void;
  error?: string;
};

/** Teléfono con prefijo de país, para poder abrir el chat de WhatsApp del cliente. */
export function PhoneField({ prefix, localNumber, onChangePrefix, onChangeLocalNumber, error }: Props) {
  return (
    <View>
      <Text style={styles.label}>Teléfono (WhatsApp)</Text>
      <View style={styles.row}>
        <Input
          accessibilityLabel="Prefijo de país"
          value={prefix}
          onChangeText={(v) => onChangePrefix(onlyDigits(v).slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          leftIcon={<Text style={styles.plus}>+</Text>}
          containerStyle={styles.prefix}
        />
        <Input
          accessibilityLabel="Número de teléfono"
          value={localNumber}
          onChangeText={onChangeLocalNumber}
          placeholder="412 123 4567"
          keyboardType="phone-pad"
          containerStyle={styles.number}
          error={error}
        />
      </View>
      <Text style={styles.hint}>Opcional. Sirve para abrir su chat de WhatsApp al enviarle planes y rutinas.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: s(4),
  },
  row: { flexDirection: 'row', gap: s(8) },
  prefix: { width: s(78) },
  number: { flex: 1 },
  plus: { fontFamily: fonts.bodyBold, fontSize: fontSizes.base, color: colors.textSecondary },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: s(4) },
});
