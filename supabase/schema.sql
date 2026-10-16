-- Tribu Fit: esquema (PostgreSQL / Supabase). Ejecutar completo en el editor SQL.
create type rol_usuario as enum ('atleta', 'entrenador');

create table usuarios (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  rol rol_usuario not null default 'atleta',
  objetivo text,
  nivel text check (nivel in ('principiante', 'intermedio', 'avanzado')),
  entrenador_id uuid references usuarios on delete set null,
  codigo_invitacion text unique,
  fecha_alta timestamptz not null default now()
);

create table consentimientos (
  usuario_id uuid primary key references usuarios on delete cascade,
  datos_salud boolean not null default false,
  comparte_con_tribu boolean not null default false,
  comparte_con_entrenador boolean not null default false,
  actualizado timestamptz not null default now()
);

create table medidas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuarios on delete cascade,
  fecha date not null default current_date,
  peso_kg numeric(5,2) not null,
  grasa_pct numeric(4,1),
  cintura_cm numeric(5,1),
  unique (usuario_id, fecha)
);

create table entrenos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuarios on delete cascade,
  fecha date not null default current_date,
  rutina text not null,
  hechos smallint not null,
  total smallint not null
);

create table planes (
  id bigint generated always as identity primary key,
  entrenador_id uuid not null references usuarios on delete cascade,
  alumno_id uuid not null references usuarios on delete cascade,
  nombre text not null,
  fecha_inicio date not null,
  creado timestamptz not null default now()
);

-- Cada semana del plan guarda sus rutinas como JSON:
-- [{ "nombre": "...", "detalle": "...", "ejercicios": [{ "nombre": "...", "series": "4 × 6", "carga": "80 kg" }] }]
create table plan_semanas (
  plan_id bigint not null references planes on delete cascade,
  semana smallint not null,
  rutinas jsonb not null,
  primary key (plan_id, semana)
);

create table tribus (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  objetivo text
);

create table tribu_miembros (
  tribu_id bigint references tribus on delete cascade,
  usuario_id uuid references usuarios on delete cascade,
  puntos integer not null default 0,
  rango text not null default 'Novato',
  primary key (tribu_id, usuario_id)
);

-- El entrenador solo ve datos de alumnos vinculados a él que le dieron permiso.
create function es_entrenador_de(alumno uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from usuarios u
    join consentimientos c on c.usuario_id = u.id
    where u.id = alumno and u.entrenador_id = auth.uid() and c.comparte_con_entrenador
  );
$$;

-- El alumno se vincula con el código de invitación de su entrenador/a.
create function vincular_entrenador(p_codigo text) returns boolean
language plpgsql security definer set search_path = public as $$
declare coach uuid;
begin
  select id into coach from usuarios
    where rol = 'entrenador' and codigo_invitacion = upper(trim(p_codigo));
  if coach is null then return false; end if;
  update usuarios set entrenador_id = coach where id = auth.uid() and id <> coach;
  return true;
end $$;

alter table usuarios enable row level security;
alter table consentimientos enable row level security;
alter table medidas enable row level security;
alter table entrenos enable row level security;
alter table planes enable row level security;
alter table plan_semanas enable row level security;
-- Sin políticas: nadie puede leer ni escribir hasta definirlas (se usarán en la fase de tribus).
alter table tribus enable row level security;
alter table tribu_miembros enable row level security;

-- Las funciones solo las pueden ejecutar usuarios con sesión iniciada.
revoke execute on function es_entrenador_de(uuid) from public, anon;
revoke execute on function vincular_entrenador(text) from public, anon;
grant execute on function es_entrenador_de(uuid) to authenticated;
grant execute on function vincular_entrenador(text) to authenticated;

create policy "propio" on usuarios for all using (id = auth.uid()) with check (id = auth.uid());
create policy "entrenador ve a sus alumnos" on usuarios for select using (entrenador_id = auth.uid());

create policy "propio" on consentimientos for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "entrenador ve permisos" on consentimientos for select using (
  exists (select 1 from usuarios u where u.id = usuario_id and u.entrenador_id = auth.uid())
);

create policy "propio" on medidas for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "entrenador ve medidas" on medidas for select using (es_entrenador_de(usuario_id));

create policy "propio" on entrenos for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "entrenador ve entrenos" on entrenos for select using (es_entrenador_de(usuario_id));

create policy "entrenador gestiona sus planes" on planes for all
  using (entrenador_id = auth.uid())
  with check (
    entrenador_id = auth.uid()
    and exists (select 1 from usuarios u where u.id = alumno_id and u.entrenador_id = auth.uid())
  );
create policy "alumno ve sus planes" on planes for select using (alumno_id = auth.uid());

create policy "entrenador gestiona semanas" on plan_semanas for all
  using (exists (select 1 from planes p where p.id = plan_id and p.entrenador_id = auth.uid()))
  with check (exists (select 1 from planes p where p.id = plan_id and p.entrenador_id = auth.uid()));
-- El alumno solo ve las semanas ya liberadas (la semana N se libera N-1 semanas después del inicio).
create policy "alumno ve semanas liberadas" on plan_semanas for select using (
  exists (
    select 1 from planes p
    where p.id = plan_id and p.alumno_id = auth.uid()
      and p.fecha_inicio + ((semana - 1) * 7) <= current_date
  )
);

-- Nutrición personalizada (migración 002)

create table comidas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuarios on delete cascade,
  fecha date not null default current_date,
  nombre text not null,
  kcal integer not null,
  proteina_g numeric(6,1) not null default 0,
  carbos_g numeric(6,1) not null default 0,
  grasas_g numeric(6,1) not null default 0
);

create table agua (
  usuario_id uuid not null references usuarios on delete cascade,
  fecha date not null,
  vasos smallint not null default 0,
  primary key (usuario_id, fecha)
);

-- Objetivo nutricional que la entrenadora fija para cada alumno.
create table nutricion_objetivos (
  alumno_id uuid primary key references usuarios on delete cascade,
  entrenador_id uuid not null references usuarios on delete cascade,
  kcal integer not null,
  proteina_g integer not null,
  carbos_g integer not null,
  grasas_g integer not null,
  agua_vasos smallint not null default 8,
  notas text not null default '',
  actualizado timestamptz not null default now()
);

alter table comidas enable row level security;
alter table agua enable row level security;
alter table nutricion_objetivos enable row level security;

create policy "propio" on comidas for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "entrenador ve comidas" on comidas for select using (es_entrenador_de(usuario_id));

create policy "propio" on agua for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "entrenador ve agua" on agua for select using (es_entrenador_de(usuario_id));

create policy "entrenador gestiona objetivos" on nutricion_objetivos for all
  using (entrenador_id = auth.uid())
  with check (
    entrenador_id = auth.uid()
    and exists (select 1 from usuarios u where u.id = alumno_id and u.entrenador_id = auth.uid())
  );
create policy "alumno ve su objetivo" on nutricion_objetivos for select using (alumno_id = auth.uid());

-- Pagos (migración 003)

create table pago_config (
  entrenador_id uuid primary key references usuarios on delete cascade,
  moneda text not null default 'USD',
  precio numeric(10,2) not null default 0 check (precio >= 0),
  instrucciones text not null default '',
  enlace_tarjeta text check (enlace_tarjeta is null or enlace_tarjeta ~ '^https://'),
  qr_imagen text check (qr_imagen is null or (qr_imagen like 'data:image/%' and length(qr_imagen) < 600000)),
  actualizado timestamptz not null default now()
);

create table pagos (
  id bigint generated always as identity primary key,
  alumno_id uuid not null references usuarios on delete cascade,
  entrenador_id uuid not null references usuarios on delete cascade,
  monto numeric(10,2) not null check (monto > 0),
  moneda text not null,
  metodo text not null check (metodo in ('tarjeta', 'qr', 'transferencia', 'efectivo')),
  referencia text not null default '',
  comprobante text check (comprobante is null or (comprobante like 'data:image/%' and length(comprobante) < 600000)),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'rechazado')),
  vence date,
  creado timestamptz not null default now()
);
create index pagos_alumno_idx on pagos (alumno_id, creado desc);
create index pagos_entrenador_idx on pagos (entrenador_id, creado desc);

alter table pago_config enable row level security;
alter table pagos enable row level security;

create policy "entrenador gestiona su cobro" on pago_config for all
  using (entrenador_id = auth.uid()) with check (entrenador_id = auth.uid());
create policy "alumno ve el cobro de su entrenador" on pago_config for select
  using (entrenador_id = (select u.entrenador_id from usuarios u where u.id = auth.uid()));

-- El alumno solo puede avisar de un pago pendiente a su propio entrenador.
create policy "alumno avisa su pago" on pagos for insert with check (
  alumno_id = auth.uid() and estado = 'pendiente' and vence is null
  and entrenador_id = (select u.entrenador_id from usuarios u where u.id = auth.uid())
);
create policy "alumno ve sus pagos" on pagos for select using (alumno_id = auth.uid());

-- La entrenadora confirma o rechaza, y puede registrar cobros en efectivo.
create policy "entrenador ve pagos" on pagos for select using (entrenador_id = auth.uid());
create policy "entrenador resuelve pagos" on pagos for update
  using (entrenador_id = auth.uid()) with check (entrenador_id = auth.uid());
create policy "entrenador registra pagos" on pagos for insert with check (
  entrenador_id = auth.uid()
  and exists (select 1 from usuarios u where u.id = alumno_id and u.entrenador_id = auth.uid())
);

-- Premium (migración 004)

-- Días de gracia tras el vencimiento antes de bloquear (los fija cada entrenadora).
alter table pago_config add column dias_gracia smallint not null default 3
  check (dias_gracia between 0 and 30);

-- Excepciones que fija la entrenadora para un alumno: bloquearlo o darle cortesía (premium gratis).
-- Van en tabla aparte: el alumno no puede editarlas.
create table premium_excepciones (
  alumno_id uuid primary key references usuarios on delete cascade,
  entrenador_id uuid not null references usuarios on delete cascade,
  modo text not null check (modo in ('bloqueado', 'cortesia')),
  actualizado timestamptz not null default now()
);
alter table premium_excepciones enable row level security;
create policy "entrenador gestiona excepciones" on premium_excepciones for all
  using (entrenador_id = auth.uid())
  with check (
    entrenador_id = auth.uid()
    and exists (select 1 from usuarios u where u.id = alumno_id and u.entrenador_id = auth.uid())
  );
create policy "alumno ve su excepcion" on premium_excepciones for select using (alumno_id = auth.uid());

-- ¿Tiene el alumno el seguimiento personalizado activo?
--  - Sin entrenadora, o con una entrenadora que no cobra: sí.
--  - Bloqueado por la entrenadora: no. Con cortesía: sí.
--  - Si no: necesita un pago confirmado cuyo vencimiento más los días de gracia no haya pasado.
create function premium_activo(alumno uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from premium_excepciones e where e.alumno_id = alumno and e.modo = 'bloqueado') then false
    when exists (select 1 from premium_excepciones e where e.alumno_id = alumno and e.modo = 'cortesia') then true
    when not exists (
      select 1 from usuarios u join pago_config c on c.entrenador_id = u.entrenador_id where u.id = alumno
    ) then true
    else exists (
      select 1
      from pagos p
      join usuarios u on u.id = p.alumno_id
      join pago_config c on c.entrenador_id = u.entrenador_id
      where p.alumno_id = alumno and p.estado = 'confirmado' and p.vence is not null
        and p.vence + c.dias_gracia >= current_date
    )
  end;
$$;
revoke execute on function premium_activo(uuid) from public, anon;
grant execute on function premium_activo(uuid) to authenticated;

-- El contenido personalizado solo se entrega mientras el premium está activo.
drop policy "alumno ve sus planes" on planes;
create policy "alumno ve sus planes" on planes for select
  using (alumno_id = auth.uid() and premium_activo(auth.uid()));

drop policy "alumno ve semanas liberadas" on plan_semanas;
create policy "alumno ve semanas liberadas" on plan_semanas for select using (
  premium_activo(auth.uid())
  and exists (
    select 1 from planes p
    where p.id = plan_id and p.alumno_id = auth.uid()
      and p.fecha_inicio + ((semana - 1) * 7) <= current_date
  )
);

drop policy "alumno ve su objetivo" on nutricion_objetivos;
create policy "alumno ve su objetivo" on nutricion_objetivos for select
  using (alumno_id = auth.uid() and premium_activo(auth.uid()));

-- Cuenta y términos (migración 005)
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

-- Perfil y propuestas automáticas (migración 006)

-- Datos que el alumno aporta para que el sistema pueda personalizar su plan.
create table perfiles_fitness (
  alumno_id uuid primary key references usuarios on delete cascade,
  edad smallint check (edad between 10 and 100),
  sexo text not null default 'no_dice' check (sexo in ('mujer', 'hombre', 'no_dice')),
  altura_cm smallint check (altura_cm between 100 and 250),
  dias_semana smallint not null default 3 check (dias_semana between 1 and 7),
  lugar text not null default 'gimnasio' check (lugar in ('casa', 'gimnasio')),
  lesiones text not null default '' check (length(lesiones) <= 600),
  restricciones text not null default '' check (length(restricciones) <= 600),
  actualizado timestamptz not null default now()
);
alter table perfiles_fitness enable row level security;
create policy "propio" on perfiles_fitness for all
  using (alumno_id = auth.uid()) with check (alumno_id = auth.uid());
-- La entrenadora lo ve solo si el alumno le dio permiso.
create policy "entrenador ve perfiles" on perfiles_fitness for select using (es_entrenador_de(alumno_id));

-- Borradores que genera el sistema. Solo los ve la entrenadora: no hay ninguna política para
-- el alumno. Llegan a él únicamente cuando ella los aprueba y se convierten en un plan o un objetivo.
create table propuestas (
  id bigint generated always as identity primary key,
  alumno_id uuid not null references usuarios on delete cascade,
  entrenador_id uuid not null references usuarios on delete cascade,
  tipo text not null check (tipo in ('rutinas', 'nutricion')),
  contenido jsonb not null,
  razones jsonb not null default '[]',
  avisos jsonb not null default '[]',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  creado timestamptz not null default now(),
  resuelto timestamptz
);
-- Como mucho una propuesta pendiente por alumno y tipo (evita duplicados si se abre en dos dispositivos).
create unique index propuestas_pendiente_unica on propuestas (alumno_id, tipo) where estado = 'pendiente';
create index propuestas_entrenador_idx on propuestas (entrenador_id, estado, creado desc);
alter table propuestas enable row level security;
create policy "entrenador gestiona propuestas" on propuestas for all
  using (entrenador_id = auth.uid())
  with check (
    entrenador_id = auth.uid()
    and exists (select 1 from usuarios u where u.id = alumno_id and u.entrenador_id = auth.uid())
  );

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

-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo. Requiere la 007.

alter table fotos_progreso
  add column tipo text not null default 'otra' check (tipo in ('frente', 'perfil', 'espalda', 'otra'));

-- Para que la entrenadora vea rápido quién tiene el chequeo al día.
create index fotos_progreso_fecha_idx on fotos_progreso (usuario_id, fecha desc);

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

-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo. Requiere la 007 (tabla marcas).

/* ---------- Condiciones de salud (alimentación) ---------- */
-- Tabla aparte de perfiles_fitness para no tocar lo que ya funciona. Son datos de salud:
-- solo la ve la entrenadora si el alumno le dio permiso (igual que su perfil y sus medidas).
create table condiciones_salud (
  alumno_id uuid primary key references usuarios on delete cascade,
  condiciones text[] not null default '{}' check (cardinality(condiciones) <= 12),
  detalle text not null default '' check (length(detalle) <= 300),
  actualizado timestamptz not null default now()
);
alter table condiciones_salud enable row level security;
create policy "propio" on condiciones_salud for all
  using (alumno_id = auth.uid()) with check (alumno_id = auth.uid());
create policy "entrenador ve condiciones" on condiciones_salud for select using (es_entrenador_de(alumno_id));

/* ---------- Pesos por serie ---------- */
-- Cada serie de cada entrenamiento es una fila de «marcas» (con su número de serie).
-- Una misma serie del mismo día se guarda una sola vez (se corrige en lugar de duplicarse).
alter table marcas add column serie smallint check (serie between 1 and 20);
create unique index marcas_serie_unica on marcas (usuario_id, fecha, ejercicio, serie);


/* ---------- Migración 013: perfil izquierdo y derecho en el chequeo mensual ---------- */
alter table fotos_progreso drop constraint if exists fotos_progreso_tipo_check;
alter table fotos_progreso add constraint fotos_progreso_tipo_check
  check (tipo in ('frente', 'perfil', 'perfil_izq', 'perfil_der', 'espalda', 'otra'));
