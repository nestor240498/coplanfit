import { Exercise, equipmentLabel, muscleLabel } from './types';

/** Minúsculas, sin tildes ni signos: "Bíceps" y "biceps" son lo mismo al buscar. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Busca por nombre, sinónimos, grupo muscular (principal o secundario) y equipamiento. Cada palabra debe coincidir. */
export function matchesExerciseQuery(ex: Exercise, query: string): boolean {
  const words = normalizeText(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(
    [
      ex.name,
      ...(ex.aliases ?? []),
      muscleLabel(ex.muscle_group),
      ...(ex.secondary_muscles ?? []).map(muscleLabel),
      equipmentLabel(ex.equipment),
    ].join(' ')
  );
  return words.every((w) => haystack.includes(w));
}

const STOPWORDS = new Set(['de', 'del', 'con', 'en', 'la', 'el', 'los', 'las', 'a', 'al', 'y', 'o', 'por', 'para']);

function significantWords(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(' ')
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
  );
}

/**
 * Ejercicios ya existentes con un nombre muy parecido (para avisar antes de crear un duplicado).
 * Parecido = casi todas las palabras significativas del nombre más corto aparecen en el otro
 * ("Press banca" ≈ "Press de banca plano con barra"), con al menos 2 en común salvo nombres de una palabra.
 */
export function findSimilarExercises(name: string, exercises: Exercise[], excludeId?: string, limit = 3): Exercise[] {
  const target = significantWords(name);
  if (target.size === 0) return [];

  return exercises
    .filter((ex) => ex.id !== excludeId)
    .map((ex) => {
      const words = significantWords(ex.name);
      const shared = [...target].filter((w) => words.has(w)).length;
      const smaller = Math.min(target.size, words.size);
      const union = new Set([...target, ...words]).size;
      const similar = smaller > 0 && shared / smaller >= 0.75 && (shared >= 2 || smaller === 1);
      return { ex, similar, closeness: shared / union };
    })
    .filter(({ similar }) => similar)
    .sort((a, b) => b.closeness - a.closeness)
    .slice(0, limit)
    .map(({ ex }) => ex);
}

/**
 * Ejercicios que pueden sustituir a otro en una rutina (máquina ocupada, falta de equipo, molestia):
 * mismo patrón de movimiento; en aislamiento o sin patrón, además el mismo músculo principal.
 * Primero los del mismo músculo y las variantes directas.
 */
export function findSubstitutes(target: Exercise, exercises: Exercise[], limit = 6): Exercise[] {
  const strictMuscle = !target.movement_pattern || target.movement_pattern === 'aislamiento';
  const related = (ex: Exercise) => ex.parent_id === target.id || target.parent_id === ex.id;

  return exercises
    .filter((ex) => {
      if (ex.id === target.id) return false;
      if (related(ex)) return true;
      if (strictMuscle) return ex.muscle_group === target.muscle_group && ex.movement_pattern === target.movement_pattern;
      return ex.movement_pattern === target.movement_pattern;
    })
    .map((ex) => ({
      ex,
      score: (related(ex) ? 2 : 0) + (ex.muscle_group === target.muscle_group ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name))
    .slice(0, limit)
    .map(({ ex }) => ex);
}

/** Datos iniciales para crear una variante de un ejercicio (hereda la clasificación, no la técnica ni las fotos). */
export function variantTemplate(base: Exercise): Partial<Exercise> {
  return {
    name: '',
    muscle_group: base.muscle_group,
    secondary_muscles: base.secondary_muscles,
    equipment: base.equipment,
    extra_equipment: base.extra_equipment,
    difficulty: base.difficulty,
    exercise_type: base.exercise_type,
    metric: base.metric,
    laterality: base.laterality,
    movement_pattern: base.movement_pattern,
    contraindications: base.contraindications,
    parent_id: base.id,
  };
}

/** Copia completa de un ejercicio oficial como ejercicio propio, enlazada al original. */
export function personalCopyTemplate(official: Exercise): Partial<Exercise> {
  // El formulario solo toma los campos editables (no id, autor ni origen)
  return { ...official, name: `${official.name} (mi versión)`, parent_id: official.id };
}
