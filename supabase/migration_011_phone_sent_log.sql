-- CoplanFit — migración 011: teléfono del cliente + historial de envíos
-- Ejecutar con `supabase db query --linked -f <este archivo>` (o en el SQL Editor). Idempotente.

-- Teléfono en formato internacional sin signos (solo dígitos, con prefijo de país: 584121234567).
-- Permite abrir el chat de WhatsApp (wa.me). `contact` sigue siendo el campo libre de siempre.
alter table public.clients
add column if not exists phone text;

alter table public.clients drop constraint if exists clients_phone_check;
alter table public.clients
add constraint clients_phone_check check (phone is null or phone ~ '^[0-9]{8,15}$');

-- Recrear la vista para que incluya la columna nueva (c.* se resuelve al crearla)
drop view if exists public.clients_with_current_plan;
create view public.clients_with_current_plan
with (security_invoker = true) as
select
  c.*,
  pv.version as current_plan_version
from public.clients c
  left join public.plan_versions pv on pv.client_id = c.id and pv.is_current;

-- ============================================================
-- Historial de envíos: qué documento se compartió con el cliente y cuándo.
-- Fase 2: estas filas alimentan las notificaciones del cliente vinculado.
-- ============================================================
create table if not exists public.sent_log (
  id uuid primary key default gen_random_uuid (),
  client_id uuid not null references public.clients (id) on delete cascade,
  kind text not null check (kind in ('plan', 'rutina', 'medicion', 'comparativa', 'informe')),
  -- Versión de plan/rutina o medición enviada (sin FK: puede apuntar a tablas distintas)
  ref_id uuid,
  label text not null,
  sent_by uuid not null default auth.uid () references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists sent_log_client_idx on public.sent_log (client_id, created_at desc);

alter table public.sent_log enable row level security;

drop policy if exists "El entrenador ve y registra los envíos de sus clientes" on public.sent_log;
create policy "El entrenador ve y registra los envíos de sus clientes"
  on public.sent_log for all
  to authenticated
  using (exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid ()))
  with check (
    sent_by = auth.uid ()
    and exists (select 1 from public.clients c where c.id = client_id and c.trainer_id = auth.uid ())
  );
