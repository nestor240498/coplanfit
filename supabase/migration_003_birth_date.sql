-- CoplanFit — migración 003: fecha de nacimiento en cliente y refresco de vista
-- Ejecutar en el SQL Editor de Supabase.

-- 1. Añadir columna birth_date a la tabla clients (si no existe)
alter table public.clients
add column if not exists birth_date date;

-- 2. Eliminar y recrear la vista para evitar el error de orden de columnas de PostgreSQL
drop view if exists public.clients_with_current_plan;

create view public.clients_with_current_plan
with (security_invoker = true) as
select
  c.*,
  pv.version as current_plan_version
from public.clients c
  left join public.plan_versions pv on pv.client_id = c.id and pv.is_current;
