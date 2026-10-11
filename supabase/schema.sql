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
