-- Tribu Fit: migraciones 007 a 011 juntas (comunidad, Mercado Pago y bancos, chequeo mensual, foto de perfil).
-- Ejecutar UNA sola vez, en el editor SQL de Supabase, sobre un proyecto que ya tiene las migraciones 002 a 006.

-- ================= 007_comunidad =================
-- Migración 007: chat, avisos, fotos de progreso, marcas por ejercicio, retos y ranking.
-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo en el editor SQL.
-- Requiere las migraciones anteriores.

/* ---------- Chat entrenador/a ↔ alumno ---------- */
create table mensajes (
  id bigint generated always as identity primary key,
  alumno_id uuid not null references usuarios on delete cascade,
  entrenador_id uuid not null references usuarios on delete cascade,
  de_entrenador boolean not null,
  texto text not null check (length(texto) between 1 and 2000),
  -- Opcional: de qué rutina o ejercicio habla el mensaje.
  contexto text check (contexto is null or length(contexto) <= 120),
  leido boolean not null default false,
  creado timestamptz not null default now()
);
create index mensajes_hilo_idx on mensajes (alumno_id, entrenador_id, creado desc);
alter table mensajes enable row level security;

create policy "participantes leen" on mensajes for select
  using (alumno_id = auth.uid() or entrenador_id = auth.uid());
-- Solo se puede escribir dentro de la pareja alumno–entrenador vinculada, y como uno mismo.
create policy "participantes escriben" on mensajes for insert with check (
  exists (select 1 from usuarios u where u.id = alumno_id and u.entrenador_id = mensajes.entrenador_id)
  and (
    (de_entrenador and entrenador_id = auth.uid())
    or (not de_entrenador and alumno_id = auth.uid())
  )
);
-- Solo el destinatario puede marcar como leído, y únicamente esa columna.
create policy "destinatario marca leido" on mensajes for update
  using ((de_entrenador and alumno_id = auth.uid()) or (not de_entrenador and entrenador_id = auth.uid()))
  with check ((de_entrenador and alumno_id = auth.uid()) or (not de_entrenador and entrenador_id = auth.uid()));
revoke update on mensajes from authenticated, anon;
grant update (leido) on mensajes to authenticated;

/* ---------- Avisos ---------- */
create table avisos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuarios on delete cascade,
  tipo text not null check (tipo in ('mensaje', 'plan', 'nutricion', 'pago', 'reto', 'otro')),
  titulo text not null check (length(titulo) <= 120),
  texto text not null default '' check (length(texto) <= 300),
  enlace text,
  leido boolean not null default false,
  creado timestamptz not null default now()
);
create index avisos_usuario_idx on avisos (usuario_id, leido, creado desc);
alter table avisos enable row level security;
create policy "propios" on avisos for select using (usuario_id = auth.uid());
create policy "marcar leidos" on avisos for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "borrar propios" on avisos for delete using (usuario_id = auth.uid());
revoke update on avisos from authenticated, anon;
grant update (leido) on avisos to authenticated;
-- Sin política de insert: los avisos los crean solo los disparadores de abajo.

create function aviso_mensaje() returns trigger
language plpgsql security definer set search_path = public as $$
declare dest uuid; quien text; ruta text;
begin
  if new.de_entrenador then
    dest := new.alumno_id;
    select nombre into quien from usuarios where id = new.entrenador_id;
  else
    dest := new.entrenador_id;
    select nombre into quien from usuarios where id = new.alumno_id;
  end if;
  ruta := '/chat';
  -- Un solo aviso sin leer por conversación.
  if not exists (select 1 from avisos where usuario_id = dest and tipo = 'mensaje' and enlace = ruta and not leido) then
    insert into avisos (usuario_id, tipo, titulo, texto, enlace)
    values (dest, 'mensaje', 'Mensaje nuevo de ' || coalesce(quien, 'tu tribu'), left(new.texto, 120), ruta);
  end if;
  return new;
end;
$$;
create trigger mensajes_aviso after insert on mensajes for each row execute function aviso_mensaje();

create function aviso_plan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into avisos (usuario_id, tipo, titulo, texto, enlace)
  values (new.alumno_id, 'plan', 'Tienes un plan nuevo', left(new.nombre, 120), '/rutinas');
  return new;
end;
$$;
create trigger planes_aviso after insert on planes for each row execute function aviso_plan();

create function aviso_nutricion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into avisos (usuario_id, tipo, titulo, texto, enlace)
  values (new.alumno_id, 'nutricion', 'Tu entrenador/a actualizó tu nutrición', '', '/nutricion');
  return new;
end;
$$;
create trigger nutricion_aviso after insert or update on nutricion_objetivos for each row execute function aviso_nutricion();

create function aviso_pago() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.estado = 'pendiente' then
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
create trigger pagos_aviso after insert or update on pagos for each row execute function aviso_pago();

/* ---------- Fotos de progreso y marcas por ejercicio ---------- */
create table fotos_progreso (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuarios on delete cascade,
  fecha date not null default current_date,
  nota text not null default '' check (length(nota) <= 200),
  imagen text not null check (imagen like 'data:image/%' and length(imagen) < 600000),
  creado timestamptz not null default now()
);
create index fotos_usuario_idx on fotos_progreso (usuario_id, fecha desc);
alter table fotos_progreso enable row level security;
create policy "propio" on fotos_progreso for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "entrenador ve fotos" on fotos_progreso for select using (es_entrenador_de(usuario_id));

create table marcas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuarios on delete cascade,
  fecha date not null default current_date,
  ejercicio text not null check (length(ejercicio) between 1 and 80),
  peso_kg numeric(6,2) not null check (peso_kg >= 0 and peso_kg <= 1000),
  reps smallint not null check (reps between 1 and 1000),
  creado timestamptz not null default now()
);
create index marcas_usuario_idx on marcas (usuario_id, ejercicio, fecha desc);
alter table marcas enable row level security;
create policy "propio" on marcas for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "entrenador ve marcas" on marcas for select using (es_entrenador_de(usuario_id));

/* ---------- Retos y ranking de la tribu ---------- */
create table retos (
  id bigint generated always as identity primary key,
  entrenador_id uuid not null references usuarios on delete cascade,
  titulo text not null check (length(titulo) between 1 and 80),
  descripcion text not null default '' check (length(descripcion) <= 300),
  meta_entrenos smallint not null check (meta_entrenos between 1 and 200),
  desde date not null,
  hasta date not null,
  creado timestamptz not null default now(),
  check (hasta >= desde)
);
create index retos_entrenador_idx on retos (entrenador_id, hasta desc);
alter table retos enable row level security;
create policy "entrenador gestiona retos" on retos for all
  using (entrenador_id = auth.uid()) with check (entrenador_id = auth.uid());
create policy "alumnos ven retos de su entrenador" on retos for select
  using (entrenador_id = (select u.entrenador_id from usuarios u where u.id = auth.uid()));

-- Ranking de entrenos de los últimos 30 días. Solo entran quienes activaron
-- «compartir con la tribu»; cada quien siempre se ve a sí mismo.
create function ranking_tribu() returns table (usuario_id uuid, nombre text, entrenos bigint, es_yo boolean)
language sql stable security definer set search_path = public as $$
  with yo as (
    select u.id, case when u.rol = 'entrenador' then u.id else u.entrenador_id end as coach
    from usuarios u where u.id = auth.uid()
  )
  select u.id, u.nombre,
    (select count(*) from entrenos e where e.usuario_id = u.id and e.fecha > current_date - 30),
    (u.id = auth.uid())
  from usuarios u
  join yo on true
  left join consentimientos c on c.usuario_id = u.id
  where yo.coach is not null and u.entrenador_id = yo.coach and u.rol = 'atleta'
    and (u.id = auth.uid() or coalesce(c.comparte_con_tribu, false))
  order by 3 desc, 2
  limit 100;
$$;
revoke execute on function ranking_tribu() from public, anon;
grant execute on function ranking_tribu() to authenticated;

-- ================= 008_mercadopago_bancos =================
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

-- ================= 009_aviso_cuentas =================
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

-- ================= 010_chequeo_mensual =================
-- Migración 010: chequeo mensual con fotos (frente, perfil y espalda).
-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo. Requiere la 007.

alter table fotos_progreso
  add column tipo text not null default 'otra' check (tipo in ('frente', 'perfil', 'espalda', 'otra'));

-- Para que la entrenadora vea rápido quién tiene el chequeo al día.
create index fotos_progreso_fecha_idx on fotos_progreso (usuario_id, fecha desc);

-- ================= 011_foto_perfil =================
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
