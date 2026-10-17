import { DEFAULT_EXERCISES } from './defaultExercises';
import {
  Exercise,
  ExerciseMetric,
  ExerciseType,
  Laterality,
  MovementPattern,
  MuscleGroup,
  TrainingLevel,
} from './types';
import { EXERCISE_MEDIA_BUCKET } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export type CreateExerciseInput = {
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscles?: MuscleGroup[];
  equipment: string;
  extra_equipment?: string[];
  difficulty: TrainingLevel;
  description?: string | null;
  exercise_type?: ExerciseType | null;
  metric?: ExerciseMetric;
  laterality?: Laterality;
  movement_pattern?: MovementPattern | null;
  instructions?: string;
  tips?: string;
  cues?: string[];
  contraindications?: string[];
  aliases?: string[];
  parent_id?: string | null;
  video_path?: string | null;
  images?: string[] | null;
  image_url?: string;
  is_global?: boolean;
};

/** Limpia una lista de textos libres: sin vacíos ni repetidos. */
function cleanList(list: string[] | undefined): string[] {
  return [...new Set((list ?? []).map((item) => item.trim()).filter(Boolean))];
}

/** Traduce el formulario a columnas de `exercises`. Solo incluye los campos presentes en `input`. */
function toRow(input: Partial<CreateExerciseInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name.trim();
  if (input.muscle_group !== undefined) row.muscle_group = input.muscle_group;
  if (input.secondary_muscles !== undefined) row.secondary_muscles = input.secondary_muscles;
  if (input.equipment !== undefined) row.equipment = input.equipment;
  if (input.extra_equipment !== undefined) row.extra_equipment = input.extra_equipment;
  if (input.difficulty !== undefined) row.difficulty = input.difficulty;
  if (input.exercise_type !== undefined) row.exercise_type = input.exercise_type;
  if (input.metric !== undefined) row.metric = input.metric;
  if (input.laterality !== undefined) row.laterality = input.laterality;
  if (input.movement_pattern !== undefined) row.movement_pattern = input.movement_pattern;
  if (input.description !== undefined) row.description = input.description?.trim().slice(0, 200) || null;
  if (input.instructions !== undefined) row.instructions = input.instructions?.trim() || null;
  if (input.tips !== undefined) row.tips = input.tips?.trim() || null;
  if (input.cues !== undefined) row.cues = cleanList(input.cues);
  if (input.contraindications !== undefined) row.contraindications = cleanList(input.contraindications);
  if (input.aliases !== undefined) row.aliases = cleanList(input.aliases);
  if (input.parent_id !== undefined) row.parent_id = input.parent_id;
  if (input.video_path !== undefined) row.video_path = input.video_path;
  if ('images' in input) row.images = input.images || null;
  if (input.image_url !== undefined) row.image_url = input.image_url?.trim() || null;
  return row;
}

/**
 * Obtiene el rol del usuario actual (super_admin o trainer)
 */
export async function getCurrentUserRole(): Promise<{ isSuperAdmin: boolean; userId: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isSuperAdmin: false, userId: null };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    return {
      isSuperAdmin: profile?.role === 'super_admin',
      userId: user.id,
    };
  } catch {
    return { isSuperAdmin: false, userId: null };
  }
}

function defaultExercises(): Exercise[] {
  return DEFAULT_EXERCISES.map((ex, idx) => ({
    ...ex,
    id: `default-${idx}`,
    created_at: new Date().toISOString(),
    created_by: null,
  }));
}

/**
 * Lista todos los ejercicios accesibles (globales + personalizados del entrenador)
 */
export async function getExercises(): Promise<Exercise[]> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .is('archived_at', null)
      .order('name', { ascending: true });

    // Si la tabla aún no tiene datos cargados, usamos los predeterminados en memoria
    if (error || !data || data.length === 0) return defaultExercises();
    return data as Exercise[];
  } catch (err) {
    console.log('Error cargando ejercicios de Supabase, usando defaults:', err);
    return defaultExercises();
  }
}

/**
 * Crea un nuevo ejercicio (global si es super_admin, o personalizado del entrenador)
 */
export async function createExercise(input: CreateExerciseInput): Promise<Exercise> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Debes estar autenticado para crear ejercicios.');

  const { isSuperAdmin } = await getCurrentUserRole();

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      secondary_muscles: [],
      ...toRow(input),
      is_custom: !(isSuperAdmin && input.is_global),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Exercise;
}

/**
 * Actualiza un ejercicio existente (global o personalizado)
 */
export async function updateExercise(
  exerciseId: string,
  input: Partial<CreateExerciseInput>
): Promise<Exercise> {
  // Si el ejercicio era de la lista estática en memoria (id empieza con 'default-'), se crea una fila nueva
  if (exerciseId.startsWith('default-')) {
    return createExercise({
      name: 'Ejercicio',
      muscle_group: 'pecho',
      equipment: 'mancuernas',
      difficulty: 'intermedio',
      ...input,
    } as CreateExerciseInput);
  }

  const { isSuperAdmin } = await getCurrentUserRole();
  const row = toRow(input);
  if (input.is_global !== undefined && isSuperAdmin) row.is_custom = !input.is_global;

  const { data, error } = await supabase
    .from('exercises')
    .update(row)
    .eq('id', exerciseId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Exercise;
}


/**
 * Elimina un ejercicio (solo si es el creador o super_admin)
 */
export type RemoveExerciseResult = 'deleted' | 'archived';

/**
 * Quita un ejercicio del banco.
 * - Oficial (catálogo global): siempre se archiva, porque otros entrenadores pueden usarlo en rutinas
 *   que este usuario no puede ver.
 * - Personalizado: se borra si ninguna rutina lo usa; si alguna lo usa, se archiva para no romperla.
 */
export async function removeExercise(exercise: Exercise): Promise<RemoveExerciseResult> {
  let archive = !exercise.is_custom;
  if (!archive) {
    const { data: inUse, error: usageError } = await supabase.rpc('exercise_in_use', {
      p_exercise_id: exercise.id,
    });
    if (usageError) throw new Error(usageError.message);
    archive = inUse === true;
  }

  if (archive) {
    const { error } = await supabase
      .from('exercises')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', exercise.id);
    if (error) throw new Error(error.message);
    return 'archived';
  }

  const { error } = await supabase.from('exercises').delete().eq('id', exercise.id);
  if (error) throw new Error(error.message);
  return 'deleted';
}

/**
 * Sube una imagen de ejercicio a Supabase Storage y devuelve su URL pública
 */
export async function uploadExerciseImage(localUri: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id || 'public';
  const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${userId}/exercises/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, arrayBuffer, { contentType, upsert: true });

  if (uploadError) {
    const { error: fallbackErr } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, { contentType, upsert: true });
    if (fallbackErr) throw new Error(uploadError.message);
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  }

  const { data } = supabase.storage.from('logos').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}


/** Tamaño máximo del vídeo demostrativo (igual que el límite del bucket). */
export const MAX_EXERCISE_VIDEO_BYTES = 50 * 1024 * 1024;

/** Sube el vídeo demostrativo al bucket privado y devuelve su ruta (se guarda en `video_path`). */
export async function uploadExerciseVideo(localUri: string, mimeType?: string | null): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

  const isQuickTime = mimeType === 'video/quicktime' || localUri.toLowerCase().endsWith('.mov');
  const ext = isQuickTime ? 'mov' : 'mp4';
  const path = `${userId}/videos/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_EXERCISE_VIDEO_BYTES) {
    throw new Error('El vídeo supera los 50 MB. Graba uno más corto (máximo 30 segundos).');
  }

  const { error } = await supabase.storage
    .from(EXERCISE_MEDIA_BUCKET)
    .upload(path, arrayBuffer, { contentType: isQuickTime ? 'video/quicktime' : 'video/mp4', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
