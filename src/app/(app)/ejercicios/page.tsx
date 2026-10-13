"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCliente } from "@/lib/store";
import { EJERCICIOS, MUSCULOS, enlaceVideo, filtrarEjercicios } from "@/lib/ejercicios";

export default function Ejercicios() {
  const [texto, setTexto] = useState("");
  const [musculo, setMusculo] = useState("");
  const hash = useCliente(() => window.location.hash.slice(1), "");
  const [elegido, setAbierto] = useState<string | null | undefined>(undefined);
  // Si llegas desde una rutina (#id), se abre ese ejercicio.
  const abierto = elegido === undefined ? (EJERCICIOS.some((e) => e.id === hash) ? hash : null) : elegido;
  const lista = filtrarEjercicios(texto, musculo);

  useEffect(() => {
    if (abierto && elegido === undefined) setTimeout(() => document.getElementById(abierto)?.scrollIntoView({ block: "start" }), 50);
  }, [abierto, elegido]);

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="titulo">Ejercicios</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{EJERCICIOS.length} ejercicios con la técnica paso a paso y los errores más comunes.</p>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <label className="etiqueta" htmlFor="buscar">Buscar</label>
          <input id="buscar" className="campo" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Sentadilla, pecho, mancuernas…" />
        </div>
        <div role="group" aria-label="Filtrar por músculo" className="flex gap-2 overflow-x-auto pb-1">
          {["", ...MUSCULOS].map((m) => (
            <button key={m || "todos"} type="button" aria-pressed={musculo === m} onClick={() => setMusculo(m)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold ${musculo === m ? "border-orange-600 bg-orange-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>
              {m || "Todos"}
            </button>
          ))}
        </div>
      </div>
      {lista.length === 0 ? (
        <p className="tarjeta text-sm text-zinc-500">No encontramos ejercicios con eso. Prueba con otra palabra.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((e) => {
            const on = abierto === e.id;
            return (
              <li key={e.id} className="tarjeta flex flex-col gap-3" id={e.id}>
                <button type="button" aria-expanded={on} onClick={() => setAbierto(on ? null : e.id)} className="flex w-full items-start justify-between gap-3 text-left">
                  <span>
                    <span className="block text-lg font-black">{e.nombre}</span>
                    <span className="text-xs text-zinc-500">{e.musculo} · {e.equipo} · {e.nivel}</span>
                  </span>
                  <span aria-hidden="true" className="text-zinc-500">{on ? "−" : "+"}</span>
                </button>
                {on && (
                  <div className="flex flex-col gap-3 text-sm">
                    <div>
                      <h3 className="font-bold">Cómo se hace</h3>
                      <ol className="mt-1 list-decimal pl-5 text-zinc-700 dark:text-zinc-300">{e.pasos.map((p) => <li key={p}>{p}</li>)}</ol>
                    </div>
                    <div>
                      <h3 className="font-bold">Errores comunes</h3>
                      <ul className="mt-1 list-disc pl-5 text-zinc-700 dark:text-zinc-300">{e.errores.map((p) => <li key={p}>{p}</li>)}</ul>
                    </div>
                    {e.alternativa && <p><b>Más fácil o en casa:</b> {e.alternativa}</p>}
                    <div className="flex flex-wrap gap-3">
                      <a href={enlaceVideo(e.nombre)} target="_blank" rel="noopener noreferrer" className="btn-ghost">Ver videos</a>
                      <Link href={`/chat?tema=${encodeURIComponent(e.nombre)}`} className="btn-ghost">Preguntar a mi entrenador/a</Link>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
