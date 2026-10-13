-- Migración 011: foto de perfil de cada persona.
-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo.

alter table usuarios
  add column avatar text check (avatar is null or (avatar like 'data:image/%' and length(avatar) < 120000));

-- El alumno ve el nombre y la foto de su entrenador/a (no tiene permiso para leer su fila completa).
create function mi_entrenador() returns table (id uuid, nombre text, avatar text)
language sql stable security definer set search_path = public as $$
  select c.id, c.nombre, c.avatar
  from usuarios u join usuarios c on c.id = u.entrenador_id
  where u.id = auth.uid();
$$;
revoke execute on function mi_entrenador() from public, anon;
grant execute on function mi_entrenador() to authenticated;
