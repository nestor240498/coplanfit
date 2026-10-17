import { Check, SlidersHorizontal, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { hapticSelection } from '@/lib/motion';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

import { activeFilterCount, ExerciseFilters, matchesExerciseFilters, NO_EXERCISE_FILTERS } from '../exerciseSearch';
import { EXERCISE_EQUIPMENT, equipmentLabel, Exercise, MUSCLE_GROUPS, MuscleGroup, muscleLabel } from '../types';

type Props = {
  /** Ejercicios sobre los que se filtra (ya aplicados búsqueda y origen): dan las opciones y los recuentos. */
  exercises: Exercise[];
  filters: ExerciseFilters;
  onChange: (filters: ExerciseFilters) => void;
};

/**
 * Filtros del banco sin scroll horizontal: botón «Filtrar» que abre una hoja con músculo y equipo
 * (todas las opciones a la vista, con cuántos ejercicios tiene cada una) y los filtros activos
 * visibles como chips que se quitan con la X.
 */
export function ExerciseFilterBar({ exercises, filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ExerciseFilters>(filters);
  const count = activeFilterCount(filters);

  function openSheet() {
    setDraft(filters);
    setOpen(true);
  }

  function removeMuscle(id: MuscleGroup) {
    onChange({ ...filters, muscles: filters.muscles.filter((m) => m !== id) });
  }

  function removeEquipment(id: string) {
    onChange({ ...filters, equipment: filters.equipment.filter((e) => e !== id) });
  }

  return (
    <>
      <View style={styles.bar}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={count > 0 ? `Filtrar, ${count} filtros activos` : 'Filtrar por músculo o equipo'}
          onPress={openSheet}
          hitSlop={{ top: 5, bottom: 5 }}
          style={[styles.filterBtn, count > 0 && styles.filterBtnActive]}
        >
          <SlidersHorizontal size={14} color={count > 0 ? colors.surface : colors.navy} />
          <Text style={[styles.filterBtnText, count > 0 && styles.filterBtnTextActive]}>
            {count > 0 ? `Filtrar (${count})` : 'Filtrar'}
          </Text>
        </PressableScale>

        {count === 0 ? (
          <Text style={styles.allText}>Todos los músculos y equipos</Text>
        ) : (
          <>
            {filters.muscles.map((id) => (
              <ActiveChip key={id} label={muscleLabel(id)} onRemove={() => removeMuscle(id)} />
            ))}
            {filters.equipment.map((id) => (
              <ActiveChip key={id} label={equipmentLabel(id)} onRemove={() => removeEquipment(id)} />
            ))}
          </>
        )}
      </View>

      <FilterSheet
        visible={open}
        onClose={() => setOpen(false)}
        exercises={exercises}
        draft={draft}
        setDraft={setDraft}
        onApply={() => {
          onChange(draft);
          setOpen(false);
        }}
      />
    </>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Quitar filtro ${label}`}
      onPress={onRemove}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      style={styles.activeChip}
    >
      <Text style={styles.activeChipText}>{label}</Text>
      <X size={13} color={colors.navy} strokeWidth={2.5} />
    </Pressable>
  );
}

function FilterSheet({
  visible,
  onClose,
  exercises,
  draft,
  setDraft,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  exercises: Exercise[];
  draft: ExerciseFilters;
  setDraft: (f: ExerciseFilters) => void;
  onApply: () => void;
}) {
  // Solo las opciones que existen en el banco (más las ya marcadas), con su recuento
  const muscleCounts = new Map<string, number>();
  const equipmentCounts = new Map<string, number>();
  for (const ex of exercises) {
    muscleCounts.set(ex.muscle_group, (muscleCounts.get(ex.muscle_group) ?? 0) + 1);
    equipmentCounts.set(ex.equipment, (equipmentCounts.get(ex.equipment) ?? 0) + 1);
  }
  const muscles = MUSCLE_GROUPS.filter((m) => muscleCounts.has(m.id) || draft.muscles.includes(m.id));
  const equipment = EXERCISE_EQUIPMENT.filter((e) => equipmentCounts.has(e.id) || draft.equipment.includes(e.id));
  const resultCount = exercises.filter((ex) => matchesExerciseFilters(ex, draft)).length;

  function toggleMuscle(id: MuscleGroup) {
    hapticSelection();
    setDraft({
      ...draft,
      muscles: draft.muscles.includes(id) ? draft.muscles.filter((m) => m !== id) : [...draft.muscles, id],
    });
  }

  function toggleEquipment(id: string) {
    hapticSelection();
    setDraft({
      ...draft,
      equipment: draft.equipment.includes(id) ? draft.equipment.filter((e) => e !== id) : [...draft.equipment, id],
    });
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filtrar ejercicios">
      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
        <Text style={styles.sectionLabel}>Músculo principal</Text>
        <View style={styles.optionsWrap}>
          {muscles.map((m) => (
            <OptionChip
              key={m.id}
              label={m.label}
              count={muscleCounts.get(m.id) ?? 0}
              active={draft.muscles.includes(m.id)}
              onPress={() => toggleMuscle(m.id)}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Equipo</Text>
        <View style={styles.optionsWrap}>
          {equipment.map((e) => (
            <OptionChip
              key={e.id}
              label={e.label}
              count={equipmentCounts.get(e.id) ?? 0}
              active={draft.equipment.includes(e.id)}
              onPress={() => toggleEquipment(e.id)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.sheetFooter}>
        {activeFilterCount(draft) > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => setDraft(NO_EXERCISE_FILTERS)} style={styles.clearBtn}>
            <Text style={styles.clearText}>Limpiar</Text>
          </Pressable>
        ) : null}
        <Button
          title={resultCount === 1 ? 'Ver 1 ejercicio' : `Ver ${resultCount} ejercicios`}
          onPress={onApply}
          style={styles.applyBtn}
        />
      </View>
    </BottomSheet>
  );
}

function OptionChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={`${label}, ${count} ejercicios`}
      onPress={onPress}
      style={[styles.optionChip, active && styles.optionChipActive]}
    >
      {active ? <Check size={14} color={colors.surface} strokeWidth={3} /> : null}
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
      <Text style={[styles.optionCount, active && styles.optionCountActive]}>{count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: s(6) },
  // Compacto, a la altura de las pestañas de origen; hitSlop amplía la zona táctil a 44 pt
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    minHeight: 34,
    paddingHorizontal: s(11),
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.navy,
    backgroundColor: colors.surface,
  },
  filterBtnActive: { backgroundColor: colors.navy },
  filterBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.navy },
  filterBtnTextActive: { color: colors.surface },
  allText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    minHeight: 32,
    paddingLeft: s(10),
    paddingRight: s(8),
    borderRadius: radius.chip,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.lime,
  },
  activeChipText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.navy },
  sheetScroll: { maxHeight: 440 },
  sheetContent: { gap: s(10), paddingBottom: s(4) },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: s(4),
  },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8) },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    minHeight: 44,
    paddingHorizontal: s(14),
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  optionText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.text },
  optionTextActive: { fontFamily: fonts.bodyBold, color: colors.surface },
  optionCount: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textMuted },
  optionCountActive: { color: colors.onNavyMuted },
  sheetFooter: { flexDirection: 'row', alignItems: 'center', gap: s(8), marginTop: s(10) },
  clearBtn: { minHeight: 48, paddingHorizontal: s(12), justifyContent: 'center' },
  clearText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textSecondary },
  applyBtn: { flex: 1 },
});
