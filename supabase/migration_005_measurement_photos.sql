-- CoplanFit — migración 005: fotos de progreso en mediciones antropométricas
-- Ejecutar en el SQL Editor del dashboard de Supabase (https://supabase.com/dashboard/project/_/sql)

-- 1. Añadir columna photos (array de texto con URLs de imágenes) a la tabla measurements si no existe
alter table public.measurements
add column if not exists photos text[] default '{}'::text[];

-- 2. Asegurar que las políticas RLS permitan lectura y escritura en storage (bucket 'logos' / 'avatars')
-- Si ya tienes creado el bucket 'logos' o 'avatars', las fotos se guardan en:
-- ${trainerId}/clients/${clientId}/measurements/...
