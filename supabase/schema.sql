-- Tribu Fit: esquema inicial (PostgreSQL / Supabase)
create type rol_usuario as enum ('atleta', 'entrenador');

create table usuarios (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  rol rol_usuario not null default 'atleta',
  objetivo text,
  nivel text check (nivel in ('principiante', 'intermedio', 'avanzado')),
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
  peso_kg numeric(5,2),
  grasa_pct numeric(4,1),
  cintura_cm numeric(5,1),
  pecho_cm numeric(5,1),
  brazo_cm numeric(5,1),
  pierna_cm numeric(5,1),
  foto_url text
);

create table ejercicios (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  grupo_muscular text,
  tipo text
);

create table rutinas (
  id bigint generated always as identity primary key,
  nombre text not null,
  creada_por uuid references usuarios,
  nivel text,
  dias_semana smallint
);

create table entrenos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuarios on delete cascade,
  rutina_id bigint references rutinas,
  fecha timestamptz not null default now(),
  duracion_min integer,
  calorias integer,
  notas text
);

create table series (
  id bigint generated always as identity primary key,
  entreno_id bigint not null references entrenos on delete cascade,
  ejercicio_id bigint not null references ejercicios,
  orden smallint not null,
  reps smallint,
  peso_kg numeric(6,2),
  es_record boolean not null default false
);

create table metas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references usuarios on delete cascade,
  tipo text not null,
  valor_objetivo numeric,
  fecha_limite date,
  estado text not null default 'activa'
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

create table retos (
  id bigint generated always as identity primary key,
  tribu_id bigint not null references tribus on delete cascade,
  semana date not null,
  meta_entrenos integer not null,
  progreso integer not null default 0
);

-- Los datos de salud solo los ve su dueño (RLS). Las reglas para tribu y
-- entrenador se añaden según consentimientos.
alter table usuarios enable row level security;
alter table consentimientos enable row level security;
alter table medidas enable row level security;
alter table entrenos enable row level security;
alter table series enable row level security;
alter table metas enable row level security;

create policy "propio" on usuarios for all using (id = auth.uid());
create policy "propio" on consentimientos for all using (usuario_id = auth.uid());
create policy "propio" on medidas for all using (usuario_id = auth.uid());
create policy "propio" on entrenos for all using (usuario_id = auth.uid());
create policy "propio" on metas for all using (usuario_id = auth.uid());
create policy "propio" on series for all using (
  exists (select 1 from entrenos e where e.id = entreno_id and e.usuario_id = auth.uid())
);
