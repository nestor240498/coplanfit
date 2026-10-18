-- Migración 016: importar clientes desde Excel/CSV en una sola transacción, con «Deshacer».
--
-- - client_imports: una fila por importación (para deshacerla en bloque).
-- - clients.import_id / measurements.import_id: qué importación los creó.
-- - import_clients(p_source_name, p_rows): crea clientes, sus etiquetas (alergias, condiciones, evita)
--   y su primera medición (protocol 'import') si la fila la trae. Todo o nada.
-- - undo_client_import(p_import_id): borra lo importado si aún no se ha trabajado con esos clientes.
-- Ambas son security invoker: RLS se aplica como el entrenador.
--
-- Aplicar con: supabase db query --linked -f supabase/migration_016_client_import.sql (idempotente)

create table if not exists public.client_imports (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  source_name text not null check (char_length(source_name) <= 200),
  row_count int not null default 0,
  imported_count int not null default 0,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);

alter table public.client_imports enable row level security;
drop policy if exists "El entrenador gestiona sus importaciones" on public.client_imports;
create policy "El entrenador gestiona sus importaciones" on public.client_imports
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

alter table public.clients add column if not exists import_id uuid references public.client_imports (id) on delete set null;
alter table public.measurements add column if not exists import_id uuid references public.client_imports (id) on delete set null;
create index if not exists clients_import_idx on public.clients (import_id) where import_id is not null;
create index if not exists measurements_import_idx on public.measurements (import_id) where import_id is not null;

-- c.* se resuelve al crear la vista: recrearla con la columna nueva
drop view if exists public.clients_with_current_plan;
create view public.clients_with_current_plan with (security_invoker = true) as
select c.*, pv.version as current_plan_version
from public.clients c
left join public.plan_versions pv on pv.client_id = c.id and pv.is_current;

create or replace function public.import_clients(p_source_name text, p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_import uuid;
  v_row jsonb;
  v_client uuid;
  v_ids uuid[] := '{}';
  v_tag jsonb;
  v_m jsonb;
begin
  if v_uid is null then
    raise exception 'Sesión expirada. Vuelve a iniciar sesión.';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'No hay filas para importar.';
  end if;
  if jsonb_array_length(p_rows) > 1000 then
    raise exception 'El archivo tiene demasiadas filas: el máximo es 1000.';
  end if;

  insert into client_imports (trainer_id, source_name, row_count)
  values (v_uid, left(coalesce(nullif(btrim(p_source_name), ''), 'archivo'), 200), jsonb_array_length(p_rows))
  returning id into v_import;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    if coalesce(btrim(v_row ->> 'full_name'), '') = '' then
      raise exception 'Falta el nombre en una fila.';
    end if;

    insert into clients (
      trainer_id, full_name, contact, phone, age, birth_date, sex, goal, sport, notes, medical_notes, import_id
    ) values (
      v_uid,
      left(btrim(v_row ->> 'full_name'), 120),
      nullif(btrim(coalesce(v_row ->> 'contact', '')), ''),
      nullif(v_row ->> 'phone', ''),
      (v_row ->> 'age')::int,
      (v_row ->> 'birth_date')::date,
      nullif(v_row ->> 'sex', ''),
      nullif(v_row ->> 'goal', ''),
      nullif(left(btrim(coalesce(v_row ->> 'sport', '')), 80), ''),
      nullif(v_row ->> 'notes', ''),
      nullif(v_row ->> 'medical_notes', ''),
      v_import
    )
    returning id into v_client;
    v_ids := v_ids || v_client;

    for v_tag in select value from jsonb_array_elements(coalesce(v_row -> 'tags', '[]'::jsonb)) loop
      if coalesce(btrim(v_tag ->> 'label'), '') <> '' then
        insert into client_tags (client_id, kind, label)
        values (v_client, v_tag ->> 'kind', left(btrim(v_tag ->> 'label'), 80));
      end if;
    end loop;

    v_m := v_row -> 'measurement';
    if v_m is not null and jsonb_typeof(v_m) = 'object' then
      insert into measurements (client_id, measured_at, protocol, import_id, weight_kg, height_cm, waist_cm, hip_cm, body_fat_pct)
      values (
        v_client,
        coalesce((v_m ->> 'measured_at')::date, current_date),
        'import',
        v_import,
        (v_m ->> 'weight_kg')::numeric,
        (v_m ->> 'height_cm')::numeric,
        (v_m ->> 'waist_cm')::numeric,
        (v_m ->> 'hip_cm')::numeric,
        (v_m ->> 'body_fat_pct')::numeric
      );
    end if;
  end loop;

  update client_imports set imported_count = coalesce(array_length(v_ids, 1), 0) where id = v_import;
  return jsonb_build_object('import_id', v_import, 'client_ids', to_jsonb(v_ids));
end;
$$;

create or replace function public.undo_client_import(p_import_id uuid)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if not exists (
    select 1 from client_imports where id = p_import_id and trainer_id = v_uid and undone_at is null
  ) then
    raise exception 'Esta importación ya no se puede deshacer.';
  end if;
  if exists (
    select 1 from clients c
    where c.import_id = p_import_id
      and (
        exists (select 1 from plan_versions p where p.client_id = c.id)
        or exists (select 1 from workout_plan_versions w where w.client_id = c.id)
        or exists (select 1 from measurements m where m.client_id = c.id and m.import_id is distinct from p_import_id)
      )
  ) then
    raise exception 'Ya trabajaste con algunos clientes importados: no se puede deshacer en bloque.';
  end if;

  delete from clients where import_id = p_import_id and trainer_id = v_uid;
  get diagnostics v_count = row_count;
  update client_imports set undone_at = now() where id = p_import_id;
  return v_count;
end;
$$;

revoke all on function public.import_clients(text, jsonb) from public, anon;
revoke all on function public.undo_client_import(uuid) from public, anon;
grant execute on function public.import_clients(text, jsonb) to authenticated;
grant execute on function public.undo_client_import(uuid) to authenticated;

notify pgrst, 'reload schema';
