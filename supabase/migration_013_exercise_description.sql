-- Migración 013: descripción breve del ejercicio (qué es y qué trabaja), la que se ve en la tarjeta del banco.
-- Distinta de `tips` (consejos y errores técnicos) y de `cues` (indicaciones de sala).
--
-- Aplicar con: supabase db query --linked -f supabase/migration_013_exercise_description.sql

alter table public.exercises add column if not exists description text;

alter table public.exercises drop constraint if exists exercises_description_length;
alter table public.exercises
  add constraint exercises_description_length check (description is null or char_length(description) <= 200);

-- Descripciones del catálogo oficial (solo si aún no tienen)
update public.exercises e
set description = d.description
from (values
  ('Cruces de poleas en polea media / alta', 'Aislamiento de pecho en polea: los brazos se cierran en arco delante del cuerpo.'),
  ('Curl de bíceps con barra Z', 'Flexión de codos con barra Z para trabajar el bíceps con menos tensión en las muñecas.'),
  ('Dominadas pronas', 'Tracción vertical colgado de una barra con agarre prono; trabaja dorsales y bíceps.'),
  ('Elevaciones laterales con mancuernas', 'Elevación de brazos hacia los lados para trabajar la parte media del hombro.'),
  ('Extensión de tríceps en polea con cuerda', 'Extensión de codos en polea alta con cuerda para aislar el tríceps.'),
  ('Hip Thrust con barra', 'Extensión de cadera con la espalda apoyada en un banco; el ejercicio clave para glúteos.'),
  ('Jalón al pecho en polea alta', 'Tracción vertical en polea llevando la barra al pecho; trabaja dorsales y bíceps.'),
  ('Peso muerto rumano con mancuernas o barra', 'Bisagra de cadera con rodillas semiflexionadas; trabaja isquiotibiales, glúteos y lumbar.'),
  ('Prensa de piernas 45°', 'Empuje de piernas en máquina inclinada; trabaja cuádriceps y glúteos con la espalda apoyada.'),
  ('Press de banca plano con barra', 'Empuje horizontal tumbado en banco plano; trabaja pecho, hombro anterior y tríceps.'),
  ('Press inclinado con mancuernas', 'Empuje en banco inclinado con mancuernas; pone el énfasis en la parte alta del pecho.'),
  ('Press militar con mancuernas o barra', 'Empuje vertical por encima de la cabeza; trabaja hombros y tríceps.'),
  ('Remo con barra inclinado (90° o 45°)', 'Tracción horizontal con el torso inclinado; trabaja espalda media, dorsales y bíceps.'),
  ('Sentadilla trasera con barra (Back Squat)', 'Sentadilla con la barra sobre la espalda alta; trabaja cuádriceps, glúteos y core.'),
  ('Zancadas estáticas o búlgaras', 'Sentadilla a una pierna con la otra atrás (en el suelo o en un banco); trabaja cuádriceps y glúteos.')
) as d(name, description)
where e.name = d.name and e.is_custom = false and e.description is null;
