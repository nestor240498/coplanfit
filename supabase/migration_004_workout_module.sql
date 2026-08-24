-- CoplanFit — migración 004: Módulo de Entrenamiento, Perfil Fitness y Banco de Ejercicios
-- Ejecutar en el SQL Editor de Supabase.

-- ============================================================
-- 1. Campos de Perfil Fitness en la tabla clients
-- ============================================================
alter table public.clients
add column if not exists training_goal text,
add column if not exists training_level text,
add column if not exists equipment_access text,
add column if not exists days_per_week int check (days_per_week between 1 and 7),
add column if not exists session_duration_min int,
add column if not exists training_notes text;

-- Recrear la vista clients_with_current_plan con las nuevas columnas
drop view if exists public.clients_with_current_plan;

create view public.clients_with_current_plan
with (security_invoker = true) as
select
  c.*,
  pv.version as current_plan_version
from public.clients c
  left join public.plan_versions pv on pv.client_id = c.id and pv.is_current;

-- ============================================================
-- 2. Banco de Ejercicios (Exercise Library)
-- ============================================================
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  muscle_group text not null, -- 'pecho', 'espalda', 'cuadriceps', 'isquiotibiales', 'hombros', 'biceps', 'triceps', 'gluteos', 'core', 'gemelos'
  secondary_muscles text[] default '{}',
  equipment text not null, -- 'barra', 'mancuernas', 'polea', 'maquina', 'peso_corporal', 'bandas'
  difficulty text not null default 'intermedio', -- 'principiante', 'intermedio', 'avanzado'
  instructions text,
  tips text,
  lottie_url text,
  is_custom boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists exercises_muscle_idx on public.exercises (muscle_group);
create index if not exists exercises_equipment_idx on public.exercises (equipment);

alter table public.exercises enable row level security;

-- Limpieza y creación de políticas de exercises
drop policy if exists "Lectura de ejercicios para usuarios autenticados" on public.exercises;
create policy "Lectura de ejercicios para usuarios autenticados"
  on public.exercises for select
  using (auth.uid() is not null);

drop policy if exists "Entrenadores gestionan sus ejercicios personalizados" on public.exercises;
create policy "Entrenadores gestionan sus ejercicios personalizados"
  on public.exercises for all
  using (auth.uid() = created_by or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
  ))
  with check (auth.uid() = created_by or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
  ));

-- ============================================================
-- 3. Planes de Entrenamiento y Versiones
-- ============================================================
create table if not exists public.workout_plan_versions (
  id uuid primary key default gen_random_uuid (),
  client_id uuid not null references public.clients (id) on delete cascade,
  version int not null,
  is_current boolean not null default false,
  name text not null default 'Plan de Entrenamiento',
  data jsonb not null default '{}'::jsonb, -- Días, bloques, ejercicios, series, reps, descansos, superseries
  created_at timestamptz not null default now(),
  unique (client_id, version)
);

create unique index if not exists workout_plan_versions_one_current_idx on public.workout_plan_versions (client_id)
where is_current;

create index if not exists workout_plan_versions_client_idx on public.workout_plan_versions (client_id, version desc);

alter table public.workout_plan_versions enable row level security;

-- Limpieza y creación de políticas de workout_plan_versions
drop policy if exists "El entrenador gestiona los planes de entrenamiento de sus clientes" on public.workout_plan_versions;
create policy "El entrenador gestiona los planes de entrenamiento de sus clientes"
  on public.workout_plan_versions for all
  using (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid ()))
  with check (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid ()));
