-- Migración 015: antropometría ISAK (perfil restringido, lado derecho) + sexo y deporte del cliente
-- + certificación del entrenador.
--
-- - Sesión guiada: 21 puntos con 2-3 lecturas; en las columnas se guarda el valor final (media de 2 o
--   mediana de 3) y en `readings` las lecturas en bruto. `equations` anota qué fórmulas se usaron.
-- - Las mediciones ISAK reutilizan columnas existentes: cresta ilíaca → suprailiac_mm, muslo medio →
--   thigh_right_cm, pierna → calf_right_cm, brazo relajado → arm_right_cm (+ arm_cm), brazo flexionado →
--   arm_flexed_right_cm, pliegue muslo anterior → thigh_mm, pierna medial → calf_mm.
--
-- Aplicar con: supabase db query --linked -f supabase/migration_015_isak_anthropometry.sql (idempotente)

-- 1. Cliente: sexo (lo necesitan las ecuaciones) y deporte
alter table public.clients
  add column if not exists sex text,
  add column if not exists sport text;
alter table public.clients drop constraint if exists clients_sex_check;
alter table public.clients add constraint clients_sex_check check (sex is null or sex in ('hombre', 'mujer'));
alter table public.clients drop constraint if exists clients_sport_length;
alter table public.clients add constraint clients_sport_length check (sport is null or char_length(sport) <= 80);

-- c.* se resuelve al crear la vista: recrearla para que incluya las columnas nuevas (patrón de la 011)
drop view if exists public.clients_with_current_plan;
create view public.clients_with_current_plan with (security_invoker = true) as
select c.*, pv.version as current_plan_version
from public.clients c
left join public.plan_versions pv on pv.client_id = c.id and pv.is_current;

-- 2. Perfil: certificación del evaluador (aparece en los informes)
alter table public.profiles add column if not exists certification text;
alter table public.profiles drop constraint if exists profiles_certification_length;
alter table public.profiles add constraint profiles_certification_length
  check (certification is null or char_length(certification) <= 120);

-- 3. Mediciones
alter table public.measurements
  add column if not exists sitting_height_cm numeric(5, 1),
  add column if not exists arm_span_cm numeric(5, 1),
  add column if not exists humerus_breadth_cm numeric(4, 1),
  add column if not exists wrist_breadth_cm numeric(4, 1),
  add column if not exists femur_breadth_cm numeric(4, 1),
  add column if not exists protocol text not null default 'manual',
  add column if not exists readings jsonb,
  add column if not exists equations jsonb;

alter table public.measurements drop constraint if exists measurements_protocol_check;
alter table public.measurements add constraint measurements_protocol_check
  check (protocol in ('manual', 'isak_restricted', 'import'));

alter table public.measurements drop constraint if exists measurements_isak_ranges;
alter table public.measurements add constraint measurements_isak_ranges check (
  (sitting_height_cm is null or sitting_height_cm between 40 and 130)
  and (arm_span_cm is null or arm_span_cm between 80 and 250)
  and (humerus_breadth_cm is null or humerus_breadth_cm between 3 and 12)
  and (wrist_breadth_cm is null or wrist_breadth_cm between 3 and 10)
  and (femur_breadth_cm is null or femur_breadth_cm between 5 and 15));

alter table public.measurements drop constraint if exists measurements_json_shape;
alter table public.measurements add constraint measurements_json_shape check (
  (readings is null or jsonb_typeof(readings) = 'object')
  and (equations is null or jsonb_typeof(equations) = 'object'));

-- Errores de unidades (p. ej. talla en metros): NOT VALID = no revisa filas antiguas, sí las nuevas
alter table public.measurements drop constraint if exists measurements_core_ranges;
alter table public.measurements add constraint measurements_core_ranges check (
  (weight_kg is null or weight_kg between 2 and 400)
  and (height_cm is null or height_cm between 40 and 250)) not valid;

-- Orden estable del histórico: mismo día → la registrada después primero
create index if not exists measurements_client_recent_idx
  on public.measurements (client_id, measured_at desc, created_at desc);
drop index if exists public.measurements_client_idx;

comment on column public.measurements.protocol is 'manual · isak_restricted (sesión ISAK, lado derecho) · import (Excel/CSV)';
comment on column public.measurements.readings is 'Lecturas en bruto: {"v":1,"rule":"median","mode":"guided","order":"rounds","sites":{"triceps_mm":[11,11.2]},"skipped":[]}';
comment on column public.measurements.equations is 'Fórmulas usadas: {"v":1,"fat":"dw_siri","muscle":"lee2000","bone":"rocha","adipose":"kerr","ethnicity":0,"sex":"hombre","age":28}';
comment on column public.measurements.body_fat_pct is 'manual/import: valor medido (p. ej. bioimpedancia) · isak_restricted: % grasa calculado (equations.fat)';
comment on column public.measurements.muscle_mass_pct is 'manual/import: valor medido · isak_restricted: masa muscular de Lee / masa × 100';
comment on column public.measurements.suprailiac_mm is 'Pliegue de cresta ilíaca (ISAK)';
comment on column public.measurements.thigh_right_cm is 'En filas isak_restricted: perímetro de muslo medio';
comment on column public.measurements.calf_right_cm is 'En filas isak_restricted: perímetro máximo de pierna';

notify pgrst, 'reload schema';
