-- Migración 006: perfil de entrenamiento del alumno y propuestas automáticas.
-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo en el editor SQL.
-- Requiere las migraciones anteriores (003 y 004 para pagos y premium).

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
