-- Migración 005: aceptación de términos y derecho a borrar la cuenta.
-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo en el editor SQL.

-- Qué versión de los términos aceptó cada usuario y cuándo.
alter table consentimientos
  add column terminos_version text,
  add column terminos_fecha timestamptz;

-- Cada usuario puede borrar su propia cuenta y todos sus datos.
-- Al borrar su fila de auth.users se eliminan en cascada su perfil, medidas, entrenos,
-- comidas, pagos, planes y permisos.
create function eliminar_mi_cuenta() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function eliminar_mi_cuenta() from public, anon;
grant execute on function eliminar_mi_cuenta() to authenticated;
