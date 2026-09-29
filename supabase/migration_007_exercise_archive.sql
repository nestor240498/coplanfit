-- CoplanFit — migración 007: archivar ejercicios del banco
-- Ejecutar en el SQL Editor de Supabase (o `supabase db query --linked -f <este archivo>`).
-- Idempotente.

-- Un ejercicio archivado desaparece del banco y del selector, pero las rutinas que ya lo usan
-- lo conservan (guardan su nombre y su exercise_id dentro de workout_plan_versions.data).
alter table public.exercises
add column if not exists archived_at timestamptz;

create index if not exists exercises_active_idx on public.exercises (name)
where archived_at is null;

-- ¿Aparece el ejercicio en alguna rutina visible para quien pregunta?
-- security invoker: el RLS limita la búsqueda a las rutinas de los clientes del entrenador.
create or replace function public.exercise_in_use(p_exercise_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.workout_plan_versions w
    where w.data::text like '%' || p_exercise_id::text || '%'
  );
$$;
