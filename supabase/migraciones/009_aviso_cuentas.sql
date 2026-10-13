-- Migración 009: avisa a los alumnos cuando la entrenadora agrega una cuenta para transferir.
-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo. Requiere 007 y 008.

create function aviso_cuenta_bancaria() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into avisos (usuario_id, tipo, titulo, texto, enlace)
  select u.id, 'pago', 'Tu entrenador/a agregó una cuenta para transferir', left(new.banco, 120), '/pagos'
  from usuarios u where u.entrenador_id = new.entrenador_id and u.rol = 'atleta';
  return new;
end;
$$;
create trigger cuentas_bancarias_aviso after insert on cuentas_bancarias for each row execute function aviso_cuenta_bancaria();
