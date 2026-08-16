import { Pressable, StyleSheet, Text } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { formatGoal } from '@/lib/format';
import { Goal, GOALS } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  value: Goal | null;
  onSelect: (goal: Goal) => void;
};

export function GoalPickerSheet({ visible, onClose, value, onSelect }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Objetivo">
      {GOALS.map((g) => {
        const selected = g === value;
        return (
          <Pressable
            key={g}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              onSelect(g);
              onClose();
            }}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <Text style={[styles.optionText, selected && styles.optionSelected]}>{formatGoal(g)}</Text>
            {selected && <Text style={styles.check}>✓</Text>}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: s(10),
    paddingHorizontal: s(4),
  },
  optionPressed: { backgroundColor: colors.background },
  optionText: { fontFamily: fonts.body, fontSize: fontSizes.base, color: colors.text },
  optionSelected: { fontFamily: fonts.bodySemi, color: colors.success },
  check: { fontFamily: fonts.bodyBold, fontSize: fontSizes.base, color: colors.lime },
});
