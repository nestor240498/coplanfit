import { Info, Plus, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CreateExerciseModal } from './CreateExerciseModal';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { getExercises } from '../exerciseService';
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

type OriginFilter = 'todos' | 'globales' | 'personalizados';

export function ExercisePickerSheet({
  visible,
  onClose,
  onSelect,
  title = 'Banco de Ejercicios',
}: Props) {
  const [exercisesList, setExercisesList] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'todos'>('todos');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('todos');
  const [search, setSearch] = useState('');

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (visible) {
      getExercises()
        .then((data) => {
          if (isMounted) {
            setExercisesList(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [visible]);

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercisesList.filter((ex) => {
      // Filtro de origen (Globales vs Personalizados)
      if (originFilter === 'globales' && ex.is_custom) return false;
      if (originFilter === 'personalizados' && !ex.is_custom) return false;

      // Filtro de músculo
      const matchMuscle = selectedMuscle === 'todos' || ex.muscle_group === selectedMuscle;

      // Filtro de búsqueda
      const matchSearch =
        q === '' ||
        ex.name.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q);

      return matchMuscle && matchSearch;
    });
  }, [exercisesList, originFilter, selectedMuscle, search]);

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  function handleChooseExercise(ex: Exercise) {
    const execution: SingleExerciseExecution = {
      exercise_id: ex.id,
      name: ex.name,
      reps: '10-12',
      rir: '1-2',
      notes: ex.tips || null,
      lottie_url: ex.lottie_url || null,
    };
    onSelect(execution);
    onClose();
  }

  function handleExerciseSaved(savedEx: Exercise) {
    setExercisesList((prev) => {
      const idx = prev.findIndex((e) => e.id === savedEx.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedEx;
        return next;
      }
      return [savedEx, ...prev];
    });
    handleChooseExercise(savedEx);
  }

  function handleOpenEdit(ex: Exercise) {
    setEditingExercise(ex);
    setCreateModalOpen(true);
  }

  function handleOpenCreate() {
    setEditingExercise(null);
    setCreateModalOpen(true);
  }

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={title}>
        {/* Barra superior: Buscador + Botón Crear */}
        <View style={styles.topActionsRow}>
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

          <Pressable
            onPress={handleOpenCreate}
            style={styles.createBtn}
          >
            <Plus size={s(13)} color={colors.surface} strokeWidth={2.5} />
            <Text style={styles.createBtnText}>Nuevo</Text>
          </Pressable>
        </View>

        {/* Filtros de origen (Todos / Globales / Personalizados) */}
        <View style={styles.originFilterRow}>
          <Pressable
            onPress={() => setOriginFilter('todos')}
            style={[styles.originTab, originFilter === 'todos' && styles.originTabActive]}
          >
            <Text style={[styles.originTabText, originFilter === 'todos' && styles.originTabTextActive]}>
              Todos
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setOriginFilter('globales')}
            style={[styles.originTab, originFilter === 'globales' && styles.originTabActive]}
          >
            <Text style={[styles.originTabText, originFilter === 'globales' && styles.originTabTextActive]}>
              🌍 Catálogo Oficial
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setOriginFilter('personalizados')}
            style={[styles.originTab, originFilter === 'personalizados' && styles.originTabActive]}
          >
            <Text style={[styles.originTabText, originFilter === 'personalizados' && styles.originTabTextActive]}>
              👤 Mis Ejercicios
            </Text>
          </Pressable>
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
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.navy} />
            <Text style={styles.loadingText}>Cargando banco de ejercicios…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id || item.name}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No se encontraron ejercicios con ese criterio.</Text>
                <Pressable
                  onPress={handleOpenCreate}
                  style={styles.emptyCreateBtn}
                >
                  <Plus size={s(12)} color={colors.navy} />
                  <Text style={styles.emptyCreateBtnText}>Crear ejercicio ahora</Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.exerciseItem}>
                <Pressable
                  onPress={() => handleChooseExercise(item)}
                  style={styles.exerciseMainPressable}
                >
                  <View style={styles.exerciseTextWrap}>
                    <View style={styles.nameRow}>
                      <Text style={styles.exerciseName} numberOfLines={1}>{item.name}</Text>
                      {item.is_custom && (
                        <View style={styles.customChip}>
                          <Text style={styles.customChipText}>Mío</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.badgeRow}>
                      <View style={styles.muscleBadge}>
                        <Text style={styles.muscleBadgeText}>{item.muscle_group.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.equipmentText}>{item.equipment}</Text>
                    </View>
                  </View>
                </Pressable>

                {/* Botón de Información / Lottie */}
                <Pressable
                  onPress={() => setDetailExercise(item)}
                  style={styles.infoBtn}
                  hitSlop={8}
                >
                  <Info size={s(16)} color={colors.navy} />
                </Pressable>

                {/* Botón rápido de añadir */}
                <Pressable
                  onPress={() => handleChooseExercise(item)}
                  style={styles.addBtn}
                >
                  <Text style={styles.addArrow}>+ Añadir</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </BottomSheet>

      {/* Modal de Creación / Edición de Ejercicio */}
      <CreateExerciseModal
        visible={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingExercise(null);
        }}
        onSaved={handleExerciseSaved}
        initialExercise={editingExercise}
      />

      {/* Modal de Detalle con Reproductor Lottie */}
      <ExerciseDetailModal
        exercise={detailExercise}
        visible={!!detailExercise}
        onClose={() => setDetailExercise(null)}
        onSelect={handleChooseExercise}
        onEdit={handleOpenEdit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  searchBox: {
    flex: 1,
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: colors.navy,
    height: s(36),
    paddingHorizontal: s(12),
    borderRadius: radius.input,
  },
  createBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.surface,
  },
  originFilterRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.input,
    padding: 2,
    gap: 2,
    marginTop: s(8),
  },
  originTab: {
    flex: 1,
    paddingVertical: s(6),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: s(6),
  },
  originTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  originTabText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  originTabTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.navy,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(6),
    marginTop: s(8),
    marginBottom: s(4),
  },
  filterChip: {
    paddingHorizontal: s(8),
    paddingVertical: s(4),
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
    fontSize: s(8.5),
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  loadingBox: {
    paddingVertical: s(40),
    alignItems: 'center',
    gap: s(8),
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  list: {
    maxHeight: s(360),
    marginTop: s(6),
  },
  listContent: {
    gap: s(6),
    paddingBottom: s(16),
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.card,
    paddingHorizontal: s(10),
    paddingVertical: s(8),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(8),
  },
  exerciseMainPressable: {
    flex: 1,
  },
  exerciseTextWrap: {
    gap: s(2),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  exerciseName: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
    flexShrink: 1,
  },
  customChip: {
    backgroundColor: 'rgba(139, 197, 63, 0.25)',
    paddingHorizontal: s(5),
    paddingVertical: 1,
    borderRadius: radius.chip,
  },
  customChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.navy,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  muscleBadge: {
    backgroundColor: colors.navy,
    paddingHorizontal: s(6),
    paddingVertical: 1,
    borderRadius: radius.chip,
  },
  muscleBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.surface,
  },
  equipmentText: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  infoBtn: {
    padding: s(6),
    borderRadius: radius.chip,
    backgroundColor: 'rgba(27, 42, 74, 0.06)',
  },
  addBtn: {
    paddingHorizontal: s(8),
    paddingVertical: s(4),
  },
  addArrow: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: s(28),
    gap: s(10),
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: colors.lime,
    paddingHorizontal: s(12),
    paddingVertical: s(6),
    borderRadius: radius.chip,
  },
  emptyCreateBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
});
