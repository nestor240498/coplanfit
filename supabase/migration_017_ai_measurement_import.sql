-- Migración 017: la lectura con IA de informes antropométricos (PDF de ISAKmetry) cuenta como generación.
-- kind 'medicion' en ai_usage; record_ai_generation lo acepta.
--
-- Aplicar con: supabase db query --linked -f supabase/migration_017_ai_measurement_import.sql (idempotente)

alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind in ('plan', 'rutina', 'ejercicio', 'medicion'));

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
  if p_kind not in ('plan', 'rutina', 'ejercicio', 'medicion') then
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

revoke all on function public.record_ai_generation(text, uuid, boolean) from public, anon;
grant execute on function public.record_ai_generation(text, uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
