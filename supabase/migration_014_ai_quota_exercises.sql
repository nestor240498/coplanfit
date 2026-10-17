-- Migración 014: las generaciones de ejercicios con IA también cuentan en el límite (migración 012).
--
-- - kind 'ejercicio': «Completar datos con IA» (classify-exercise) cuenta 1 y trae incluida UNA redacción de
--   técnica (generate-exercise-details con p_bundled) si se pide en los 3 minutos siguientes.
-- - «Redactar pasos y consejos con IA» por separado cuenta 1.
--
-- Aplicar con: supabase db query --linked -f supabase/migration_014_ai_quota_exercises.sql

alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind in ('plan', 'rutina', 'ejercicio'));

-- Una clasificación deja pendiente su técnica incluida hasta que se usa
alter table public.ai_usage add column if not exists includes_technique boolean not null default false;

drop function if exists public.record_ai_generation(text, uuid);

create or replace function public.record_ai_generation(
  p_kind text,
  p_client_id uuid default null,
  p_bundled boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status jsonb;
  v_from_extra boolean := false;
  v_bundle_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_kind not in ('plan', 'rutina', 'ejercicio') then
    raise exception 'invalid kind';
  end if;
  if p_client_id is not null and not exists (select 1 from clients where id = p_client_id and trainer_id = v_uid) then
    p_client_id := null;
  end if;

  perform pg_advisory_xact_lock(hashtext('ai_quota:' || v_uid::text));

  -- Técnica incluida en una clasificación reciente: se gasta ese «incluido» y no cuenta aparte
  if p_bundled and p_kind = 'ejercicio' then
    select id into v_bundle_id from ai_usage
      where trainer_id = v_uid and kind = 'ejercicio' and includes_technique
        and created_at > now() - interval '3 minutes'
      order by created_at desc limit 1;
    if v_bundle_id is not null then
      update ai_usage set includes_technique = false where id = v_bundle_id;
      return ai_quota_status();
    end if;
  end if;

  v_status := ai_quota_status();
  if (v_status ->> 'monthly_used')::int >= (v_status ->> 'monthly_limit')::int
     and (v_status ->> 'extra_credits')::int > 0 then
    update ai_quotas set extra_credits = extra_credits - 1, updated_at = now()
      where trainer_id = v_uid and extra_credits > 0;
    v_from_extra := found;
  end if;

  insert into ai_usage (trainer_id, kind, client_id, from_extra, includes_technique)
    values (v_uid, p_kind, p_client_id, v_from_extra, p_kind = 'ejercicio' and not p_bundled);

  return ai_quota_status();
end;
$$;

-- ¿Queda una técnica incluida sin usar? (para no bloquear por cuota lo que ya está pagado)
create or replace function public.has_bundled_technique()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from ai_usage
    where trainer_id = auth.uid() and kind = 'ejercicio' and includes_technique
      and created_at > now() - interval '3 minutes'
  );
$$;

revoke all on function public.record_ai_generation(text, uuid, boolean) from public, anon;
revoke all on function public.has_bundled_technique() from public, anon;
grant execute on function public.record_ai_generation(text, uuid, boolean) to authenticated;
grant execute on function public.has_bundled_technique() to authenticated;
