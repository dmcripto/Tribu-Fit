-- Migración 013: el chequeo mensual pasa a 4 fotos: frente, perfil izquierdo, perfil derecho y espalda.
-- Si ya ejecutaste la 010, ejecuta SOLO este archivo. Las fotos anteriores de «perfil» se conservan.
alter table fotos_progreso drop constraint if exists fotos_progreso_tipo_check;
alter table fotos_progreso add constraint fotos_progreso_tipo_check
  check (tipo in ('frente', 'perfil', 'perfil_izq', 'perfil_der', 'espalda', 'otra'));
