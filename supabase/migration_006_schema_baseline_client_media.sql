-- CoplanFit — migración 006: línea base del esquema real + bucket privado de fotos de clientes
-- Ejecutar en el SQL Editor de Supabase (o `supabase db query --linked -f <este archivo>`).
-- Idempotente: se puede ejecutar varias veces sin efectos secundarios.

-- ============================================================
-- 1. Columnas que existen en la base de datos pero no estaban en ningún SQL del repo
--    (se crearon a mano en el dashboard). Tipos copiados de information_schema.
-- ============================================================
alter table public.profiles
add column if not exists description text;

alter table public.exercises
add column if not exists steps jsonb default '[]'::jsonb,
add column if not exists images jsonb default '[]'::jsonb,
add column if not exists image_url text,
add column if not exists lottie_data jsonb;

alter table public.measurements
-- Composición corporal
add column if not exists muscle_mass_pct numeric(4, 1),
add column if not exists visceral_fat numeric(4, 1),
add column if not exists bmr_kcal numeric(6, 0),
-- Perímetros (cm)
add column if not exists neck_cm numeric(5, 1),
add column if not exists shoulders_cm numeric(5, 1),
add column if not exists chest_cm numeric(5, 1),
add column if not exists abdomen_cm numeric(5, 1),
add column if not exists arm_right_cm numeric(5, 1),
add column if not exists arm_left_cm numeric(5, 1),
add column if not exists arm_flexed_right_cm numeric(5, 1),
add column if not exists arm_flexed_left_cm numeric(5, 1),
add column if not exists forearm_right_cm numeric(5, 1),
add column if not exists forearm_left_cm numeric(5, 1),
add column if not exists thigh_right_cm numeric(5, 1),
add column if not exists thigh_left_cm numeric(5, 1),
add column if not exists calf_right_cm numeric(5, 1),
add column if not exists calf_left_cm numeric(5, 1),
-- Plicometría (mm)
add column if not exists biceps_mm numeric(4, 1),
add column if not exists suprailiac_mm numeric(4, 1),
add column if not exists supraspinal_mm numeric(4, 1),
add column if not exists thigh_mm numeric(4, 1),
add column if not exists calf_mm numeric(4, 1),
add column if not exists chest_mm numeric(4, 1),
-- Legacy: la app ya no las usa (commit 13cb0c8), pero existen con datos. No se eliminan.
add column if not exists bone_mass_kg numeric(4, 1),
add column if not exists water_pct numeric(4, 1),
add column if not exists midaxillary_mm numeric(4, 1);

-- ============================================================
-- 2. Bucket PRIVADO para fotos de clientes (avatares y fotos de progreso) — CONFIDENCIAL
--    Ruta obligatoria: <client_id>/<avatar|measurements>/<archivo>.jpg
--    El acceso depende de la relación con el cliente, no de quién subió el archivo:
--    solo su entrenador. Ni lectura pública ni acceso de super_admin.
--    Fase 2: ampliar can_access_client_media() para el usuario sin entrenador
--    (clients.user_id = auth.uid() y trainer_id is null) y lectura del cliente vinculado.
--    Regla decidida: si el cliente se desvincula (queda inactivo para el entrenador),
--    el entrenador conserva el historial de datos pero PIERDE el acceso a las fotos.
-- ============================================================
insert into
  storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('client-media', 'client-media', false, 10485760, array['image/jpeg']) -- la app sube siempre JPEG sin EXIF
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- security invoker: se evalúa con los permisos (y el RLS de clients) de quien hace la petición
create or replace function public.can_access_client_media(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id::text = (storage.foldername(object_name))[1]
      and c.trainer_id = auth.uid()
  );
$$;

drop policy if exists "Fotos de clientes: lectura" on storage.objects;
create policy "Fotos de clientes: lectura"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'client-media' and public.can_access_client_media(name));

drop policy if exists "Fotos de clientes: subida" on storage.objects;
create policy "Fotos de clientes: subida"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'client-media' and public.can_access_client_media(name));

drop policy if exists "Fotos de clientes: borrado" on storage.objects;
create policy "Fotos de clientes: borrado"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'client-media' and public.can_access_client_media(name));
-- Sin policy de UPDATE a propósito: las fotos no se sobrescriben (la app sube con upsert: false).
