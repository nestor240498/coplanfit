import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { DEFAULT_EXERCISES } from '../defaultExercises';
import { Exercise, MUSCLE_GROUPS, MuscleGroup, SingleExerciseExecution } from '../types';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: SingleExerciseExecution) => void;
  title?: string;
};

export function ExercisePickerSheet({
  visible,
  onClose,
  onSelect,
  title = 'Banco de Ejercicios',
}: Props) {
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'todos'>('todos');
  const [search, setSearch] = useState('');

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEFAULT_EXERCISES.filter((ex) => {
      const matchMuscle = selectedMuscle === 'todos' || ex.muscle_group === selectedMuscle;
      const matchSearch = q === '' || ex.name.toLowerCase().includes(q) || ex.equipment.toLowerCase().includes(q);
      return matchMuscle && matchSearch;
    });
  }, [selectedMuscle, search]);

  function handleChooseExercise(ex: Omit<Exercise, 'id' | 'created_at'>) {
    const execution: SingleExerciseExecution = {
      name: ex.name,
      reps: '10-12',
      rir: '1-2',
      notes: ex.tips || null,
      lottie_url: ex.lottie_url || null,
    };
    onSelect(execution);
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {/* Buscador */}
      <View style={styles.searchBox}>
        <Search size={s(14)} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar ejercicio o equipamiento…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {/* Filtros de grupos musculares */}
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setSelectedMuscle('todos')}
          style={[styles.filterChip, selectedMuscle === 'todos' && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, selectedMuscle === 'todos' && styles.filterChipTextActive]}>
            Todos
          </Text>
        </Pressable>

        {MUSCLE_GROUPS.slice(0, 6).map((m) => {
          const isActive = selectedMuscle === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => setSelectedMuscle(m.id)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Lista de ejercicios */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.name}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No se encontraron ejercicios con ese criterio.</Text>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => handleChooseExercise(item)} style={styles.exerciseItem}>
            <View style={styles.exerciseTextWrap}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.muscleBadge}>
                  <Text style={styles.muscleBadgeText}>{item.muscle_group.toUpperCase()}</Text>
                </View>
                <Text style={styles.equipmentText}>{item.equipment}</Text>
              </View>
            </View>
            <Text style={styles.addArrow}>+ Añadir</Text>
          </Pressable>
        )}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.input,
    paddingHorizontal: s(10),
    height: s(36),
    gap: s(6),
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(4),
    marginVertical: s(4),
  },
  filterChip: {
    paddingVertical: s(3),
    paddingHorizontal: s(8),
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterChipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  list: {
    maxHeight: s(240),
  },
  listContent: {
    gap: s(6),
    paddingVertical: s(4),
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: s(16),
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    padding: s(8),
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseTextWrap: {
    flex: 1,
    gap: s(3),
  },
  exerciseName: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  muscleBadge: {
    backgroundColor: colors.navy,
    paddingVertical: s(1),
    paddingHorizontal: s(5),
    borderRadius: radius.chip,
  },
  muscleBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.surface,
  },
  equipmentText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  addArrow: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.success,
    marginLeft: s(8),
  },
});
