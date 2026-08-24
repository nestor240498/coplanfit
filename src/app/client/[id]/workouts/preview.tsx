import { useLocalSearchParams } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getClient } from '@/features/clients/repository';
import { Client } from '@/features/clients/types';
import { WorkoutPlanVersion } from '@/features/workouts/types';
import { getWorkoutPlanVersionById } from '@/features/workouts/workoutsRepository';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export default function WorkoutPreviewScreen() {
  const { id, versionId } = useLocalSearchParams<{ id: string; versionId: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [version, setVersion] = useState<WorkoutPlanVersion | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !versionId) return;
    let cancelled = false;
    Promise.all([getClient(id), getWorkoutPlanVersionById(versionId)])
      .then(([c, v]) => {
        if (!cancelled) {
          setClient(c);
          setVersion(v);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) Alert.alert('Error', e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, versionId]);

  if (loading || !version) {
    return (
      <View style={styles.screen}>
        <AppBackground />
        <ScreenHeader title="Rutina de entrenamiento" showBack />
        <ActivityIndicator style={styles.centerBox} color={colors.navy} />
      </View>
    );
  }

  const days = version.data?.weekly_schedule || [];
  const activeDay = days[activeDayIndex] || days[0];

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader
        title={version.name || `Versión ${version.version}`}
        subtitle={client ? client.full_name : ''}
        showBack
        breadcrumbs={[
          { label: 'Clientes', href: '/', icon: Users },
          { label: client?.full_name || 'Cliente', href: `/client/${id}` },
          { label: 'Rutina' },
        ]}
      />

      {/* Selector de días */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daysBar}
        contentContainerStyle={styles.daysBarContent}
      >
        {days.map((day, idx) => {
          const isActive = idx === activeDayIndex;
          return (
            <Pressable
              key={day.id}
              onPress={() => setActiveDayIndex(idx)}
              style={[styles.dayTab, isActive && styles.dayTabActive]}
            >
              <Text style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>
                {day.day_name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Contenido del día */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeDay && (
          <>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{activeDay.day_name}</Text>
              {activeDay.focus ? (
                <Text style={styles.dayFocus}>{activeDay.focus}</Text>
              ) : null}
            </View>

            {activeDay.blocks.map((block, bIdx) => {
              if (block.type === 'single') {
                return (
                  <View key={block.id} style={styles.blockCard}>
                    <View style={styles.blockTopLine}>
                      <View style={styles.numBadge}>
                        <Text style={styles.numBadgeText}>{bIdx + 1}</Text>
                      </View>
                      <Text style={styles.exerciseName}>{block.exercise.name}</Text>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Series</Text>
                        <Text style={styles.metaValue}>{block.sets}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Reps</Text>
                        <Text style={styles.metaValue}>{block.exercise.reps}</Text>
                      </View>
                      {block.exercise.weight ? (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Peso</Text>
                          <Text style={styles.metaValue}>{block.exercise.weight}</Text>
                        </View>
                      ) : null}
                      {block.exercise.rir ? (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>RIR</Text>
                          <Text style={styles.metaValue}>{block.exercise.rir}</Text>
                        </View>
                      ) : null}
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Descanso</Text>
                        <Text style={styles.metaValue}>{block.rest_seconds}s</Text>
                      </View>
                    </View>

                    {block.exercise.notes ? (
                      <Text style={styles.exerciseNotes}>💡 {block.exercise.notes}</Text>
                    ) : null}
                  </View>
                );
              }

              // Bloque Superserie
              return (
                <View key={block.id} style={styles.supersetCard}>
                  <View style={styles.supersetHeader}>
                    <Text style={styles.supersetTag}>⚡ SUPERSERIE COMBINADA ({block.sets} SERIES)</Text>
                  </View>

                  {block.exercises.map((subEx, sIdx) => (
                    <View key={sIdx} style={styles.subExItem}>
                      <View style={styles.subLetter}>
                        <Text style={styles.subLetterText}>
                          {String.fromCharCode(65 + sIdx)}
                        </Text>
                      </View>
                      <View style={styles.subExInfo}>
                        <Text style={styles.subExName}>{subEx.name}</Text>
                        <Text style={styles.subExReps}>
                          {subEx.reps} reps {subEx.weight ? `· ${subEx.weight}` : ''} {subEx.rir ? `· RIR ${subEx.rir}` : ''}
                        </Text>
                      </View>
                    </View>
                  ))}

                  <Text style={styles.supersetRest}>
                    Descanso: {block.rest_seconds}s al finalizar cada ronda completa
                  </Text>
                </View>
              );
            })}

            {version.data?.notes ? (
              <View style={styles.notesCard}>
                <Text style={styles.notesTitle}>Indicaciones generales del entrenador</Text>
                <Text style={styles.notesText}>{version.data.notes}</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  daysBar: {
    maxHeight: s(42),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  daysBarContent: {
    paddingHorizontal: s(12),
    alignItems: 'center',
    gap: s(6),
  },
  dayTab: {
    paddingVertical: s(6),
    paddingHorizontal: s(10),
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTabActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  dayTabText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  dayTabTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: s(16), gap: s(10), paddingBottom: s(40) },
  dayHeader: {
    gap: s(2),
    marginBottom: s(4),
  },
  dayTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.navy,
  },
  dayFocus: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  blockCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(8),
  },
  blockTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  numBadge: {
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8.5),
    color: colors.navy,
  },
  exerciseName: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.input,
    padding: s(6),
    justifyContent: 'space-around',
  },
  metaItem: {
    alignItems: 'center',
    gap: 1,
  },
  metaLabel: {
    fontFamily: fonts.body,
    fontSize: s(7.5),
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  exerciseNotes: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  supersetCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1.5,
    borderColor: colors.lime,
    gap: s(8),
  },
  supersetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supersetTag: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.navy,
    backgroundColor: colors.lime,
    paddingHorizontal: s(6),
    paddingVertical: s(2),
    borderRadius: radius.chip,
  },
  subExItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    backgroundColor: colors.background,
    padding: s(6),
    borderRadius: radius.input,
  },
  subLetter: {
    width: s(16),
    height: s(16),
    borderRadius: s(8),
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subLetterText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(7.5),
    color: colors.surface,
  },
  subExInfo: {
    flex: 1,
    gap: 1,
  },
  subExName: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  subExReps: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
  },
  supersetRest: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(10),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(4),
    marginTop: s(8),
  },
  notesTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  notesText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
    lineHeight: s(15),
  },
});
