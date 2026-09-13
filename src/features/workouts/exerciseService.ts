import { DEFAULT_EXERCISES } from './defaultExercises';
import { Exercise, ExerciseStep, MuscleGroup, TrainingLevel } from './types';
import { supabase } from '@/lib/supabase';

export type CreateExerciseInput = {
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscles?: MuscleGroup[];
  equipment: string;
  difficulty: TrainingLevel;
  instructions?: string;
  tips?: string;
  images?: string[] | null;
  image_url?: string;
  is_global?: boolean;
};

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

/**
 * Lista todos los ejercicios accesibles (globales + personalizados del entrenador)
 */
export async function getExercises(): Promise<Exercise[]> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      // Si la tabla aún no tiene datos cargados, usamos los predeterminados en memoria
      return DEFAULT_EXERCISES.map((ex, idx) => ({
        ...ex,
        id: `default-${idx}`,
        created_at: new Date().toISOString(),
        created_by: null,
      }));
    }

    return data as Exercise[];
  } catch (err) {
    console.log('Error cargando ejercicios de Supabase, usando defaults:', err);
    return DEFAULT_EXERCISES.map((ex, idx) => ({
      ...ex,
      id: `default-${idx}`,
      created_at: new Date().toISOString(),
      created_by: null,
    }));
  }
}

/**
 * Crea un nuevo ejercicio (global si es super_admin, o personalizado del entrenador)
 */
export async function createExercise(input: CreateExerciseInput): Promise<Exercise> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Debes estar autenticado para crear ejercicios.');

  const { isSuperAdmin } = await getCurrentUserRole();
  const isCustom = !(isSuperAdmin && input.is_global);

  const newExercisePayload = {
    name: input.name.trim(),
    muscle_group: input.muscle_group,
    secondary_muscles: input.secondary_muscles || [],
    equipment: input.equipment,
    difficulty: input.difficulty,
    instructions: input.instructions?.trim() || null,
    tips: input.tips?.trim() || null,
    images: input.images || null,
    image_url: input.image_url?.trim() || null,
    is_custom: isCustom,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from('exercises')
    .insert(newExercisePayload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Exercise;
}

/**
 * Actualiza un ejercicio existente (global o personalizado)
 */
export async function updateExercise(
  exerciseId: string,
  input: Partial<CreateExerciseInput>
): Promise<Exercise> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Debes estar autenticado para editar ejercicios.');

  const { isSuperAdmin } = await getCurrentUserRole();

  const updatePayload: Record<string, any> = {};

  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.muscle_group !== undefined) updatePayload.muscle_group = input.muscle_group;
  if (input.secondary_muscles !== undefined) updatePayload.secondary_muscles = input.secondary_muscles;
  if (input.equipment !== undefined) updatePayload.equipment = input.equipment;
  if (input.difficulty !== undefined) updatePayload.difficulty = input.difficulty;
  if (input.instructions !== undefined) updatePayload.instructions = input.instructions?.trim() || null;
  if (input.tips !== undefined) updatePayload.tips = input.tips?.trim() || null;
  if ('images' in input) updatePayload.images = input.images || null;
  if (input.image_url !== undefined) updatePayload.image_url = input.image_url?.trim() || null;
  if (input.is_global !== undefined && isSuperAdmin) {
    updatePayload.is_custom = !input.is_global;
  }

  // Si el ejercicio era de la lista estática en memoria (id empieza con 'default-'), creamos una fila en Supabase
  if (exerciseId.startsWith('default-')) {
    const newPayload = {
      name: input.name?.trim() || 'Ejercicio',
      muscle_group: input.muscle_group || 'pecho',
      secondary_muscles: input.secondary_muscles || [],
      equipment: input.equipment || 'mancuernas',
      difficulty: input.difficulty || 'intermedio',
      instructions: input.instructions?.trim() || null,
      tips: input.tips?.trim() || null,
      images: input.images || null,
      image_url: input.image_url?.trim() || null,
      is_custom: !(isSuperAdmin && input.is_global),
      created_by: user.id,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('exercises')
      .insert(newPayload)
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message);
    return inserted as Exercise;
  }

  const { data, error } = await supabase
    .from('exercises')
    .update(updatePayload)
    .eq('id', exerciseId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Exercise;
}

/**
 * Elimina un ejercicio (solo si es el creador o super_admin)
 */
export async function deleteExercise(exerciseId: string): Promise<void> {
  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', exerciseId);

  if (error) {
    throw new Error(error.message);
  }
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

