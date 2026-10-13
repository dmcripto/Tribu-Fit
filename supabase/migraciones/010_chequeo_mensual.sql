-- Migración 010: chequeo mensual con fotos (frente, perfil y espalda).
-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo. Requiere la 007.

alter table fotos_progreso
  add column tipo text not null default 'otra' check (tipo in ('frente', 'perfil', 'espalda', 'otra'));

-- Para que la entrenadora vea rápido quién tiene el chequeo al día.
create index fotos_progreso_fecha_idx on fotos_progreso (usuario_id, fecha desc);
