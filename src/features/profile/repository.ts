import { supabase } from '@/lib/supabase';

import { Profile } from './types';

export async function getMyProfile(): Promise<Profile> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

  // Intentamos traer con description si existe la columna en Supabase
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, business_name, logo_url, description')
    .eq('id', userId)
    .single();

  if (error) {
    // Fallback por si la columna description no ha sido creada en la BD
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('profiles')
      .select('id, full_name, email, business_name, logo_url')
      .eq('id', userId)
      .single();
    if (fallbackError) throw new Error(fallbackError.message);
    return fallbackData as Profile;
  }

  return data as Profile;
}

export async function updateMyProfile(input: {
  full_name: string;
  business_name: string | null;
  description?: string | null;
  logo_url?: string;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

  const payload: Record<string, unknown> = {
    full_name: input.full_name.trim(),
    business_name: input.business_name?.trim() || null,
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.logo_url != null ? { logo_url: input.logo_url } : {}),
  };

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);

  if (error) {
    // Si falla porque la columna description no existe aún en la BD remota, reintentar sin ella
    if (error.message.includes('description') || error.code === '42703') {
      delete payload.description;
      const { error: retryError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);
      if (retryError) throw new Error(retryError.message);
      return;
    }
    throw new Error(error.message);
  }
}

/** Sube la imagen local (uri de expo-image-picker) al bucket "logos" y devuelve la URL pública. */
export async function uploadMyLogo(localUri: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

  const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${userId}/logo.${ext}`;

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, arrayBuffer, { contentType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from('logos').getPublicUrl(path);
  // Cache-bust: el nombre de archivo es siempre el mismo (upsert), así que sin esto
  // la imagen vieja se queda cacheada en el cliente tras subir una nueva.
  return `${data.publicUrl}?t=${Date.now()}`;
}
