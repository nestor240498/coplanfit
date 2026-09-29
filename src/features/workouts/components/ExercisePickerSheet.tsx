import { Info, Plus, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CreateExerciseModal } from './CreateExerciseModal';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { matchesExerciseQuery } from '../exerciseSearch';
import { getExercises, RemoveExerciseResult } from '../exerciseService';
import { executionFromExercise } from '../prescription';
import { ClientTrainingContext, conflictingContraindications, isEquipmentAvailable } from '../routineGenerator';
import { equipmentLabel, Exercise, MUSCLE_GROUPS, MuscleGroup, muscleLabel, SingleExerciseExecution } from '../types';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: SingleExerciseExecution) => void;
  title?: string;
  /** Equipo y salud del cliente: marca los ejercicios contraindicados o sin su equipo. */
  trainingContext?: ClientTrainingContext;
};

type OriginFilter = 'todos' | 'globales' | 'personalizados';

export function ExercisePickerSheet({
  visible,
  onClose,
  onSelect,
  title = 'Banco de Ejercicios',
  trainingContext,
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
    return exercisesList.filter((ex) => {
      // Filtro de origen (Globales vs Personalizados)
      if (originFilter === 'globales' && ex.is_custom) return false;
      if (originFilter === 'personalizados' && !ex.is_custom) return false;

      // Filtro de músculo
      const matchMuscle = selectedMuscle === 'todos' || ex.muscle_group === selectedMuscle;

      return matchMuscle && matchesExerciseQuery(ex, search);
    });
  }, [exercisesList, originFilter, selectedMuscle, search]);

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [createTemplate, setCreateTemplate] = useState<Partial<Exercise> | null>(null);

  function handleChooseExercise(ex: Exercise) {
    onSelect(executionFromExercise(ex));
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

  function handleExerciseRemoved(removed: Exercise, result: RemoveExerciseResult) {
    setExercisesList((prev) => prev.filter((e) => e.id !== removed.id));
    if (result === 'archived') {
      Alert.alert('Ejercicio archivado', `"${removed.name}" ya no aparece en el banco. Las rutinas que lo usan lo conservan.`);
    }
  }

  function handleOpenEdit(ex: Exercise) {
    setEditingExercise(ex);
    setCreateTemplate(null);
    setCreateModalOpen(true);
  }

  /** Alta con datos iniciales: crear variante o hacer mi versión de un oficial. */
  function handleCreateFrom(template: Partial<Exercise>) {
    setEditingExercise(null);
    setCreateTemplate(template);
    setCreateModalOpen(true);
  }

  function handleOpenCreate() {
    setEditingExercise(null);
    setCreateTemplate(null);
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
              Catálogo oficial
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setOriginFilter('personalizados')}
            style={[styles.originTab, originFilter === 'personalizados' && styles.originTabActive]}
          >
            <Text style={[styles.originTabText, originFilter === 'personalizados' && styles.originTabTextActive]}>
              Mis ejercicios
            </Text>
          </Pressable>
        </View>

        {/* Filtros de grupos musculares */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          <Pressable
            onPress={() => setSelectedMuscle('todos')}
            style={[styles.filterChip, selectedMuscle === 'todos' && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, selectedMuscle === 'todos' && styles.filterChipTextActive]}>
              Todos
            </Text>
          </Pressable>

          {MUSCLE_GROUPS.map((m) => {
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
        </ScrollView>

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
                        <Text style={styles.muscleBadgeText}>{muscleLabel(item.muscle_group)}</Text>
                      </View>
                      <Text style={styles.equipmentText}>{equipmentLabel(item.equipment)}</Text>
                    </View>
                    {trainingContext && conflictingContraindications(item, trainingContext.conditions).length > 0 && (
                      <Text style={styles.warnText}>
                        Contraindicado: {conflictingContraindications(item, trainingContext.conditions).join(', ')}
                      </Text>
                    )}
                    {trainingContext && !isEquipmentAvailable(item, trainingContext.equipmentAccess) && (
                      <Text style={styles.noEquipText}>El cliente no tiene este equipo</Text>
                    )}
                  </View>
                </Pressable>

                {/* Botón de información */}
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
          setCreateTemplate(null);
        }}
        onSaved={handleExerciseSaved}
        initialExercise={editingExercise}
        template={createTemplate}
        existingExercises={exercisesList}
      />

      {/* Modal de Detalle */}
      <ExerciseDetailModal
        exercise={detailExercise}
        visible={!!detailExercise}
        onClose={() => setDetailExercise(null)}
        onSelect={handleChooseExercise}
        onEdit={handleOpenEdit}
        onRemoved={handleExerciseRemoved}
        allExercises={exercisesList}
        onOpenExercise={setDetailExercise}
        onCreateFrom={handleCreateFrom}
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
  warnText: { fontFamily: fonts.bodySemi, fontSize: fontSizes.xs, color: colors.danger, marginTop: s(2) },
  noEquipText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: s(2) },
  filterScroll: {
    flexGrow: 0,
    marginTop: s(8),
    marginBottom: s(4),
  },
  filterRow: {
    flexDirection: 'row',
    gap: s(6),
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
