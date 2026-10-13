-- Migración 003: pagos (cuota mensual con tarjeta por enlace seguro, QR, transferencia o efectivo).
-- Si ya ejecutaste schema.sql antes, ejecuta SOLO este archivo en el editor SQL.
-- Tribu Fit no guarda datos de tarjeta: el pago con tarjeta se hace en la página del proveedor.

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
