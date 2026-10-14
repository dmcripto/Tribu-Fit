-- Migración 012: condiciones de salud sobre la comida y pesos por serie en cada entrenamiento.
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
