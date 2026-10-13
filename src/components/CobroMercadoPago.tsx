"use client";

import { useState } from "react";
import { conectarMp, desconectarMp, useMpEstado } from "@/lib/mp";
import { modoDemo } from "@/lib/supabase";
import type { Usuario } from "@/lib/types";

/** Conexión de la entrenadora con su cuenta de Mercado Pago, para cobrar y confirmar solo. */
export default function CobroMercadoPago({ usuario }: { usuario: Usuario }) {
  const [estado, recargar] = useMpEstado(usuario);
  const [token, setToken] = useState("");
  const [verToken, setVerToken] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function conectar(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return setMsg({ ok: false, texto: "Pega tu Access Token de producción." });
    setTrabajando(true);
    const r = await conectarMp(token);
    setTrabajando(false);
    if (r.error) return setMsg({ ok: false, texto: r.error });
    setToken("");
    setMsg({ ok: true, texto: `Listo: conectaste la cuenta ${r.apodo || "de Mercado Pago"}. Desde ahora tus alumnos pagan con un botón y la cuota se confirma sola.` });
    recargar();
  }

  async function desconectar() {
    if (!window.confirm("¿Desconectar Mercado Pago? Tus alumnos ya no podrán pagar con el botón automático.")) return;
    setTrabajando(true);
    const r = await desconectarMp();
    setTrabajando(false);
    setMsg(r.error ? { ok: false, texto: r.error } : { ok: true, texto: "Mercado Pago desconectado." });
    recargar();
  }

  return (
    <section className="tarjeta flex flex-col gap-4" aria-label="Cobro automático con Mercado Pago">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="subtitulo">Cobro automático</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Mercado Pago · tarjeta, débito, dinero en cuenta y cuotas</p>
        </div>
        {estado.conectado && (
          <span className="rounded-full border border-green-700 px-2.5 py-0.5 font-mono text-xs font-bold text-green-700 dark:border-green-400 dark:text-green-400">Conectado</span>
        )}
      </div>

      {modoDemo ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">El cobro automático funciona con la base de datos real (Supabase). En el modo demo no está disponible.</p>
      ) : estado.conectado ? (
        <>
          <p className="text-sm">
            Cuenta conectada: <b>{estado.apodo || "Mercado Pago"}</b>. Tus alumnos ven el botón <b>Pagar con Mercado Pago</b>; cuando pagan, su cuota se confirma sola (30 días) y tú recibes un aviso.
          </p>
          <div><button type="button" className="text-sm font-bold text-red-600 underline" onClick={desconectar} disabled={trabajando}>Desconectar Mercado Pago</button></div>
        </>
      ) : (
        <form onSubmit={conectar} noValidate className="flex flex-col gap-3">
          <ol className="list-decimal pl-5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>Entra a <b>mercadopago.com.ar/developers</b> con tu cuenta y ve a <b>Tus integraciones</b>.</li>
            <li>Crea una aplicación (tipo <b>Pagos online</b>, <b>Checkout Pro</b>).</li>
            <li>Abre <b>Credenciales de producción</b> y copia el <b>Access Token</b> (empieza con <code>APP_USR-</code>).</li>
            <li>Pégalo aquí. No necesitas configurar nada más: los avisos de pago llegan solos.</li>
          </ol>
          <div>
            <label className="etiqueta" htmlFor="mp-token">Access Token de producción</label>
            <div className="relative">
              <input id="mp-token" className="campo pr-24 font-mono" type={verToken ? "text" : "password"} value={token} onChange={(e) => setToken(e.target.value)}
                autoComplete="off" spellCheck={false} placeholder="APP_USR-…" />
              <button type="button" onClick={() => setVerToken((v) => !v)} aria-pressed={verToken} className="absolute inset-y-0 right-0 px-3 text-sm font-bold text-orange-600">
                {verToken ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Se guarda cifrado en el servidor y nunca se muestra de nuevo. Es solo para crear cobros a tu nombre.</p>
          </div>
          <div><button className="btn-primary" disabled={trabajando}>{trabajando ? "Conectando…" : "Conectar Mercado Pago"}</button></div>
        </form>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>{msg.texto}</p>}
    </section>
  );
}
