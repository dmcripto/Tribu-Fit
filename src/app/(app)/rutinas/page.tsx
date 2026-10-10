"use client";

import { useState } from "react";
import { ENTRENOS_KEY, RUTINAS, VACIO_ENTRENOS } from "@/lib/datos";
import { useLocal, useToday } from "@/lib/store";

export default function Rutinas() {
  const hoy = useToday();
  const [, guardarEntreno] = useLocal(ENTRENOS_KEY, VACIO_ENTRENOS);
  const [actual, setActual] = useState(0);
  const [hechos, setHechos] = useState<boolean[][]>(
    RUTINAS.map((r) => r.ejercicios.map(() => false)),
  );
  const [aviso, setAviso] = useState<string | null>(null);

  const rutina = RUTINAS[actual];
  const hechosActual = hechos[actual];
  const n = hechosActual.filter(Boolean).length;
  const total = rutina.ejercicios.length;

  function marcar(j: number, valor: boolean) {
    setHechos((h) =>
      h.map((fila, i) => (i === actual ? fila.map((v, k) => (k === j ? valor : v)) : fila)),
    );
  }

  function terminar() {
    if (n === 0) return setAviso("Marca al menos un ejercicio para guardar el entreno.");
    guardarEntreno((prev) => [
      ...prev,
      { fecha: hoy, rutina: rutina.nombre, hechos: n, total },
    ]);
    setHechos((h) => h.map((fila, i) => (i === actual ? fila.map(() => false) : fila)));
    setAviso(
      n === total
        ? "Entreno completo guardado. Sumas 60 puntos a tu tribu."
        : `Entreno guardado: ${n} de ${total} ejercicios.`,
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-5xl font-black uppercase leading-none">Rutinas</h1>
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-3">
          {RUTINAS.map((r, i) => (
            <button
              key={r.nombre}
              type="button"
              aria-pressed={i === actual}
              onClick={() => { setActual(i); setAviso(null); }}
              className={`flex items-center justify-between gap-3 rounded-lg border-2 p-4 text-left ${
                i === actual ? "border-orange-600" : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <span>
                <span className="block text-xl font-black uppercase">{r.nombre}</span>
                <span className="text-sm text-zinc-500">{r.detalle}</span>
              </span>
              <span className="font-mono text-xs">
                {hechos[i].filter(Boolean).length}/{r.ejercicios.length}
              </span>
            </button>
          ))}
        </div>
        <section className="tarjeta flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black uppercase">{rutina.nombre}</h2>
            <span className="font-mono text-sm text-orange-600">{n} de {total} hechos</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full bg-orange-600" style={{ width: `${(100 * n) / total}%` }} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-xs uppercase text-zinc-500">
                  <th className="p-2"><span className="sr-only">Hecho</span></th>
                  <th className="p-2">Ejercicio</th>
                  <th className="p-2">Series</th>
                  <th className="p-2">Carga</th>
                </tr>
              </thead>
              <tbody>
                {rutina.ejercicios.map((x, j) => (
                  <tr key={x.nombre} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        className="size-5 accent-orange-600"
                        aria-label={`Marcar ${x.nombre}`}
                        checked={hechosActual[j]}
                        onChange={(e) => marcar(j, e.target.checked)}
                      />
                    </td>
                    <td className="p-2">{x.nombre}</td>
                    <td className="p-2">{x.series}</td>
                    <td className="p-2">{x.carga}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <button type="button" className="btn-primary" onClick={terminar}>
              Terminar entreno
            </button>
          </div>
          {aviso && <p role="status" className="text-sm text-green-700 dark:text-green-400">{aviso}</p>}
        </section>
      </div>
    </main>
  );
}
