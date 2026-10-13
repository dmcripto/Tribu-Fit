"use client";

import Link from "next/link";
import { useUsuario } from "@/components/AppShell";
import { useAvisos, useRecordatoriosLeidos } from "@/lib/comunidad";
import { useRecordatorios } from "@/lib/recordatorios";

const ICONO: Record<string, string> = { mensaje: "💬", plan: "📋", nutricion: "🥗", pago: "💳", reto: "🏆", otro: "🔔" };

export default function Avisos() {
  const yo = useUsuario();
  const { avisos, noLeidos, marcarLeido, marcarTodos } = useAvisos(yo);
  const recordatorios = useRecordatorios(yo);
  const { leidos, marcar } = useRecordatoriosLeidos();
  const pendientes = recordatorios.filter((r) => !leidos.includes(r.id));

  return (
    <main className="flex flex-col gap-5">
      <h1 className="titulo">Avisos</h1>

      <section className="flex flex-col gap-3" aria-label="Para hoy">
        <h2 className="subtitulo">Para hoy</h2>
        {recordatorios.length === 0 ? (
          <p className="tarjeta text-sm text-zinc-500">Todo al día. ¡Buen trabajo!</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recordatorios.map((r) => (
              <li key={r.id} className={`tarjeta flex items-start justify-between gap-3 ${r.urgente ? "border-red-600" : ""} ${leidos.includes(r.id) ? "opacity-60" : ""}`}>
                <div>
                  <p className="font-bold">{r.titulo}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{r.texto}</p>
                  <Link href={r.enlace} onClick={() => marcar(r.id)} className="text-sm font-bold text-orange-600">Abrir</Link>
                </div>
                {!leidos.includes(r.id) && <button type="button" className="shrink-0 text-xs text-zinc-500 underline" onClick={() => marcar(r.id)}>Ocultar</button>}
              </li>
            ))}
          </ul>
        )}
        {pendientes.length > 0 && <p className="text-xs text-zinc-500">{pendientes.length} recordatorio{pendientes.length === 1 ? "" : "s"} sin atender.</p>}
      </section>

      <section className="flex flex-col gap-3" aria-label="Notificaciones">
        <div className="flex items-center justify-between gap-3">
          <h2 className="subtitulo">Notificaciones</h2>
          {noLeidos > 0 && <button type="button" className="text-sm font-bold text-orange-600" onClick={() => marcarTodos()}>Marcar todo como leído</button>}
        </div>
        {avisos.length === 0 ? (
          <p className="tarjeta text-sm text-zinc-500">Aquí verás mensajes de tu entrenador/a, planes nuevos y pagos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {avisos.map((a) => (
              <li key={a.id} className={`tarjeta flex items-start gap-3 ${a.leido ? "opacity-60" : "border-orange-600"}`}>
                <span aria-hidden="true" className="text-xl">{ICONO[a.tipo] ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{a.titulo}</p>
                  {a.texto && <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{a.texto}</p>}
                  <p className="text-xs text-zinc-500">{new Date(a.creado).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}</p>
                </div>
                {a.enlace && <Link href={a.enlace} onClick={() => marcarLeido(a.id)} className="shrink-0 text-sm font-bold text-orange-600">Abrir</Link>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
