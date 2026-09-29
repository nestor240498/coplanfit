import { ImageOff, Images } from 'lucide-react-native';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
};

/**
 * Las fotos de progreso son confidenciales y el PDF suele reenviarse por WhatsApp:
 * por eso se incluyen solo si el entrenador lo activa explícitamente (desactivado por defecto).
 */
export function IncludePhotosToggle({ value, onChange }: Props) {
  const Icon = value ? Images : ImageOff;
  return (
    <View style={styles.row}>
      <Icon size={s(13)} color={value ? colors.navy : colors.textMuted} strokeWidth={2} />
      <View style={styles.texts}>
        <Text style={styles.title}>Incluir fotos de progreso en el PDF</Text>
        <Text style={styles.hint}>
          {value ? 'Las fotos irán en el documento que compartas.' : 'Las fotos no salen de la app.'}
        </Text>
      </View>
      <Switch
        accessibilityLabel="Incluir fotos de progreso en el PDF"
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.lime }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    minHeight: 44,
    paddingHorizontal: s(10),
    paddingVertical: s(6),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: fontSizes.sm,
    color: colors.navy,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: s(1),
  },
});
