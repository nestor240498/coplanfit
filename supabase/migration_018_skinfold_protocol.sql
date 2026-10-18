-- Migración 018: protocolo «skinfolds» (pliegues de Jackson-Pollock, 3 o 7) en measurements.
-- Reutiliza chest_mm y midaxillary_mm (pectoral y axilar medio). Idempotente.

alter table public.measurements drop constraint if exists measurements_protocol_check;
alter table public.measurements add constraint measurements_protocol_check
  check (protocol in ('manual', 'isak_restricted', 'skinfolds', 'import'));

comment on column public.measurements.protocol is 'manual · isak_restricted (sesión ISAK, lado derecho) · skinfolds (Jackson-Pollock 3/7) · import (Excel/CSV)';

notify pgrst, 'reload schema';
