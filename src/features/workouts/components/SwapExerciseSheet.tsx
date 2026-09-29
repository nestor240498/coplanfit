import { ArrowLeftRight, Search } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { equipmentLabel, Exercise, muscleLabel, patternLabel } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Nombre del ejercicio que se va a cambiar. */
  currentName: string;
  /** Dos equivalentes del banco que el cliente puede hacer. */
  suggestions: Exercise[];
  onChoose: (exercise: Exercise) => void;
  /** Abrir el banco completo para elegir otro. */
  onBrowseBank: () => void;
};

/** "Cambiar ejercicio": 2 sugerencias equivalentes del banco o elegir cualquier otro del banco. */
export function SwapExerciseSheet({ visible, onClose, currentName, suggestions, onChoose, onBrowseBank }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Cambiar ejercicio">
      <Text style={styles.intro}>
        Alternativas a «{currentName}» del banco que trabajan el mismo movimiento y que este cliente puede hacer.
      </Text>

      {suggestions.length === 0 ? (
        <Text style={styles.empty}>
          No hay equivalentes en el banco para el equipo y la salud de este cliente. Puedes elegir otro ejercicio o
          crearlo desde el banco.
        </Text>
      ) : (
        suggestions.map((ex) => (
          <Pressable
            key={ex.id}
            accessibilityRole="button"
            onPress={() => onChoose(ex)}
            style={styles.option}
          >
            <ArrowLeftRight size={s(16)} color={colors.navy} />
            <View style={styles.optionTexts}>
              <Text style={styles.optionName}>{ex.name}</Text>
              <Text style={styles.optionMeta}>
                {[muscleLabel(ex.muscle_group), equipmentLabel(ex.equipment), patternLabel(ex.movement_pattern)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      <Pressable accessibilityRole="button" onPress={onBrowseBank} style={styles.browse}>
        <Search size={s(14)} color={colors.navy} />
        <Text style={styles.browseText}>Elegir otro del banco</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: s(10),
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
    paddingVertical: s(10),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    minHeight: 56,
    padding: s(10),
    marginBottom: s(8),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.lime,
    backgroundColor: colors.successBg,
  },
  optionTexts: { flex: 1, gap: s(2) },
  optionName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  optionMeta: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  browse: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    minHeight: 44,
    marginTop: s(4),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  browseText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.navy },
});
