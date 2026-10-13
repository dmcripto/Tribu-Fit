"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/lib/comunidad";
import type { Usuario } from "@/lib/types";

const hora = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`;
};

/** Conversación entre un alumno y su entrenador/a. */
export default function Conversacion({
  yo, alumnoId, contextoInicial = "", titulo,
}: { yo: Usuario; alumnoId: string; contextoInicial?: string; titulo: string }) {
  const { mensajes, enviar, marcarLeidos } = useChat(yo, alumnoId);
  const esCoach = yo.rol === "entrenador";
  const [texto, setTexto] = useState("");
  const [contexto, setContexto] = useState(contextoInicial);
  const [error, setError] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);
  const sinLeer = mensajes.filter((m) => !m.leido && m.de_entrenador !== esCoach).length;

  useEffect(() => { if (sinLeer > 0) marcarLeidos(); }, [sinLeer, marcarLeidos]);
  useEffect(() => { fin.current?.scrollIntoView({ block: "end" }); }, [mensajes.length]);

  async function mandar(e: React.FormEvent) {
    e.preventDefault();
    const fallo = await enviar(texto, contexto.trim() || undefined);
    if (fallo) return setError(fallo);
    setError(null);
    setTexto("");
    setContexto("");
  }

  return (
    <section className="tarjeta flex flex-col gap-3" aria-label={`Conversación con ${titulo}`}>
      <h2 className="subtitulo">{titulo}</h2>
      <ul className="flex max-h-[55vh] min-h-40 flex-col gap-2 overflow-y-auto py-1" aria-live="polite">
        {mensajes.length === 0 && <li className="text-sm text-zinc-500">Aún no hay mensajes. ¡Escribe el primero!</li>}
        {mensajes.map((m) => {
          const mio = m.de_entrenador === esCoach;
          return (
            <li key={m.id} className={`flex flex-col ${mio ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${mio ? "bg-orange-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                {m.contexto && <span className="mb-1 block text-[11px] font-bold uppercase opacity-80">Sobre: {m.contexto}</span>}
                {m.texto}
              </div>
              <span className="mt-0.5 text-[11px] text-zinc-500">{hora(m.creado)}{mio && m.leido ? " · visto" : ""}</span>
            </li>
          );
        })}
        <div ref={fin} />
      </ul>
      <form onSubmit={mandar} className="flex flex-col gap-2">
        {contexto && (
          <p className="flex items-center justify-between gap-2 rounded-md border border-orange-600/50 px-2 py-1 text-xs">
            <span>Sobre: <b>{contexto}</b></span>
            <button type="button" className="px-1 text-zinc-500" aria-label="Quitar el tema" onClick={() => setContexto("")}>✕</button>
          </p>
        )}
        <div className="flex gap-2">
          <label htmlFor="msg" className="sr-only">Mensaje</label>
          <textarea id="msg" className="campo min-h-11 flex-1 resize-none" rows={1} maxLength={2000} value={texto}
            onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje…"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
          <button className="btn-primary self-end" disabled={!texto.trim()}>Enviar</button>
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </form>
    </section>
  );
}
