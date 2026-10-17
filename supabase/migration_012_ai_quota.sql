-- Migración 012: límites de generaciones con IA (planes y rutinas), por día y por mes.
--
-- - Cuenta 1 generación por plan o rutina generados con éxito por la IA (clasificar ejercicios y
--   redactar técnica no cuentan). Los fallos de Gemini y la propuesta local con el banco no cuentan.
-- - Límite diario (anti-abuso) y mensual. Al agotar el mensual se gastan las generaciones EXTRA
--   (recargas o regalos del administrador), que no caducan. El diario se aplica siempre.
-- - Día y mes se cuentan en hora de Venezuela (America/Caracas).
-- - El entrenador solo puede LEER su cuota y su uso: los límites no están en `profiles` porque
--   cada usuario puede editar su propio perfil.
--
-- Aplicar con: supabase db query --linked -f supabase/migration_012_ai_quota.sql

create table if not exists public.ai_quotas (
  trainer_id uuid primary key references auth.users (id) on delete cascade,
  daily_limit int not null default 15 check (daily_limit >= 0),
  monthly_limit int not null default 80 check (monthly_limit >= 0),
  extra_credits int not null default 0 check (extra_credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('plan', 'rutina')),
  client_id uuid references public.clients (id) on delete set null,
  from_extra boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_trainer_created_idx on public.ai_usage (trainer_id, created_at desc);

alter table public.ai_quotas enable row level security;
alter table public.ai_usage enable row level security;

-- Solo lectura de lo propio; las escrituras pasan por las funciones de abajo
drop policy if exists "Cada entrenador ve su cuota de IA" on public.ai_quotas;
create policy "Cada entrenador ve su cuota de IA" on public.ai_quotas
  for select using (trainer_id = auth.uid());

drop policy if exists "Cada entrenador ve su uso de IA" on public.ai_usage;
create policy "Cada entrenador ve su uso de IA" on public.ai_usage
  for select using (trainer_id = auth.uid());

-- Estado de la cuota del usuario actual
create or replace function public.ai_quota_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text := 'America/Caracas';
  v_now timestamp := now() at time zone v_tz;
  v_day_start timestamptz := date_trunc('day', v_now) at time zone v_tz;
  v_month_start timestamptz := date_trunc('month', v_now) at time zone v_tz;
  v_daily_limit int := 15;
  v_monthly_limit int := 80;
  v_extra int := 0;
  v_daily_used int;
  v_monthly_used int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select q.daily_limit, q.monthly_limit, q.extra_credits
    into v_daily_limit, v_monthly_limit, v_extra
    from ai_quotas q where q.trainer_id = v_uid;
  v_daily_limit := coalesce(v_daily_limit, 15);
  v_monthly_limit := coalesce(v_monthly_limit, 80);
  v_extra := coalesce(v_extra, 0);

  select count(*) into v_daily_used from ai_usage
    where trainer_id = v_uid and created_at >= v_day_start;
  -- Las generaciones pagadas con extra no consumen el cupo del mes
  select count(*) into v_monthly_used from ai_usage
    where trainer_id = v_uid and created_at >= v_month_start and not from_extra;

  return jsonb_build_object(
    'daily_used', v_daily_used,
    'daily_limit', v_daily_limit,
    'monthly_used', v_monthly_used,
    'monthly_limit', v_monthly_limit,
    'extra_credits', v_extra,
    'day_resets_at', v_day_start + interval '1 day',
    'month_resets_at', (date_trunc('month', v_now) + interval '1 month') at time zone v_tz,
    'can_generate', v_daily_used < v_daily_limit and (v_monthly_used < v_monthly_limit or v_extra > 0),
    'blocked_by', case
      when v_daily_used >= v_daily_limit then 'daily'
      when v_monthly_used >= v_monthly_limit and v_extra <= 0 then 'monthly'
      else null
    end
  );
end;
$$;

-- Anota una generación con éxito (la llaman las Edge Functions tras la respuesta de Gemini).
-- Si el cupo del mes está agotado, gasta una generación extra.
create or replace function public.record_ai_generation(p_kind text, p_client_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status jsonb;
  v_from_extra boolean := false;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_kind not in ('plan', 'rutina') then
    raise exception 'invalid kind';
  end if;
  -- Solo se enlaza un cliente propio
  if p_client_id is not null and not exists (select 1 from clients where id = p_client_id and trainer_id = v_uid) then
    p_client_id := null;
  end if;

  -- Bloqueo por entrenador para que dos generaciones simultáneas no gasten la misma extra
  perform pg_advisory_xact_lock(hashtext('ai_quota:' || v_uid::text));

  v_status := ai_quota_status();
  if (v_status ->> 'monthly_used')::int >= (v_status ->> 'monthly_limit')::int
     and (v_status ->> 'extra_credits')::int > 0 then
    update ai_quotas set extra_credits = extra_credits - 1, updated_at = now()
      where trainer_id = v_uid and extra_credits > 0;
    v_from_extra := found;
  end if;

  insert into ai_usage (trainer_id, kind, client_id, from_extra)
    values (v_uid, p_kind, p_client_id, v_from_extra);

  return ai_quota_status();
end;
$$;

-- Suma generaciones extra a un entrenador (recargas o regalos). Solo super_admin.
create or replace function public.grant_ai_credits(p_trainer_id uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'super_admin') then
    raise exception 'not allowed';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  insert into ai_quotas (trainer_id, extra_credits)
    values (p_trainer_id, p_amount)
    on conflict (trainer_id)
    do update set extra_credits = ai_quotas.extra_credits + excluded.extra_credits, updated_at = now()
    returning extra_credits into v_total;
  return v_total;
end;
$$;

revoke all on function public.ai_quota_status() from public, anon;
revoke all on function public.record_ai_generation(text, uuid) from public, anon;
revoke all on function public.grant_ai_credits(uuid, int) from public, anon;
grant execute on function public.ai_quota_status() to authenticated;
grant execute on function public.record_ai_generation(text, uuid) to authenticated;
grant execute on function public.grant_ai_credits(uuid, int) to authenticated;
