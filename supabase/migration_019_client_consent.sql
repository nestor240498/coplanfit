-- Migración 019: consentimiento del cliente para guardar y enviar sus datos de salud.
-- consent_at: cuándo lo dio (null = sin registrar). consent_method: cómo se obtuvo.
-- Lo declara el entrenador; la app solo lo anota. Idempotente.

alter table public.clients
  add column if not exists consent_at timestamptz,
  add column if not exists consent_method text;

alter table public.clients drop constraint if exists clients_consent_method_check;
alter table public.clients add constraint clients_consent_method_check
  check (consent_method is null or consent_method in ('escrito', 'whatsapp', 'verbal'));

-- c.* se resuelve al crear la vista: recrearla con las columnas nuevas
drop view if exists public.clients_with_current_plan;
create view public.clients_with_current_plan with (security_invoker = true) as
select c.*, pv.version as current_plan_version
from public.clients c
left join public.plan_versions pv on pv.client_id = c.id and pv.is_current;

comment on column public.clients.consent_at is 'Fecha en que el cliente aceptó que se guarden y envíen sus datos (declarada por el entrenador)';
comment on column public.clients.consent_method is 'escrito · whatsapp · verbal';

notify pgrst, 'reload schema';
