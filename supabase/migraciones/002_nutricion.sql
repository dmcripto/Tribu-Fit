-- Migración 002: nutrición personalizada.
-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo en el editor SQL.

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
