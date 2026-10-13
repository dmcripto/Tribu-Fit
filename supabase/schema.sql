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
