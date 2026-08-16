-- CoplanFit — esquema Fase 1 (vista entrenador)
-- Ejecutar en el SQL Editor de Supabase (una sola vez, en orden).

-- ============================================================
-- 1. Perfil del entrenador (extiende auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  business_name text,
  description text,
  logo_url text,
  role text not null default 'trainer' check (role in ('trainer', 'super_admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Cada usuario ve su propio perfil"
  on public.profiles for select using (auth.uid() = id);
create policy "Cada usuario edita su propio perfil"
  on public.profiles for update using (auth.uid() = id);

-- Crea el perfil automáticamente al registrarse (toma full_name del metadata del signUp)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Clientes
-- ============================================================
create table public.clients (
  id uuid primary key default gen_random_uuid (),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  contact text,
  age int check (age between 1 and 120),
  goal text,
  avatar_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index clients_trainer_idx on public.clients (trainer_id);

alter table public.clients enable row level security;

create policy "El entrenador gestiona sus clientes"
  on public.clients for all
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

-- ============================================================
-- 3. Datos de ficha: alergias / condiciones / alimentos a evitar
-- ============================================================
create table public.client_tags (
  id uuid primary key default gen_random_uuid (),
  client_id uuid not null references public.clients (id) on delete cascade,
  kind text not null check (kind in ('alergia', 'condicion', 'evita')),
  label text not null,
  created_at timestamptz not null default now()
);

create index client_tags_client_idx on public.client_tags (client_id);

alter table public.client_tags enable row level security;

create policy "El entrenador gestiona los tags de sus clientes"
  on public.client_tags for all
  using (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid ()))
  with check (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid ()));

-- ============================================================
-- 4. Mediciones antropométricas (histórico append-only)
-- ============================================================
create table public.measurements (
  id uuid primary key default gen_random_uuid (),
  client_id uuid not null references public.clients (id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(5, 2),
  body_fat_pct numeric(4, 1),
  height_cm numeric(5, 1),
  waist_cm numeric(5, 1),
  hip_cm numeric(5, 1),
  arm_cm numeric(5, 1),
  triceps_mm numeric(4, 1),
  abdominal_mm numeric(4, 1),
  subscapular_mm numeric(4, 1),
  -- Calculados server-side como pide el handoff
  bmi numeric(4, 1) generated always as (
    case when height_cm > 0 then round(weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)), 1) end
  ) stored,
  waist_hip_ratio numeric(3, 2) generated always as (
    case when hip_cm > 0 then round(waist_cm / hip_cm, 2) end
  ) stored,
  created_at timestamptz not null default now()
);

create index measurements_client_idx on public.measurements (client_id, measured_at desc);

alter table public.measurements enable row level security;

create policy "El entrenador gestiona las mediciones de sus clientes"
  on public.measurements for all
  using (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid ()))
  with check (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid ()));

-- ============================================================
-- 5. Versiones de plan (histórico append-only, una vigente)
-- ============================================================
create table public.plan_versions (
  id uuid primary key default gen_random_uuid (),
  client_id uuid not null references public.clients (id) on delete cascade,
  version int not null,
  is_current boolean not null default false,
  -- Config del constructor + resultado de la IA + plan final editado
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (client_id, version)
);

create unique index plan_versions_one_current_idx on public.plan_versions (client_id)
where
  is_current;

create index plan_versions_client_idx on public.plan_versions (client_id, version desc);

alter table public.plan_versions enable row level security;

create policy "El entrenador gestiona los planes de sus clientes"
  on public.plan_versions for all
  using (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid ()))
  with check (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid ()));

-- ============================================================
-- 6. Vista: clientes + versión de plan vigente (lista de clientes)
-- ============================================================
create view public.clients_with_current_plan
with (security_invoker = true) as
select
  c.*,
  pv.version as current_plan_version
from public.clients c
  left join public.plan_versions pv on pv.client_id = c.id and pv.is_current;
