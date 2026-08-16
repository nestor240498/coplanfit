-- CoplanFit — migración 002: ficha de cliente completa
-- Ejecutar en el SQL Editor de Supabase, después de schema.sql.

-- ============================================================
-- 1. Notas médicas (tab Salud) separadas de las notas generales (tab Datos)
-- ============================================================
alter table public.clients
add column if not exists medical_notes text;

-- ============================================================
-- 2. Bucket de Storage para el logo del entrenador (perfil → PDF)
-- ============================================================
insert into
  storage.buckets (id, name, public)
values
  ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "Lectura pública de logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "El entrenador sube su propio logo"
  on storage.objects for insert
  with check (bucket_id = 'logos' and (storage.foldername(name)) [1] = auth.uid ()::text);

create policy "El entrenador actualiza su propio logo"
  on storage.objects for update
  using (bucket_id = 'logos' and (storage.foldername(name)) [1] = auth.uid ()::text);

create policy "El entrenador borra su propio logo"
  on storage.objects for delete
  using (bucket_id = 'logos' and (storage.foldername(name)) [1] = auth.uid ()::text);
