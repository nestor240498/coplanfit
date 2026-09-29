import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Fotos de clientes (avatares y fotos de progreso): información CONFIDENCIAL.
 * - Bucket PRIVADO. Solo accede quien gestiona al cliente (RLS en storage, ver migración 006).
 * - En BD se guarda la ruta del objeto ("<client_id>/<tipo>/<archivo>.jpg"), nunca una URL.
 * - Para mostrarla se pide una URL firmada de vida corta; la imagen solo se cachea en memoria.
 * - Antes de subir se vuelve a codificar la foto: elimina EXIF (incluida la ubicación GPS).
 * Los valores antiguos que ya son URL http(s) se usan tal cual (compatibilidad).
 */
export const CLIENT_MEDIA_BUCKET = 'client-media';

const SIGNED_URL_TTL_S = 5 * 60;
/** Margen para no entregar una URL que caduque mientras se carga la imagen. */
const REFRESH_MARGIN_MS = 60 * 1000;
/** Lado mayor máximo de las fotos subidas. */
const MAX_SIDE_PX = 1600;

export type ClientMediaKind = 'avatar' | 'measurements';

/** true si el valor es una ruta del bucket (no una URL ni un archivo local). */
export function isStoragePath(ref: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:/i.test(ref);
}

/** true si es un archivo local recién elegido que todavía hay que subir. */
export function isLocalUri(ref: string): boolean {
  return /^(file|content|ph|assets-library|blob|data):/i.test(ref);
}

/** Vuelve a codificar la imagen como JPEG sin metadatos (EXIF/GPS) y limita su tamaño. */
async function sanitizeImage(localUri: string): Promise<string> {
  const original = await ImageManipulator.manipulate(localUri).renderAsync();
  const longest = Math.max(original.width, original.height);
  const image =
    longest > MAX_SIDE_PX
      ? await ImageManipulator.manipulate(original)
          .resize(original.width >= original.height ? { width: MAX_SIDE_PX } : { height: MAX_SIDE_PX })
          .renderAsync()
      : original;
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return saved.uri;
}

function randomId(): string {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0')).join('');
}

export async function uploadClientMedia(clientId: string, localUri: string, kind: ClientMediaKind): Promise<string> {
  const cleanUri = await sanitizeImage(localUri);
  // La primera carpeta debe ser el ID del cliente: las políticas RLS del bucket la comprueban
  const path = `${clientId}/${kind}/${randomId()}.jpg`;

  const response = await fetch(cleanUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(CLIENT_MEDIA_BUCKET)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

// ---- URLs firmadas: caché en memoria + agrupación de peticiones del mismo tick, por bucket ----

/** Vídeos demostrativos de ejercicios (privado: el autor, o todos si el ejercicio es oficial). */
export const EXERCISE_MEDIA_BUCKET = 'exercise-media';

export type PrivateBucket = typeof CLIENT_MEDIA_BUCKET | typeof EXERCISE_MEDIA_BUCKET;

const cache = new Map<string, { url: string; expiresAt: number }>();
let pending: { bucket: PrivateBucket; path: string; resolve: (url: string | null) => void }[] = [];
let flushScheduled = false;

const cacheKey = (bucket: PrivateBucket, path: string) => `${bucket}:${path}`;

async function flush() {
  const batch = pending;
  pending = [];
  flushScheduled = false;

  const buckets = [...new Set(batch.map((p) => p.bucket))];
  const signed = new Map<string, string>();
  await Promise.all(
    buckets.map(async (bucket) => {
      const paths = [...new Set(batch.filter((p) => p.bucket === bucket).map((p) => p.path))];
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_S);
      if (error || !data) return;
      const expiresAt = Date.now() + SIGNED_URL_TTL_S * 1000;
      for (const item of data) {
        if (item.path && item.signedUrl) {
          signed.set(cacheKey(bucket, item.path), item.signedUrl);
          cache.set(cacheKey(bucket, item.path), { url: item.signedUrl, expiresAt });
        }
      }
    })
  );
  for (const p of batch) p.resolve(signed.get(cacheKey(p.bucket, p.path)) ?? null);
}

function getCachedUrl(bucket: PrivateBucket, path: string): string | null {
  const hit = cache.get(cacheKey(bucket, path));
  return hit && hit.expiresAt - REFRESH_MARGIN_MS > Date.now() ? hit.url : null;
}

/** Devuelve una URL mostrable para una referencia guardada en BD (ruta del bucket, URL o archivo local). */
export function resolveMediaUrl(ref: string, bucket: PrivateBucket = CLIENT_MEDIA_BUCKET): Promise<string | null> {
  if (!isStoragePath(ref)) return Promise.resolve(ref);
  const cached = getCachedUrl(bucket, ref);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    pending.push({ bucket, path: ref, resolve });
    if (!flushScheduled) {
      flushScheduled = true;
      setTimeout(flush, 0);
    }
  });
}

/** Resuelve varias referencias a la vez (p. ej. para los PDF). Omite las que no se pudieron firmar. */
export async function resolveMediaUrls(refs: string[] | null | undefined): Promise<string[]> {
  const urls = await Promise.all((refs ?? []).map((ref) => resolveMediaUrl(ref)));
  return urls.filter((u): u is string => Boolean(u));
}

/** Borra de memoria las URLs firmadas y las imágenes decodificadas (al cerrar sesión). */
export async function clearMediaCache(): Promise<void> {
  cache.clear();
  await Image.clearMemoryCache();
}

/**
 * Fuente para expo-image. `cacheKey` = ruta del bucket para que la caché en memoria
 * sobreviva aunque la URL firmada cambie.
 */
export function useMediaSource(
  ref: string | null | undefined,
  bucket: PrivateBucket = CLIENT_MEDIA_BUCKET
): { uri: string; cacheKey?: string } | null {
  const [resolved, setResolved] = useState<{ ref: string; uri: string } | null>(null);

  useEffect(() => {
    if (!ref) return;
    let active = true;
    resolveMediaUrl(ref, bucket).then((uri) => {
      if (active && uri) setResolved({ ref, uri });
    });
    return () => {
      active = false;
    };
  }, [ref, bucket]);

  if (!ref) return null;
  if (!isStoragePath(ref)) return { uri: ref };
  const uri = resolved?.ref === ref ? resolved.uri : getCachedUrl(bucket, ref);
  return uri ? { uri, cacheKey: ref } : null;
}
