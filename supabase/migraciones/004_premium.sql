-- Migración 004: sector premium (seguimiento personalizado) con bloqueo automático por falta de pago.
-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo en el editor SQL.
-- Requiere la migración 003 (pagos).

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
