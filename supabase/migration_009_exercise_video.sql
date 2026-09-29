-- CoplanFit — migración 009: vídeo propio de ejercicios + privacidad de ejercicios personalizados
-- Ejecutar con `supabase db query --linked -f <este archivo>` (o en el SQL Editor). Idempotente.

-- ============================================================
-- 1. Privacidad: un ejercicio personalizado solo lo ve quien lo creó
--    (antes cualquier usuario con sesión veía los ejercicios personalizados de todos)
-- ============================================================
drop policy if exists "Lectura de ejercicios para usuarios autenticados" on public.exercises;
drop policy if exists "Lectura de ejercicios oficiales y propios" on public.exercises;
create policy "Lectura de ejercicios oficiales y propios"
  on public.exercises for select
  to authenticated
  using (
    is_custom = false
    or created_by = auth.uid ()
    or exists (select 1 from public.profiles p where p.id = auth.uid () and p.role = 'super_admin')
  );

-- ============================================================
-- 2. Vídeo demostrativo del ejercicio (grabado por el entrenador)
--    Ruta obligatoria: <uid del autor>/videos/<archivo>
-- ============================================================
alter table public.exercises
add column if not exists video_path text;

insert into
  storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('exercise-media', 'exercise-media', false, 52428800, array['video/mp4', 'video/quicktime']) -- 50 MB
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lectura: el autor, o cualquier usuario con sesión si el vídeo es de un ejercicio oficial.
-- Fase 2: añadir los clientes vinculados cuyo entrenador usa el ejercicio en sus rutinas.
drop policy if exists "Vídeos de ejercicios: lectura" on storage.objects;
create policy "Vídeos de ejercicios: lectura"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'exercise-media'
    and (
      (storage.foldername(name)) [1] = auth.uid ()::text
      or exists (
        select 1 from public.exercises e
        where e.video_path = storage.objects.name and e.is_custom = false
      )
    )
  );

drop policy if exists "Vídeos de ejercicios: subida" on storage.objects;
create policy "Vídeos de ejercicios: subida"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'exercise-media' and (storage.foldername(name)) [1] = auth.uid ()::text);

drop policy if exists "Vídeos de ejercicios: borrado" on storage.objects;
create policy "Vídeos de ejercicios: borrado"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'exercise-media' and (storage.foldername(name)) [1] = auth.uid ()::text);
