import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import {
  EQUIPMENT_OPTIONS,
  EquipmentAccess,
  TRAINING_GOALS,
  TRAINING_LEVELS,
  TrainingGoal,
  TrainingLevel,
} from '../types';

type GoalProps = {
  visible: boolean;
  onClose: () => void;
  value: TrainingGoal | null | undefined;
  onSelect: (goal: TrainingGoal) => void;
};

export function TrainingGoalPickerSheet({ visible, onClose, value, onSelect }: GoalProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Objetivo de entrenamiento">
      {TRAINING_GOALS.map((g) => {
        const selected = g.id === value;
        return (
          <Pressable
            key={g.id}
            accessibilityRole="button"
            onPress={() => {
              onSelect(g.id);
              onClose();
            }}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{g.label}</Text>
              <Text style={styles.optionDescription}>{g.description}</Text>
            </View>
            {selected && <Text style={styles.check}>✓</Text>}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

type LevelProps = {
  visible: boolean;
  onClose: () => void;
  value: TrainingLevel | null | undefined;
  onSelect: (level: TrainingLevel) => void;
};

export function TrainingLevelPickerSheet({ visible, onClose, value, onSelect }: LevelProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Nivel de experiencia">
      {TRAINING_LEVELS.map((l) => {
        const selected = l.id === value;
        return (
          <Pressable
            key={l.id}
            accessibilityRole="button"
            onPress={() => {
              onSelect(l.id);
              onClose();
            }}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{l.label}</Text>
              <Text style={styles.optionDescription}>{l.description}</Text>
            </View>
            {selected && <Text style={styles.check}>✓</Text>}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

type EquipmentProps = {
  visible: boolean;
  onClose: () => void;
  value: EquipmentAccess | null | undefined;
  onSelect: (eq: EquipmentAccess) => void;
};

export function EquipmentPickerSheet({ visible, onClose, value, onSelect }: EquipmentProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Equipamiento disponible">
      {EQUIPMENT_OPTIONS.map((e) => {
        const selected = e.id === value;
        return (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            onPress={() => {
              onSelect(e.id);
              onClose();
            }}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{e.label}</Text>
              <Text style={styles.optionDescription}>{e.description}</Text>
            </View>
            {selected && <Text style={styles.check}>✓</Text>}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

type FrequencyProps = {
  visible: boolean;
  onClose: () => void;
  value: number | null | undefined;
  onSelect: (days: number) => void;
};

const FREQUENCIES = [
  { days: 2, label: '2 días por semana', desc: 'Full Body o Torso / Pierna' },
  { days: 3, label: '3 días por semana', desc: 'Full Body o Empuje / Tirón / Pierna' },
  { days: 4, label: '4 días por semana', desc: 'Torso / Pierna x2' },
  { days: 5, label: '5 días por semana', desc: 'Push / Pull / Legs / Torso / Pierna' },
  { days: 6, label: '6 días por semana', desc: 'Push / Pull / Legs x2' },
];

export function FrequencyPickerSheet({ visible, onClose, value, onSelect }: FrequencyProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Días de entrenamiento">
      {FREQUENCIES.map((f) => {
        const selected = f.days === value;
        return (
          <Pressable
            key={f.days}
            accessibilityRole="button"
            onPress={() => {
              onSelect(f.days);
              onClose();
            }}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{f.label}</Text>
              <Text style={styles.optionDescription}>{f.desc}</Text>
            </View>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionPressed: { backgroundColor: colors.background },
  optionInfo: { flex: 1, gap: s(2) },
  optionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.text },
  optionTitleSelected: { color: colors.navy },
  optionDescription: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textMuted },
  check: { fontFamily: fonts.bodyBold, fontSize: fontSizes.base, color: colors.lime, marginLeft: s(8) },
});
