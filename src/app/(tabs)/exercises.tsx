import { Dumbbell, Info, Plus, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { CreateExerciseModal } from '@/features/workouts/components/CreateExerciseModal';
import { ExerciseDetailModal } from '@/features/workouts/components/ExerciseDetailModal';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { matchesExerciseQuery } from '@/features/workouts/exerciseSearch';
import { getCurrentUserRole, getExercises, RemoveExerciseResult } from '@/features/workouts/exerciseService';
import { equipmentLabel, Exercise, MUSCLE_GROUPS, MuscleGroup, muscleLabel } from '@/features/workouts/types';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type OriginFilter = 'todos' | 'globales' | 'personalizados';

export default function ExercisesScreen() {
  const [exercisesList, setExercisesList] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'todos'>('todos');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('todos');
  const [search, setSearch] = useState('');

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    let isMounted = true;

    getCurrentUserRole().then((res) => {
      if (isMounted) {
        setIsSuperAdmin(res.isSuperAdmin);
        if (res.isSuperAdmin) setOriginFilter('todos');
      }
    });

    getExercises()
      .then((data) => {
        if (isMounted) {
          setExercisesList(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredExercises = useMemo(() => {
    return exercisesList.filter((ex) => {
      if (originFilter === 'globales' && ex.is_custom) return false;
      if (originFilter === 'personalizados' && !ex.is_custom) return false;

      const matchMuscle = selectedMuscle === 'todos' || ex.muscle_group === selectedMuscle;
      return matchMuscle && matchesExerciseQuery(ex, search);
    });
  }, [exercisesList, originFilter, selectedMuscle, search]);

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [createTemplate, setCreateTemplate] = useState<Partial<Exercise> | null>(null);

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
    setDetailExercise(savedEx);
  }

  function handleExerciseRemoved(removed: Exercise, result: RemoveExerciseResult) {
    setExercisesList((prev) => prev.filter((e) => e.id !== removed.id));
    Alert.alert(
      result === 'deleted' ? 'Ejercicio eliminado' : 'Ejercicio archivado',
      result === 'deleted'
        ? `"${removed.name}" se eliminó del banco.`
        : `"${removed.name}" ya no aparece en el banco. Las rutinas que lo usan lo conservan.`
    );
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
    <View style={styles.screen}>
      <AppBackground />

      {/* Header navy — igual que Clientes */}
      <ScreenHeader
        title="Banco de Ejercicios"
        right={
          <Pressable onPress={handleOpenCreate} style={styles.createBtn}>
            <Plus size={s(13)} color={colors.navy} strokeWidth={2.5} />
            <Text style={styles.createBtnText}>Nuevo</Text>
          </Pressable>
        }
      />

      {/* Barra de filtros (superficie blanca) */}
      <View style={styles.filtersBar}>
        {/* Contador */}
        <Text style={styles.filterCount}>
          {exercisesList.length} ejercicios disponibles
        </Text>

        {/* Buscador */}
        <View style={styles.searchBox}>
          <Search size={s(14)} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre o equipamiento…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        {/* Filtros de origen (solo para entrenadores; los administradores gestionan el catálogo oficial directamente) */}
        {!isSuperAdmin && (
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
                Catálogo Oficial
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setOriginFilter('personalizados')}
              style={[styles.originTab, originFilter === 'personalizados' && styles.originTabActive]}
            >
              <Text style={[styles.originTabText, originFilter === 'personalizados' && styles.originTabTextActive]}>
                Mis Ejercicios
              </Text>
            </Pressable>
          </View>
        )}

        {/* Chips de grupo muscular */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'todos', label: 'Todos' }, ...MUSCLE_GROUPS]}
          keyExtractor={(item) => item.id}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContainer}
          renderItem={({ item }) => {
            const isActive = selectedMuscle === item.id;
            return (
              <Pressable
                onPress={() => setSelectedMuscle(item.id as MuscleGroup | 'todos')}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Lista de Ejercicios */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.navy} />
          <Text style={styles.loadingText}>Cargando banco de ejercicios…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id || item.name}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Dumbbell size={s(36)} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No se encontraron ejercicios</Text>
              <Text style={styles.emptyText}>
                No hay ejercicios que coincidan con la búsqueda o filtro seleccionado.
              </Text>
              <Pressable
                onPress={handleOpenCreate}
                style={styles.emptyCreateBtn}
              >
                <Plus size={s(13)} color={colors.navy} />
                <Text style={styles.emptyCreateBtnText}>
                  {isSuperAdmin ? 'Crear ejercicio oficial nuevo' : 'Crear ejercicio nuevo'}
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setDetailExercise(item)}
              style={styles.exerciseCard}
            >
              <View style={styles.exerciseMain}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.exerciseName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.is_custom ? (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>Mío</Text>
                    </View>
                  ) : (
                    <View style={styles.globalBadge}>
                      <Text style={styles.globalBadgeText}>Oficial</Text>
                    </View>
                  )}
                </View>

                <View style={styles.badgeRow}>
                  <View style={styles.muscleBadge}>
                    <Text style={styles.muscleBadgeText}>
                      {muscleLabel(item.muscle_group)}
                    </Text>
                  </View>
                  <Text style={styles.equipmentText}>{equipmentLabel(item.equipment)}</Text>
                  <Text style={styles.dotSeparator}>·</Text>
                  <Text style={styles.difficultyText}>{item.difficulty}</Text>
                </View>

                {item.tips ? (
                  <Text style={styles.previewTip} numberOfLines={2}>
                    {item.tips}
                  </Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => setDetailExercise(item)}
                style={styles.infoBtn}
                hitSlop={8}
              >
                <Info size={s(16)} color={colors.navy} />
              </Pressable>
            </Pressable>
          )}
        />
      )}

      {/* Modal de Creación / Edición */}
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
        onEdit={handleOpenEdit}
        onRemoved={handleExerciseRemoved}
        allExercises={exercisesList}
        onOpenExercise={setDetailExercise}
        onCreateFrom={handleCreateFrom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  // Botón "+ Nuevo" dentro del ScreenHeader (fondo lima para contraste en navy)
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: colors.lime,
    paddingHorizontal: s(10),
    paddingVertical: s(6),
    borderRadius: radius.button,
  },
  createBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },

  // Barra de filtros debajo del header navy
  filtersBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: s(16),
    paddingTop: s(10),
    paddingBottom: s(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: s(8),
  },
  filterCount: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.input,
    paddingHorizontal: s(10),
    height: s(28),
    gap: s(6),
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.text,
    padding: 0,
  },
  originFilterRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.input,
    padding: 2,
    gap: 2,
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
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  originTabText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  originTabTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.navy,
  },
  chipsScroll: {
    maxHeight: s(30),
  },
  chipsContainer: {
    gap: s(6),
  },
  chip: {
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: s(8.5),
    color: colors.textSecondary,
  },
  chipTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  listContent: {
    padding: s(16),
    gap: s(10),
    paddingBottom: s(80),
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(12),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(10),
  },
  exerciseMain: {
    flex: 1,
    gap: s(4),
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: s(6),
  },
  exerciseName: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  customBadge: {
    backgroundColor: 'rgba(139, 197, 63, 0.25)',
    paddingHorizontal: s(6),
    paddingVertical: 1,
    borderRadius: radius.chip,
    alignSelf: 'flex-start',
  },
  customBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.navy,
  },
  globalBadge: {
    backgroundColor: 'rgba(27, 42, 74, 0.08)',
    paddingHorizontal: s(6),
    paddingVertical: 1,
    borderRadius: radius.chip,
    alignSelf: 'flex-start',
  },
  globalBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  dotSeparator: {
    color: colors.textMuted,
    fontSize: s(8),
  },
  difficultyText: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  previewTip: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: s(16),
  },
  infoBtn: {
    width: s(34),
    height: s(34),
    borderRadius: s(17),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: s(40),
    gap: s(10),
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.navy,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: s(260),
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: colors.lime,
    paddingHorizontal: s(14),
    paddingVertical: s(8),
    borderRadius: radius.button,
    marginTop: s(6),
  },
  emptyCreateBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.navy,
  },
});
