import { create } from 'zustand';

import { DEFAULT_GENERATION } from './routineGenerator';
import {
  MuscleGroup,
  RoutineGenerationSettings,
  SingleExerciseExecution,
  WorkoutBlock,
  WorkoutDay,
} from './types';

interface WorkoutBuilderState {
  clientId: string | null;
  routineName: string;
  days: WorkoutDay[];
  savedStep: number;
  isAiGenerated: boolean;
  notes: string;
  /** Cuántos ejercicios por día y si se permiten superseries (lo decide el entrenador). */
  generation: RoutineGenerationSettings;

  // Acciones
  initBuilder: (clientId: string, defaultName?: string, defaultDays?: WorkoutDay[]) => void;
  setRoutineName: (name: string) => void;
  setDays: (days: WorkoutDay[]) => void;
  setNotes: (notes: string) => void;
  setSavedStep: (step: number) => void;
  setIsAiGenerated: (val: boolean) => void;
  setGeneration: (patch: Partial<RoutineGenerationSettings>) => void;

  // Manejo de días
  addDay: (dayName: string, focus?: string, muscles?: MuscleGroup[]) => void;
  setDayMuscles: (dayId: string, muscles: MuscleGroup[]) => void;
  removeDay: (dayId: string) => void;
  updateDayName: (dayId: string, dayName: string, focus?: string) => void;

  // Manejo de bloques de ejercicios
  addSingleExercise: (
    dayId: string,
    exercise: SingleExerciseExecution,
    sets?: number,
    rest_seconds?: number
  ) => void;
  addSuperset: (
    dayId: string,
    title: string,
    exercises: SingleExerciseExecution[],
    sets?: number,
    rest_seconds?: number
  ) => void;
  updateBlock: (dayId: string, blockId: string, patch: Partial<WorkoutBlock>) => void;
  removeBlock: (dayId: string, blockId: string) => void;
  /** Sustituye un ejercicio (en superseries, el de la posición `exIndex`). */
  replaceExercise: (dayId: string, blockId: string, exIndex: number | null, execution: SingleExerciseExecution) => void;

  // Agrupar un ejercicio existente con otro para convertirlo en Superserie
  combineIntoSuperset: (
    dayId: string,
    firstBlockId: string,
    secondExercise: SingleExerciseExecution
  ) => void;
  removeExerciseFromSuperset: (dayId: string, blockId: string, exIndex: number) => void;

  // Reset
  reset: () => void;
}

export const useWorkoutBuilderStore = create<WorkoutBuilderState>((set) => ({
  clientId: null,
  routineName: 'Rutina Personalizada',
  days: [],
  savedStep: 1,
  isAiGenerated: false,
  notes: '',
  generation: DEFAULT_GENERATION,

  initBuilder: (clientId, defaultName = 'Rutina Personalizada', defaultDays = []) =>
    set({
      clientId,
      routineName: defaultName,
      days: defaultDays,
      savedStep: 1,
      isAiGenerated: false,
      notes: '',
      generation: DEFAULT_GENERATION,
    }),

  setRoutineName: (routineName) => set({ routineName }),
  setDays: (days) => set({ days }),
  setNotes: (notes) => set({ notes }),
  setSavedStep: (savedStep) => set({ savedStep }),
  setIsAiGenerated: (isAiGenerated) => set({ isAiGenerated }),
  setGeneration: (patch) => set((state) => ({ generation: { ...state.generation, ...patch } })),

  addDay: (dayName, focus = '', muscles = []) =>
    set((state) => ({
      days: [
        ...state.days,
        {
          id: `day-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          day_name: dayName,
          focus,
          muscles,
          blocks: [],
        },
      ],
    })),

  setDayMuscles: (dayId, muscles) =>
    set((state) => ({
      days: state.days.map((d) => (d.id === dayId ? { ...d, muscles } : d)),
    })),

  removeDay: (dayId) =>
    set((state) => ({
      days: state.days.filter((d) => d.id !== dayId),
    })),

  updateDayName: (dayId, dayName, focus) =>
    set((state) => ({
      days: state.days.map((d) =>
        d.id === dayId ? { ...d, day_name: dayName, ...(focus !== undefined ? { focus } : {}) } : d
      ),
    })),

  addSingleExercise: (dayId, exercise, sets = 4, rest_seconds = 90) =>
    set((state) => ({
      days: state.days.map((d) => {
        if (d.id !== dayId) return d;
        const newBlock: WorkoutBlock = {
          type: 'single',
          id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          exercise,
          sets,
          rest_seconds,
        };
        return {
          ...d,
          blocks: [...d.blocks, newBlock],
        };
      }),
    })),

  addSuperset: (dayId, title, exercises, sets = 3, rest_seconds = 120) =>
    set((state) => ({
      days: state.days.map((d) => {
        if (d.id !== dayId) return d;
        const newBlock: WorkoutBlock = {
          type: 'superset',
          id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: title || `Superserie`,
          sets,
          rest_seconds,
          exercises,
        };
        return {
          ...d,
          blocks: [...d.blocks, newBlock],
        };
      }),
    })),

  updateBlock: (dayId, blockId, patch) =>
    set((state) => ({
      days: state.days.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          blocks: d.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as WorkoutBlock) : b)),
        };
      }),
    })),

  removeBlock: (dayId, blockId) =>
    set((state) => ({
      days: state.days.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          blocks: d.blocks.filter((b) => b.id !== blockId),
        };
      }),
    })),

  replaceExercise: (dayId, blockId, exIndex, execution) =>
    set((state) => ({
      days: state.days.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          blocks: d.blocks.map((b) => {
            if (b.id !== blockId) return b;
            if (b.type === 'single') return { ...b, exercise: execution };
            return { ...b, exercises: b.exercises.map((ex, i) => (i === exIndex ? execution : ex)) };
          }),
        };
      }),
    })),

  combineIntoSuperset: (dayId, firstBlockId, secondExercise) =>
    set((state) => ({
      days: state.days.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          blocks: d.blocks.map((b) => {
            if (b.id !== firstBlockId) return b;
            if (b.type === 'single') {
              const supersetBlock: WorkoutBlock = {
                type: 'superset',
                id: b.id,
                title: `Superserie: ${b.exercise.name} + ${secondExercise.name}`,
                sets: b.sets,
                rest_seconds: b.rest_seconds,
                exercises: [b.exercise, secondExercise],
              };
              return supersetBlock;
            } else {
              // Ya era superserie, agregamos el siguiente ejercicio a la ronda
              return {
                ...b,
                exercises: [...b.exercises, secondExercise],
              };
            }
          }),
        };
      }),
    })),

  removeExerciseFromSuperset: (dayId, blockId, exIndex) =>
    set((state) => ({
      days: state.days.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          blocks: d.blocks
            .map((b) => {
              if (b.id !== blockId || b.type !== 'superset') return b;
              const remaining = b.exercises.filter((_, idx) => idx !== exIndex);
              if (remaining.length === 0) return null;
              if (remaining.length === 1) {
                // Convertir de vuelta a ejercicio individual
                const singleBlock: WorkoutBlock = {
                  type: 'single',
                  id: b.id,
                  exercise: remaining[0],
                  sets: b.sets,
                  rest_seconds: b.rest_seconds,
                };
                return singleBlock;
              }
              return {
                ...b,
                exercises: remaining,
              };
            })
            .filter(Boolean) as WorkoutBlock[],
        };
      }),
    })),

  reset: () =>
    set({
      clientId: null,
      routineName: 'Rutina Personalizada',
      days: [],
      savedStep: 1,
      isAiGenerated: false,
      notes: '',
      generation: DEFAULT_GENERATION,
    }),
}));
