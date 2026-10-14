"use client";

import { useState } from "react";
import GraficoPeso from "@/components/GraficoPeso";
import { useMarcas } from "@/lib/comunidad";
import { formatoFecha, sumarDias } from "@/lib/datos";
import { SEMANAS_TABLA, resumenNoventaDias } from "@/lib/resumen";
import { useToday } from "@/lib/store";
import type { Entreno, Medida } from "@/lib/types";

const coma = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const signo = (n: number) => `${n > 0 ? "+" : ""}${coma(n)}`;

/**
 * Resumen de 90 días en una tabla: el mejor peso de cada ejercicio en las semanas 1, 4, 8 y 12.
 * Los 90 días cuentan desde el primer peso registrado. La entrenadora ve el mismo resumen en la ficha del alumno.
 */
export default function ResumenNoventaDias({
  uid, entrenos, medidas, diasSemana, nombre, soloLectura = false,
}: { uid: string; entrenos: Entreno[]; medidas: Medida[]; diasSemana?: number; nombre?: string; soloLectura?: boolean }) {
  const hoy = useToday();
  const { marcas } = useMarcas(uid);
  const [ciclo, setCiclo] = useState<number | undefined>(undefined);
  const [elegido, setElegido] = useState<string | null>(null);
  const r = resumenNoventaDias({ marcas, entrenos, medidas, hoy, diasSemana, ciclo });

  if (!r) {
    return (
      <section className="tarjeta flex flex-col gap-2" aria-label="Resumen de 90 días">
        <h2 className="subtitulo">Resumen de 90 días</h2>
        <p className="text-sm text-zinc-500">
          {soloLectura
            ? "Todavía no hay pesos registrados para armar el resumen."
            : "Anota los kilos de cada serie en Rutinas y, a medida que entrenes, aquí se arma tu tabla de progreso de 3 meses."}
        </p>
      </section>
    );
  }

  const ejercicioSel = r.filas.find((f) => f.ejercicio === elegido) ?? r.filas.find((f) => f.porSemana.length >= 2) ?? r.filas[0];
  const serie = ejercicioSel.porSemana.map((p) => ({ fecha: sumarDias(r.desde, (p.semana - 1) * 7), peso_kg: p.kg }));

  return (
    <section className="tarjeta imprimible flex flex-col gap-4" aria-label="Resumen de 90 días">
      <div className="hidden print:block">
        <p className="text-2xl font-black">Tribu Fit · Resumen de 90 días{nombre ? ` · ${nombre}` : ""}</p>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="subtitulo">Resumen de 90 días</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {formatoFecha(r.desde)} → {formatoFecha(r.hasta)} ·{" "}
            {r.completo ? <b className="text-green-700 dark:text-green-400">¡Ciclo completo!</b> : <>día <b>{r.dia}</b> de 90</>}
          </p>
        </div>
        {r.ciclos > 1 && (
          <div className="print:hidden">
            <label className="etiqueta" htmlFor="res-ciclo">Ciclo</label>
            <select id="res-ciclo" className="campo !w-auto" value={r.ciclo} onChange={(e) => setCiclo(Number(e.target.value))}>
              {Array.from({ length: r.ciclos }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}{i + 1 === r.ciclos ? " (actual)" : ""}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[var(--borde)] p-3">
          <p className="text-2xl font-black tabular-nums">{r.entrenos.hechos}/{r.entrenos.planeados}</p>
          <p className="text-xs text-zinc-500">entrenos ({r.entrenos.pct} %)</p>
        </div>
        <div className="rounded-xl border border-[var(--borde)] p-3">
          <p className="text-2xl font-black tabular-nums">{r.peso ? `${signo(r.peso.final - r.peso.inicial)} kg` : "—"}</p>
          <p className="text-xs text-zinc-500">{r.peso ? `peso ${coma(r.peso.inicial)} → ${coma(r.peso.final)}` : "peso corporal"}</p>
        </div>
        <div className="rounded-xl border border-[var(--borde)] p-3">
          <p className="text-2xl font-black tabular-nums">{r.fuerzaPct === null ? "—" : `${r.fuerzaPct > 0 ? "+" : ""}${r.fuerzaPct} %`}</p>
          <p className="text-xs text-zinc-500">fuerza promedio</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Pesos por ejercicio en kilos">
          <caption className="mb-1 text-left text-xs text-zinc-500">Mejor peso de cada semana (kg)</caption>
          <thead>
            <tr className="border-b-2 border-[var(--borde)] text-right font-mono text-[11px] uppercase text-zinc-500">
              <th className="p-2 text-left">Ejercicio</th>
              {SEMANAS_TABLA.map((s) => <th key={s} className="p-2">Sem {s}</th>)}
              <th className="p-2">Cambio</th>
            </tr>
          </thead>
          <tbody>
            {r.filas.map((f) => (
              <tr key={f.ejercicio} className="border-b border-[var(--borde)] text-right tabular-nums">
                <td className="p-2 text-left font-bold">{f.ejercicio}</td>
                {SEMANAS_TABLA.map((s) => <td key={s} className="p-2">{f.semanas[s] === null ? "—" : coma(f.semanas[s]!)}</td>)}
                <td className={`p-2 font-bold ${f.cambio === null ? "text-zinc-400" : f.cambio > 0 ? "text-green-700 dark:text-green-400" : f.cambio < 0 ? "text-red-600" : ""}`}>
                  {f.cambio === null ? "—" : `${signo(f.cambio)} ${f.cambio > 0 ? "▲" : f.cambio < 0 ? "▼" : "="}`}
                  {f.pct !== null && <span className="block text-[11px] font-normal text-zinc-500">{f.pct > 0 ? "+" : ""}{f.pct} %</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="print:hidden">
        <label className="etiqueta" htmlFor="res-ej">Ver evolución de</label>
        <select id="res-ej" className="campo max-w-72" value={ejercicioSel.ejercicio} onChange={(e) => setElegido(e.target.value)}>
          {r.filas.map((f) => <option key={f.ejercicio}>{f.ejercicio}</option>)}
        </select>
        <div className="mt-3"><GraficoPeso datos={serie} etiqueta={ejercicioSel.ejercicio} unidad="kilos" /></div>
      </div>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button type="button" className="btn-primary" onClick={() => window.print()}>Descargar PDF</button>
        <p className="text-xs text-zinc-500">{soloLectura ? "Elige «Guardar como PDF» al imprimir." : "Elige «Guardar como PDF» al imprimir. Tu entrenador/a ve este resumen en tu ficha."}</p>
      </div>
    </section>
  );
}
