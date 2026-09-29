-- CoplanFit — migración 008: modelo ampliado de ejercicio
-- Ejecutar con `supabase db query --linked -f <este archivo>` (o en el SQL Editor). Idempotente.
--
-- Valores válidos (la app los define en src/features/workouts/types.ts):
--   exercise_type:    fuerza | aislamiento | cardio | movilidad | pliometria | calentamiento | rehabilitacion
--   metric:           reps_peso | reps | tiempo | distancia | reps_asistencia
--   laterality:       bilateral | unilateral | alternado
--   movement_pattern: empuje_horizontal | empuje_vertical | traccion_horizontal | traccion_vertical |
--                     sentadilla | bisagra | zancada | core_estabilidad | core_flexion | acarreo |
--                     aislamiento | cardio | movilidad

alter table public.exercises
add column if not exists exercise_type text,
add column if not exists metric text not null default 'reps_peso',
add column if not exists laterality text not null default 'bilateral',
add column if not exists movement_pattern text,
-- Equipo adicional además del principal (`equipment`), p. ej. banco o cajón
add column if not exists extra_equipment text[] not null default '{}',
-- Indicaciones breves de sala ("pecho arriba", "codos atrás")
add column if not exists cues text[] not null default '{}',
-- Condiciones o lesiones con las que conviene evitarlo o adaptarlo
add column if not exists contraindications text[] not null default '{}',
-- Otros nombres para buscarlo ("lat pulldown", "jalón al pecho")
add column if not exists aliases text[] not null default '{}',
-- Variante de otro ejercicio (p. ej. "Sentadilla goblet" → "Sentadilla")
add column if not exists parent_id uuid references public.exercises (id) on delete set null;

alter table public.exercises drop constraint if exists exercises_metric_check;
alter table public.exercises
add constraint exercises_metric_check check (metric in ('reps_peso', 'reps', 'tiempo', 'distancia', 'reps_asistencia'));

alter table public.exercises drop constraint if exists exercises_laterality_check;
alter table public.exercises
add constraint exercises_laterality_check check (laterality in ('bilateral', 'unilateral', 'alternado'));

create index if not exists exercises_pattern_idx on public.exercises (movement_pattern);
create index if not exists exercises_parent_idx on public.exercises (parent_id);

-- ============================================================
-- Datos de los ejercicios oficiales existentes (solo rellena lo que esté vacío)
-- ============================================================
update public.exercises e
set
  exercise_type = coalesce(e.exercise_type, v.exercise_type),
  movement_pattern = coalesce(e.movement_pattern, v.movement_pattern),
  laterality = case when e.laterality = 'bilateral' then v.laterality else e.laterality end,
  extra_equipment = case when e.extra_equipment = '{}' then v.extra_equipment else e.extra_equipment end,
  aliases = case when e.aliases = '{}' then v.aliases else e.aliases end,
  equipment = coalesce(v.equipment, e.equipment)
from (
  values
    ('010b26f8-cef3-4c79-b0b6-81e22ef7622d'::uuid, 'aislamiento', 'aislamiento', 'bilateral', '{}'::text[], '{"curl barra z","ez bar curl"}'::text[], 'barra_z'),
    ('c1536d45-fb18-4f2e-bfc0-dd8ea5abb7a5', 'fuerza', 'sentadilla', 'bilateral', '{}', '{"leg press","prensa"}', null),
    ('a69fa0a2-338c-4407-954f-574b7674826b', 'fuerza', 'sentadilla', 'bilateral', '{}', '{"back squat","sentadilla libre"}', null),
    ('9c0f182e-3be5-45a3-9deb-7d9f715edd00', 'fuerza', 'zancada', 'unilateral', '{"banco"}', '{"split squat","bulgarian split squat","estocadas"}', null),
    ('6643d6bd-c45e-42fe-af69-ffee3969b18c', 'fuerza', 'traccion_vertical', 'bilateral', '{"barra_dominadas"}', '{"pull ups","pull-up"}', null),
    ('78b12813-417a-40c8-a37f-9ac1aaadf81c', 'fuerza', 'traccion_vertical', 'bilateral', '{}', '{"lat pulldown","jalon al pecho"}', null),
    ('e87ffac1-51d8-4819-b86a-b9e26eb9af23', 'fuerza', 'traccion_horizontal', 'bilateral', '{}', '{"barbell row","remo pendlay"}', null),
    ('d99e7b94-2f09-44d3-98f0-02ef38c6efeb', 'fuerza', 'bisagra', 'bilateral', '{"banco"}', '{"puente de gluteo con barra","glute bridge"}', null),
    ('705c25e3-b8f5-429a-aa80-d6160fd36417', 'aislamiento', 'aislamiento', 'bilateral', '{}', '{"lateral raise","vuelos laterales"}', null),
    ('c59b5e23-72c2-481b-be8a-7dc9fa15a223', 'fuerza', 'empuje_vertical', 'bilateral', '{}', '{"overhead press","press de hombros"}', null),
    ('37add695-a4a1-48f0-acf6-7e97cbd07127', 'fuerza', 'bisagra', 'bilateral', '{}', '{"romanian deadlift","rdl"}', null),
    ('9122a7d4-d67f-41bf-8fb0-cc556bcce4e4', 'aislamiento', 'aislamiento', 'bilateral', '{}', '{"cable crossover","aperturas en polea"}', null),
    ('b09a6ab6-e8b8-4764-93e1-17eea1af9987', 'fuerza', 'empuje_horizontal', 'bilateral', '{"banco"}', '{"bench press","press banca"}', null),
    ('25e2621c-9c9a-43d9-9170-fb5989e67aa2', 'fuerza', 'empuje_horizontal', 'bilateral', '{"banco"}', '{"incline dumbbell press"}', null),
    ('20a28d61-39ec-45e6-9c47-43e46709a425', 'aislamiento', 'aislamiento', 'bilateral', '{}', '{"triceps pushdown","extension de triceps en polea"}', null)
) as v (id, exercise_type, movement_pattern, laterality, extra_equipment, aliases, equipment)
where e.id = v.id;

-- Dominadas: peso corporal → se prescriben por repeticiones
update public.exercises
set metric = 'reps'
where id = '6643d6bd-c45e-42fe-af69-ffee3969b18c' and metric = 'reps_peso';
