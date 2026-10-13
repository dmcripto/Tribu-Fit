"use client";

import Link from "next/link";
import { useState } from "react";
import { useUsuario } from "@/components/AppShell";
import CampoTexto from "@/components/CampoTexto";
import Chip from "@/components/Chip";
import Desplegable from "@/components/Desplegable";
import Pestanas from "@/components/Pestanas";
import {
  METODOS, PREMIUM_TEXTO, enlaceSeguro, esImagen, estadoCuota, estadoPremium, formatoFecha,
  siguienteVencimiento, type EstadoCuota,
} from "@/lib/datos";
import { imagenADataUrl } from "@/lib/imagen";
import PremiumAviso from "@/components/PremiumAviso";
import { useCartera, usePagoConfig, usePagos, usePremium } from "@/lib/repo";
import { modoDemo } from "@/lib/supabase";
import { useToday } from "@/lib/store";
import type { Metodo, Pago, PagoConfig, Usuario } from "@/lib/types";

const MONEDAS = ["USD", "EUR", "MXN", "COP", "PEN", "ARS", "CLP", "BOB", "DOP", "UYU", "GTQ", "CRC", "PYG", "VES"];

const CUOTA: Record<EstadoCuota, { texto: string; clase: string }> = {
  sin_pagos: { texto: "Sin pagos", clase: "text-zinc-500" },
  al_dia: { texto: "Al día", clase: "text-green-700 dark:text-green-400" },
  por_vencer: { texto: "Por vencer", clase: "text-amber-700 dark:text-amber-400" },
  vencida: { texto: "Vencida", clase: "text-red-600" },
};

const ESTADO_PAGO: Record<Pago["estado"], { texto: string; clase: string }> = {
  pendiente: { texto: "Pendiente", clase: "text-amber-700 dark:text-amber-400" },
  confirmado: { texto: "Confirmado", clase: "text-green-700 dark:text-green-400" },
  rechazado: { texto: "Rechazado", clase: "text-red-600" },
};

const dinero = (n: number, moneda: string) => `${n.toFixed(2).replace(".", ",")} ${moneda}`;

function Imagen({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // Solo imágenes en data URL (validadas al subir): no se carga nada externo.
  // eslint-disable-next-line @next/next/no-img-element
  return esImagen(src) ? <img src={src} alt={alt} className={className} /> : null;
}

function Aviso({ msg }: { msg: { ok: boolean; texto: string } | null }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
      {msg.texto}
    </p>
  );
}

/* ---------------- Alumno ---------------- */

function VistaAlumno({ usuario }: { usuario: Usuario }) {
  const hoy = useToday();
  const { config } = usePagoConfig(usuario);
  const { pagos, registrar } = usePagos(usuario);
  const mios = pagos.filter((p) => p.alumno_id === usuario.id);
  const cuota = estadoCuota(mios, hoy);
  const premium = usePremium(usuario);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [enviando, setEnviando] = useState(false);

  async function avisar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!config) return;
    const f = new FormData(e.currentTarget);
    const monto = Number(String(f.get("monto") ?? "").replace(",", "."));
    if (!(monto > 0 && monto < 1_000_000)) return setMsg({ ok: false, texto: "Escribe el monto que pagaste." });
    let comprobante: string | undefined;
    const archivo = f.get("comprobante");
    if (archivo instanceof File && archivo.size > 0) {
      const r = await imagenADataUrl(archivo, { lado: 900, tipo: "image/jpeg" });
      if (r.error) return setMsg({ ok: false, texto: r.error });
      comprobante = r.url;
    }
    setEnviando(true);
    const fallo = await registrar({
      alumno_id: usuario.id, monto, moneda: config.moneda, metodo: String(f.get("metodo")) as Metodo,
      referencia: String(f.get("referencia") ?? "").trim(), comprobante,
    });
    setEnviando(false);
    if (fallo) return setMsg({ ok: false, texto: fallo });
    setMsg({ ok: true, texto: "Pago enviado. Tu entrenador/a lo confirmará y tu cuota se actualizará." });
    setFormKey((k) => k + 1);
  }

  const sinVinculo = !modoDemo && !usuario.entrenadorId;
  const hayTarjeta = !!config && !!config.enlace && enlaceSeguro(config.enlace);
  const hayQr = !!config && esImagen(config.qr);
  const metodos = [
    ...(hayTarjeta ? [{ id: "tarjeta", texto: "Tarjeta" }] : []),
    ...(hayQr ? [{ id: "qr", texto: "QR" }] : []),
    { id: "otro", texto: "Transferencia o efectivo" },
  ];
  const [metodoElegido, setMetodoElegido] = useState<string | null>(null);
  const metodoActivo = metodoElegido && metodos.some((m) => m.id === metodoElegido) ? metodoElegido : metodos[0].id;

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="titulo">Pagos</h1>
        <p className="mt-2 text-sm">
          Tu cuota: <Chip tono={cuota.estado === "al_dia" ? "ok" : cuota.estado === "por_vencer" ? "aviso" : cuota.estado === "vencida" ? "mal" : "neutro"}>{CUOTA[cuota.estado].texto}</Chip>
          {cuota.vence && <span className="text-zinc-500"> · cubierta hasta el {formatoFecha(cuota.vence)}</span>}
        </p>
      </div>

      <PremiumAviso estado={premium} mostrarActivo sinBoton />

      {sinVinculo ? (
        <section className="tarjeta flex flex-col items-start gap-3">
          <p className="text-zinc-600 dark:text-zinc-400">
            Aún no estás vinculado/a a un entrenador/a. Escribe su código en tu Inicio para ver cómo pagar.
          </p>
          <Link href="/panel" className="btn-primary">Ir a Inicio</Link>
        </section>
      ) : !config ? (
        <section className="tarjeta">
          <p className="text-zinc-600 dark:text-zinc-400">Tu entrenador/a aún no ha configurado los pagos. Vuelve más tarde.</p>
        </section>
      ) : (
        <>
          <section className="tarjeta flex flex-col gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Cuota mensual</p>
              <p className="text-4xl font-black tabular-nums sm:text-5xl">{dinero(config.precio, config.moneda)}</p>
            </div>
            <Pestanas etiqueta="Cómo pagar" items={metodos} activa={metodoActivo} onCambia={setMetodoElegido} />
            <div role="tabpanel" className="flex flex-col items-start gap-3">
              {metodoActivo === "tarjeta" && (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Pagas con tu tarjeta de débito o crédito en la página segura de tu proveedor. Tribu Fit nunca ve ni guarda los datos de tu tarjeta.
                  </p>
                  <a href={config.enlace} target="_blank" rel="noopener noreferrer" className="btn-primary">Pagar con tarjeta</a>
                </>
              )}
              {metodoActivo === "qr" && (
                <>
                  <Imagen src={config.qr} alt="Código QR para pagar a tu entrenador/a" className="aspect-square w-full max-w-64 rounded-lg bg-white object-contain p-2" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Escanéalo con la app de tu banco o billetera y paga {dinero(config.precio, config.moneda)}.</p>
                </>
              )}
              {metodoActivo === "otro" && (
                <p className="whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                  {config.instrucciones || "Pregunta a tu entrenador/a cómo pagarle por transferencia o en efectivo."}
                </p>
              )}
            </div>
          </section>

          <Desplegable titulo="Ya pagué" detalle="Avisa a tu entrenador/a para que lo confirme" abierto>
            <form key={formKey} onSubmit={avisar} noValidate className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="etiqueta" htmlFor="p-metodo">Cómo pagaste</label>
                  <select className="campo" id="p-metodo" name="metodo" defaultValue="qr">
                    {(Object.keys(METODOS) as Metodo[]).map((m) => <option key={m} value={m}>{METODOS[m]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="etiqueta" htmlFor="p-monto">Monto ({config.moneda})</label>
                  <input className="campo" id="p-monto" name="monto" inputMode="decimal" defaultValue={String(config.precio).replace(".", ",")} />
                </div>
                <div>
                  <label className="etiqueta" htmlFor="p-ref">N.º de operación</label>
                  <CampoTexto id="p-ref" name="referencia" placeholder="Opcional" autoComplete="off" />
                </div>
              </div>
              <div>
                <label className="etiqueta" htmlFor="p-comp">Comprobante (foto o captura, opcional)</label>
                <input className="campo" id="p-comp" name="comprobante" type="file" accept="image/png,image/jpeg,image/webp" />
              </div>
              <Aviso msg={msg} />
              <div><button className="btn-primary" disabled={enviando}>{enviando ? "Enviando..." : "Enviar aviso de pago"}</button></div>
            </form>
          </Desplegable>
        </>
      )}

      <Desplegable titulo={`Mis pagos (${mios.length})`}>
        {mios.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no hay pagos registrados.</p>
        ) : (
          <ul className="flex flex-col text-sm">
            {mios.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-zinc-200 py-2 dark:border-zinc-800">
                <span>
                  <span className="font-bold tabular-nums">{dinero(p.monto, p.moneda)}</span>
                  <span className="text-zinc-500"> · {METODOS[p.metodo]} · {formatoFecha(p.creado.slice(0, 10))}</span>
                </span>
                <span className="flex items-center gap-2">
                  {p.vence && <span className="text-xs text-zinc-500">hasta {formatoFecha(p.vence)}</span>}
                  <Chip tono={p.estado === "confirmado" ? "ok" : p.estado === "pendiente" ? "aviso" : "mal"}>{ESTADO_PAGO[p.estado].texto}</Chip>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Desplegable>

      <Desplegable titulo="Qué incluye el premium">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"><b>Plan de rutinas hecho para ti</b>, liberado semana a semana.</li>
          <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"><b>Nutrición personalizada</b>: calorías, macros y notas.</li>
          <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"><b>Seguimiento de tu progreso</b> por tu entrenador/a, con ajustes.</li>
          <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"><b>Aviso si te estancas</b> o dejas de entrenar.</li>
        </ul>
        <p className="text-xs text-zinc-500">Si la cuota no se paga a tiempo, el premium se bloquea solo y vuelve en cuanto tu entrenador/a confirma tu pago. Tus medidas, comidas y entrenos nunca se borran.</p>
      </Desplegable>
    </main>
  );
}

/* ---------------- Entrenador/a ---------------- */

type Mensaje = { ok: boolean; texto: string } | null;

function FormCobro({
  inicial, guardar, msg, setMsg,
}: {
  inicial: PagoConfig | null;
  guardar: (c: PagoConfig) => Promise<string | null>;
  /** El aviso vive en el padre: este formulario se crea de nuevo cuando el cobro termina de cargar. */
  msg: Mensaje;
  setMsg: (m: Mensaje) => void;
}) {
  const [moneda, setMoneda] = useState(inicial?.moneda ?? "USD");
  const [precio, setPrecio] = useState(inicial ? String(inicial.precio).replace(".", ",") : "");
  const [instrucciones, setInstrucciones] = useState(inicial?.instrucciones ?? "");
  const [enlace, setEnlace] = useState(inicial?.enlace ?? "");
  const [qr, setQr] = useState(inicial?.qr ?? "");
  const [gracia, setGracia] = useState(String(inicial?.gracia ?? 3));
  const [enviando, setEnviando] = useState(false);
  const monedas = MONEDAS.includes(moneda) ? MONEDAS : [moneda, ...MONEDAS];

  async function subirQr(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const r = await imagenADataUrl(archivo, { lado: 640, tipo: "image/png" });
    if (r.error) return setMsg({ ok: false, texto: r.error });
    setQr(r.url ?? "");
    setMsg(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const p = Number(precio.replace(",", "."));
    if (!(p > 0 && p < 1_000_000)) return setMsg({ ok: false, texto: "Escribe el precio de la cuota mensual." });
    const url = enlace.trim();
    if (url && !enlaceSeguro(url)) return setMsg({ ok: false, texto: "El enlace de pago debe empezar por https://" });
    const g = Number(gracia);
    if (!Number.isInteger(g) || g < 0 || g > 30) return setMsg({ ok: false, texto: "Los días de gracia deben ser un número entre 0 y 30." });
    setEnviando(true);
    const fallo = await guardar({ moneda, precio: p, instrucciones: instrucciones.trim(), enlace: url, qr, gracia: g });
    setEnviando(false);
    setMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: "Cobro guardado. Tus alumnos ya lo ven en su pestaña Pagos." });
  }

  return (
    <form onSubmit={enviar} noValidate className="tarjeta flex flex-col gap-4">
      <h2 className="subtitulo">Mi cobro</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div>
          <label className="etiqueta" htmlFor="cb-precio">Cuota mensual</label>
          <input className="campo" id="cb-precio" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="30" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="cb-moneda">Moneda</label>
          <select className="campo" id="cb-moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
            {monedas.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="etiqueta" htmlFor="cb-enlace">Enlace de pago con tarjeta (opcional)</label>
        <CampoTexto id="cb-enlace" valor={enlace} onCambio={setEnlace} placeholder="https://..." autoComplete="off" />
        <p className="mt-1 text-xs text-zinc-500">
          Crea un enlace de cobro en tu proveedor (Mercado Pago, Stripe, PayPal u otro) y pégalo aquí. El alumno paga con su tarjeta en la página de ese proveedor.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label className="etiqueta" htmlFor="cb-qr">Código QR de cobro (opcional)</label>
        <input className="campo" id="cb-qr" type="file" accept="image/png,image/jpeg,image/webp" onChange={subirQr} />
        {esImagen(qr) && (
          <div className="flex items-end gap-3">
            <Imagen src={qr} alt="Vista previa de tu QR" className="size-32 rounded-lg bg-white object-contain p-1" />
            <button type="button" className="text-sm font-bold text-red-600" onClick={() => setQr("")}>Quitar QR</button>
          </div>
        )}
      </div>
      <div className="max-w-48">
        <label className="etiqueta" htmlFor="cb-gracia">Días de gracia</label>
        <input className="campo" id="cb-gracia" inputMode="numeric" value={gracia} onChange={(e) => setGracia(e.target.value)} />
        <p className="mt-1 text-xs text-zinc-500">
          Tras vencer la cuota, el alumno conserva su seguimiento personalizado estos días. Después se bloquea solo hasta que pague.
        </p>
      </div>
      <div>
        <label className="etiqueta" htmlFor="cb-instr">Instrucciones para tus alumnos</label>
        <textarea className="campo min-h-24" id="cb-instr" value={instrucciones} onChange={(e) => setInstrucciones(e.target.value)} placeholder="Transferencia: Banco X, cuenta 000, titular. Envía tu comprobante aquí." />
      </div>
      <Aviso msg={msg} />
      <div><button className="btn-primary" disabled={enviando}>{enviando ? "Guardando..." : "Guardar cobro"}</button></div>
    </form>
  );
}

function VistaEntrenador({ usuario }: { usuario: Usuario }) {
  const hoy = useToday();
  const { config, guardar } = usePagoConfig(usuario);
  const { pagos, registrar, resolver } = usePagos(usuario);
  const { alumnos, excepciones } = useCartera(usuario);
  const [msg, setMsg] = useState<Mensaje>(null);
  const [manualMsg, setManualMsg] = useState<Mensaje>(null);
  const [cobroMsg, setCobroMsg] = useState<Mensaje>(null);
  const [elegida, setElegida] = useState<string | null>(null);

  const nombre = (id: string) => alumnos.find((a) => a.id === id)?.nombre ?? "Alumno";
  const pendientes = pagos.filter((p) => p.estado === "pendiente");
  const deAlumno = (id: string) => pagos.filter((p) => p.alumno_id === id);
  const cuotas = alumnos
    .map((a) => ({
      a,
      ...estadoCuota(deAlumno(a.id), hoy),
      premium: estadoPremium({
        pagos: deAlumno(a.id), cobra: config !== null, gracia: config?.gracia ?? 3, excepcion: excepciones[a.id], hoy,
      }),
    }))
    .sort((x, y) => ({ vencida: 0, por_vencer: 1, sin_pagos: 2, al_dia: 3 }[x.estado] - { vencida: 0, por_vencer: 1, sin_pagos: 2, al_dia: 3 }[y.estado]));
  // Sin cobro configurado, lo primero es configurarlo.
  const tab = elegida ?? (config === null ? "cobro" : "cobros");
  // Al guardar por primera vez se queda en esta pestaña, para ver la confirmación.
  const guardarYQuedarse = async (c: PagoConfig) => {
    setElegida("cobro");
    return guardar(c);
  };

  async function resolverPago(p: Pago, estado: "confirmado" | "rechazado") {
    const vence = estado === "confirmado" ? siguienteVencimiento(deAlumno(p.alumno_id), hoy) : undefined;
    const fallo = await resolver(p.id, estado, vence);
    setMsg(
      fallo
        ? { ok: false, texto: fallo }
        : { ok: true, texto: estado === "confirmado" ? `Pago confirmado. ${nombre(p.alumno_id).split(" ")[0]} queda al día hasta el ${formatoFecha(vence as string)}.` : "Pago rechazado." },
    );
  }

  async function manual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    const f = new FormData(formulario);
    const id = String(f.get("alumno") ?? "");
    const monto = Number(String(f.get("monto") ?? "").replace(",", "."));
    if (!id) return setManualMsg({ ok: false, texto: "Elige un alumno." });
    if (!(monto > 0)) return setManualMsg({ ok: false, texto: "Escribe el monto cobrado." });
    const vence = siguienteVencimiento(deAlumno(id), hoy);
    const fallo = await registrar({
      alumno_id: id, monto, moneda: config?.moneda ?? "USD", metodo: String(f.get("metodo")) as Metodo,
      referencia: "", confirmado: { vence },
    });
    setManualMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: `Cobro registrado. Cuota al día hasta el ${formatoFecha(vence)}.` });
    if (!fallo) formulario.reset();
  }

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="titulo">Pagos</h1>
        {config !== null && (
          <p className="mt-2 text-sm text-zinc-500">
            Cuota de {dinero(config.precio, config.moneda)} al mes · {config.gracia} días de gracia
          </p>
        )}
      </div>

      <Pestanas
        etiqueta="Secciones de pagos"
        activa={tab}
        onCambia={setElegida}
        items={[
          { id: "cobros", texto: "Cobros", aviso: pendientes.length },
          { id: "cuotas", texto: "Alumnos" },
          { id: "cobro", texto: "Mi cobro" },
        ]}
      />

      {tab === "cobros" && (
        <div role="tabpanel" className="flex flex-col gap-5">
          <Aviso msg={msg} />
          <section className="tarjeta flex flex-col gap-1">
            <h2 className="subtitulo">Por confirmar</h2>
            {pendientes.length === 0 ? (
              <p className="text-sm text-zinc-500">No tienes pagos pendientes.</p>
            ) : (
              <ul className="flex flex-col">
                {pendientes.map((p) => (
                  <li key={p.id} className="flex flex-col gap-2 border-t border-zinc-200 py-3 dark:border-zinc-800">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold">{nombre(p.alumno_id)}</span>
                      <span className="font-mono text-sm tabular-nums">{dinero(p.monto, p.moneda)}</span>
                    </div>
                    <p className="text-sm text-zinc-500">
                      {METODOS[p.metodo]} · {formatoFecha(p.creado.slice(0, 10))}{p.referencia ? ` · operación ${p.referencia}` : ""}
                    </p>
                    {esImagen(p.comprobante) && (
                      <details>
                        <summary className="cursor-pointer text-sm font-bold text-orange-600">Ver comprobante</summary>
                        <Imagen src={p.comprobante} alt={`Comprobante de ${nombre(p.alumno_id)}`} className="mt-2 max-h-96 max-w-full rounded-lg border border-zinc-200 dark:border-zinc-800" />
                      </details>
                    )}
                    <div className="flex gap-3">
                      <button type="button" className="btn-primary" onClick={() => resolverPago(p, "confirmado")}>Confirmar</button>
                      <button type="button" className="btn-ghost" onClick={() => resolverPago(p, "rechazado")}>Rechazar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Desplegable titulo="Registrar un cobro en mano" detalle="Efectivo o transferencia que ya recibiste">
            <form onSubmit={manual} noValidate className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="etiqueta" htmlFor="m-alumno">Alumno</label>
                  <select className="campo" id="m-alumno" name="alumno" defaultValue="">
                    <option value="" disabled>Elige...</option>
                    {alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="etiqueta" htmlFor="m-metodo">Método</label>
                  <select className="campo" id="m-metodo" name="metodo" defaultValue="efectivo">
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="etiqueta" htmlFor="m-monto">Monto{config ? ` (${config.moneda})` : ""}</label>
                  <input className="campo" id="m-monto" name="monto" inputMode="decimal" defaultValue={config ? String(config.precio).replace(".", ",") : ""} key={config?.precio ?? "x"} />
                </div>
              </div>
              <p className="text-sm text-zinc-500">Se confirma al momento y extiende la cuota 30 días.</p>
              <Aviso msg={manualMsg} />
              <div><button className="btn-primary">Registrar cobro</button></div>
            </form>
          </Desplegable>
        </div>
      )}

      {tab === "cuotas" && (
        <div role="tabpanel" className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500">
            El premium se bloquea solo cuando la cuota vence y pasan los días de gracia. Para bloquear a alguien a mano o darle cortesía, abre su ficha en Alumnos y entra en Pago.
          </p>
          {cuotas.length === 0 ? (
            <p className="tarjeta text-sm text-zinc-500">Aún no tienes alumnos vinculados.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {cuotas.map(({ a, estado, vence, premium }) => (
                <li key={a.id} className="tarjeta flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-black">{a.nombre}</span>
                    <Chip tono={estado === "al_dia" ? "ok" : estado === "por_vencer" ? "aviso" : estado === "vencida" ? "mal" : "neutro"}>{CUOTA[estado].texto}</Chip>
                  </div>
                  <p className="text-sm text-zinc-500">{vence ? `Cubierta hasta el ${formatoFecha(vence)}` : "Sin pagos confirmados"}</p>
                  <span>
                    <Chip tono={premium.activo ? (premium.motivo === "en_gracia" ? "aviso" : "ok") : "mal"}>Premium: {PREMIUM_TEXTO[premium.motivo]}</Chip>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "cobro" && (
        <div role="tabpanel">
          <FormCobro key={config ? "cargado" : "vacio"} inicial={config} guardar={guardarYQuedarse} msg={cobroMsg} setMsg={setCobroMsg} />
        </div>
      )}
    </main>
  );
}

export default function Pagos() {
  const usuario = useUsuario();
  if (!usuario) return null;
  return usuario.rol === "entrenador" ? <VistaEntrenador usuario={usuario} /> : <VistaAlumno usuario={usuario} />;
}
