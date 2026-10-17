import { edgeFunctionError, isQuotaError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import {
  ExerciseMetric,
  ExerciseStep,
  ExerciseType,
  Laterality,
  MovementPattern,
  MuscleGroup,
  TrainingLevel,
} from './types';

/** Propuesta de la IA para el alta rápida: el entrenador la revisa antes de guardar. */
export type ExerciseClassification = {
  muscle_group: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: string;
  extra_equipment: string[];
  exercise_type: ExerciseType;
  metric: ExerciseMetric;
  laterality: Laterality;
  movement_pattern: MovementPattern;
  difficulty: TrainingLevel;
  cues: string[];
  contraindications: string[];
  aliases: string[];
  /** Una frase: qué es y qué trabaja (tarjeta del banco). */
  description: string;
};

/** Clasifica un ejercicio a partir de su nombre (Edge Function classify-exercise, Gemini). */
export async function classifyExercise(name: string): Promise<ExerciseClassification> {
  const { data, error } = await supabase.functions.invoke('classify-exercise', { body: { name: name.trim() } });
  if (error) throw await edgeFunctionError(error, 'No se pudo completar con IA. Rellena los datos a mano.');
  return data as ExerciseClassification;
}

export type ExerciseAiDetails = {
  instructions: string;
  tips: string;
  pattern: string;
  images: string[];
  steps?: ExerciseStep[];
  tempo?: string;
  primary_muscles?: string[];
  /** 'ai' si lo redactó Gemini; 'local' si es el texto genérico de respaldo. */
  source: 'ai' | 'local';
};

export type GenerateAiOptions = {
  instructions?: boolean;
  tips?: boolean;
  images?: boolean;
  customSteps?: string[];
  /** Dentro de «Completar datos con IA»: la técnica ya está incluida en esa generación. */
  bundled?: boolean;
};

/**
 * Invoca la Edge Function de Supabase con Google Gemini para diseñar
 * las instrucciones biomecánicas, consejos preventivos e imágenes de pasos
 * tomando en cuenta las opciones granulares seleccionadas por el usuario
 */
export async function generateExerciseAiDetails(
  exerciseName: string,
  muscleGroup: MuscleGroup,
  equipment: string,
  difficulty = 'intermedio',
  currentInstructions = '',
  currentTips = '',
  options: GenerateAiOptions = { instructions: true, tips: true, images: false }
): Promise<ExerciseAiDetails> {
  const name = exerciseName.trim();

  const generateInstructions = options.instructions !== false;
  const generateTips = options.tips !== false;
  const generateImages = options.images === true;
  const customSteps = options.customSteps || [];

  try {
    // 🌐 Petición HTTP a Supabase Edge Function con todo el contexto y checks
    const { data, error } = await supabase.functions.invoke('generate-exercise-details', {
      body: {
        name,
        muscle_group: muscleGroup,
        equipment,
        difficulty,
        current_instructions: currentInstructions.trim() || undefined,
        current_tips: currentTips.trim() || undefined,
        custom_steps: customSteps,
        generate_instructions: generateInstructions,
        generate_tips: generateTips,
        generate_images: generateImages,
        bundled: options.bundled === true,
      },
    });

    // Sin generaciones disponibles no se inventa un texto genérico: se avisa
    if (error) {
      const failure = await edgeFunctionError(error, 'La IA no respondió.');
      if (isQuotaError(failure)) throw failure;
    }

    if (!error && data) {
      const rawSteps = Array.isArray(data.steps) ? data.steps : [];
      const images = Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : rawSteps.map((s: any) => s.image_url).filter((url: any): url is string => Boolean(url));

      return {
        instructions: data.instructions || currentInstructions,
        tips: data.tips || currentTips,
        pattern: data.pattern || 'squat',
        images: images,
        steps: rawSteps,
        tempo: data.tempo,
        primary_muscles: data.primary_muscles,
        source: 'ai',
      };
    }
  } catch (err) {
    if (isQuotaError(err)) throw err;
    console.warn('Fallback a generador local por error en Edge Function:', err);
  }

  // Fallback biomecánico robusto
  const lower = name.toLowerCase();
  let instructions = currentInstructions.trim();
  let tips = currentTips.trim();
  let pattern = 'squat';

  if (generateInstructions && !instructions) {
    if (lower.includes('banca') || lower.includes('pecho') || lower.includes('press plano')) {
      pattern = 'press_horizontal';
      instructions =
        '1. Posición inicial: Acuéstate en el banco con los pies apoyados firmemente, retracción escapular activa y glúteos en contacto con la banca.\n\n' +
        '2. Fase excéntrica: Desciende la carga de forma controlada hacia el esternón, manteniendo los codos a 45-60 grados respecto al torso.\n\n' +
        '3. Fase concéntrica: Empuja con fuerza manteniendo la retracción escapular y extiende los brazos sin bloquear bruscamente los codos.';
    } else if (lower.includes('sentadilla') || lower.includes('squat') || lower.includes('prensa')) {
      pattern = 'squat';
      instructions =
        '1. Posición inicial: Pies al ancho de hombros con ligera rotación externa. Activa el core.\n\n' +
        '2. Fase excéntrica: Inicia el movimiento flexionando caderas y rodillas simultáneamente hasta que los muslos queden al menos paralelos al suelo.\n\n' +
        '3. Fase concéntrica: Empuja contra el suelo distribuyendo el peso en todo el pie hasta volver a la posición erguida.';
    } else {
      pattern = 'squat';
      instructions =
        `1. Posición inicial: Adopta una postura estable y erguida adecuada para ${name}, ajustando ${equipment} a tu altura anatómica.\n\n` +
        `2. Fase excéntrica: Desciende la carga controlando la cadencia (2-3 segundos) e inhalando profundamente.\n\n` +
        `3. Fase concéntrica: Aplica fuerza de forma explosiva y exhala, contrayendo fuertemente ${muscleGroup}.`;
    }
  }

  if (generateTips && !tips) {
    tips = 'Mantén una cadencia controlada (2 segundos de bajada) y cuida la alineación articular en todo momento.';
  }

  // Sin imágenes generadas: las fotos o el vídeo del ejercicio los aporta el entrenador
  const images: string[] = [];

  return {
    instructions,
    tips,
    pattern,
    images,
    source: 'local',
  };
}
