"use client";

import { useState } from "react";
import { useUsuario } from "@/components/AppShell";
import {
  RUTINAS, formatoFecha, planTerminado, semanaActual, sumarDias, type Rutina,
} from "@/lib/datos";
import PremiumAviso from "@/components/PremiumAviso";
import { useEntrenos, usePlanesAlumno, usePremium } from "@/lib/repo";
import { useToday } from "@/lib/store";

export default function Rutinas() {
  const hoy = useToday();
  const usuario = useUsuario();
  const uid = usuario?.id ?? "";
  const { anadir } = useEntrenos(uid);
  const planes = usePlanesAlumno(uid);
  const premium = usePremium(usuario);

  // Plan activo: el más reciente que ya empezó y no ha terminado.
  const activo = !premium.activo ? undefined : [...planes]
    .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))
    .find((p) => semanaActual(p, hoy) > 0 && !planTerminado(p, hoy));
  const semana = activo ? semanaActual(activo, hoy) : 0;
  const lista: Rutina[] = activo
    ? (activo.semanas.find((s) => s.semana === semana)?.rutinas ?? RUTINAS)
    : RUTINAS;
  const proxima = activo?.semanas.find((s) => s.semana === semana + 1);

  const [elegida, setElegida] = useState(0);
  const [hechos, setHechos] = useState<Record<string, boolean[]>>({});
  const [aviso, setAviso] = useState<string | null>(null);

  const idx = Math.min(elegida, lista.length - 1);
  const rutina = lista[idx];
  const fila = (r: Rutina) => hechos[r.nombre] ?? r.ejercicios.map(() => false);
  const marcadas = fila(rutina);
  const n = marcadas.filter(Boolean).length;
  const total = rutina.ejercicios.length;

  function marcar(j: number, valor: boolean) {
    setHechos((h) => ({ ...h, [rutina.nombre]: marcadas.map((v, k) => (k === j ? valor : v)) }));
  }

  async function terminar() {
    if (n === 0) return setAviso("Marca al menos un ejercicio para guardar el entreno.");
    const fallo = await anadir({ fecha: hoy, rutina: rutina.nombre, hechos: n, total });
    if (fallo) return setAviso(fallo);
    setHechos((h) => ({ ...h, [rutina.nombre]: marcadas.map(() => false) }));
    setAviso(
      n === total
        ? "Entreno completo guardado. Sumas 60 puntos a tu tribu."
        : `Entreno guardado: ${n} de ${total} ejercicios.`,
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <PremiumAviso estado={premium} />
      <div>
        <h1 className="text-5xl font-black uppercase leading-none">Rutinas</h1>
        {activo ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-bold text-orange-600">{activo.nombre}</span> · semana {semana} de {activo.semanas.length}
            {proxima && ` · la semana ${proxima.semana} se libera el ${formatoFecha(sumarDias(activo.fecha_inicio, semana * 7))}`}
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            {!premium.activo
              ? "Rutinas generales."
              : planes.length > 0
              ? "Tu plan empieza pronto. Mientras tanto tienes estas rutinas generales."
              : "Rutinas generales. Cuando tu entrenador/a te asigne un plan, aparecerá aquí."}
          </p>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-3">
          {lista.map((r, i) => (
            <button
              key={r.nombre}
              type="button"
              aria-pressed={i === idx}
              onClick={() => { setElegida(i); setAviso(null); }}
              className={`flex items-center justify-between gap-3 rounded-lg border-2 p-4 text-left ${
                i === idx ? "border-orange-600" : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <span>
                <span className="block text-xl font-black uppercase">{r.nombre}</span>
                {r.detalle && <span className="text-sm text-zinc-500">{r.detalle}</span>}
              </span>
              <span className="font-mono text-xs">
                {fila(r).filter(Boolean).length}/{r.ejercicios.length}
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
                        checked={marcadas[j] ?? false}
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
