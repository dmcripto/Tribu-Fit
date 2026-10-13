-- Migración 008: cobro automático con Mercado Pago y cuentas bancarias de la entrenadora.
-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo en el editor SQL.
-- Requiere las migraciones anteriores (003 pagos y 007 avisos).

/* ---------- Mercado Pago ---------- */
-- Credencial de cada entrenadora, cifrada por el servidor. No tiene ninguna política: ni la
-- entrenadora ni los alumnos pueden leerla desde la app; solo el servidor (clave de servicio).
create table mp_cuentas (
  entrenador_id uuid primary key references usuarios on delete cascade,
  token_cifrado text not null,
  mp_user_id text not null,
  apodo text not null default '',
  conectado timestamptz not null default now()
);
alter table mp_cuentas enable row level security;
revoke all on mp_cuentas from anon, authenticated;

-- La entrenadora puede saber si su cuenta está conectada (sin ver la credencial).
create function mp_estado() returns table (conectado boolean, apodo text)
language sql stable security definer set search_path = public as $$
  select true, c.apodo from mp_cuentas c where c.entrenador_id = auth.uid()
  union all select false, '' where not exists (select 1 from mp_cuentas c where c.entrenador_id = auth.uid());
$$;
-- El alumno puede saber si su entrenadora cobra con Mercado Pago.
create function mp_disponible() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mp_cuentas c join usuarios u on u.entrenador_id = c.entrenador_id where u.id = auth.uid()
  );
$$;
revoke execute on function mp_estado() from public, anon;
revoke execute on function mp_disponible() from public, anon;
grant execute on function mp_estado() to authenticated;
grant execute on function mp_disponible() to authenticated;

-- Pagos de Mercado Pago: nuevo método y id del pago (único, para no contar dos veces el mismo).
alter table pagos drop constraint if exists pagos_metodo_check;
alter table pagos add constraint pagos_metodo_check
  check (metodo in ('tarjeta', 'qr', 'transferencia', 'efectivo', 'mercadopago'));
alter table pagos add column mp_payment_id text unique;

-- Los avisos del pago ahora distinguen el cobro automático.
create or replace function aviso_pago() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.metodo = 'mercadopago' and new.estado = 'confirmado' then
    insert into avisos (usuario_id, tipo, titulo, texto, enlace)
    values (new.alumno_id, 'pago', 'Tu pago fue confirmado', 'Pagaste con Mercado Pago. ¡Gracias!', '/pagos');
    insert into avisos (usuario_id, tipo, titulo, texto, enlace)
    values (new.entrenador_id, 'pago', 'Pago recibido por Mercado Pago', 'Se confirmó solo.', '/pagos');
  elsif tg_op = 'INSERT' and new.estado = 'pendiente' then
    insert into avisos (usuario_id, tipo, titulo, texto, enlace)
    values (new.entrenador_id, 'pago', 'Pago por confirmar', 'Un alumno avisó que pagó.', '/pagos');
  elsif tg_op = 'UPDATE' and new.estado is distinct from old.estado and new.estado in ('confirmado', 'rechazado') then
    insert into avisos (usuario_id, tipo, titulo, texto, enlace)
    values (new.alumno_id, 'pago',
      case new.estado when 'confirmado' then 'Tu pago fue confirmado' else 'Tu pago fue rechazado' end, '', '/pagos');
  end if;
  return new;
end;
$$;

/* ---------- Cuentas bancarias ---------- */
create table cuentas_bancarias (
  id bigint generated always as identity primary key,
  entrenador_id uuid not null references usuarios on delete cascade,
  banco text not null check (length(banco) between 1 and 60),
  titular text not null check (length(titular) between 1 and 80),
  cbu text check (cbu is null or cbu ~ '^[0-9]{22}$'),
  alias text check (alias is null or alias ~ '^[A-Za-z0-9.\-]{6,20}$'),
  documento text not null default '' check (length(documento) <= 20),
  nota text not null default '' check (length(nota) <= 200),
  creado timestamptz not null default now(),
  check (cbu is not null or alias is not null)
);
create index cuentas_bancarias_idx on cuentas_bancarias (entrenador_id);
alter table cuentas_bancarias enable row level security;
create policy "entrenador gestiona sus cuentas" on cuentas_bancarias for all
  using (entrenador_id = auth.uid()) with check (entrenador_id = auth.uid());
create policy "alumno ve las cuentas de su entrenador" on cuentas_bancarias for select
  using (entrenador_id = (select u.entrenador_id from usuarios u where u.id = auth.uid()));
