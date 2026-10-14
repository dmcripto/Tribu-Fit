"use client";

import { useState } from "react";
import type { NuevaSerie } from "@/lib/comunidad";
import { formatoFecha } from "@/lib/datos";
import { seriesDe, ultimaVez } from "@/lib/resumen";
import type { Marca } from "@/lib/types";

const coma = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const numero = (t: string) => Number(t.replace(",", ".").trim());
const dias = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

function cuando(fecha: string, hoy: string) {
  const d = dias(hoy, fecha);
  return d >= 5 && d <= 9 ? "la semana pasada" : d === 1 ? "ayer" : formatoFecha(fecha);
}

/** Kilos y repeticiones de cada serie de un ejercicio en el entreno de hoy. Se guarda solo al salir de cada casilla. */
export default function RegistroPesos({
  nombre, series, carga, marcas, hoy, guardarSerie, borrarSerie,
}: {
  nombre: string;
  /** Texto de series de la rutina, por ejemplo «4 × 6». */
  series: string;
  /** Carga sugerida por la rutina, por ejemplo «80 kg». */
  carga: string;
  marcas: Marca[];
  hoy: string;
  guardarSerie: (s: NuevaSerie) => Promise<string | null>;
  borrarSerie: (fecha: string, ejercicio: string, serie: number) => Promise<void>;
}) {
  const n = seriesDe(series);
  const previa = ultimaVez(marcas, nombre, hoy);
  const sugerido = /(\d+(?:[.,]\d+)?)\s*kg/i.exec(carga)?.[1];
  const guardadas = (i: number) => marcas.find((m) => m.fecha === hoy && m.ejercicio === nombre && m.serie === i);
  // Lo que la persona está escribiendo; si no tocó una casilla se muestra lo ya guardado.
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const clave = (i: number, campo: "kg" | "reps") => `${i}|${campo}`;
  const valor = (i: number, campo: "kg" | "reps") => {
    const e = edit[clave(i, campo)];
    if (e !== undefined) return e;
    const g = guardadas(i);
    return g ? String(campo === "kg" ? g.peso_kg : g.reps).replace(".", ",") : "";
  };

  async function alSalir(i: number) {
    const kgT = valor(i, "kg").trim(), repsT = valor(i, "reps").trim();
    const g = guardadas(i);
    if (kgT === "" && repsT === "") {
      if (g) { await borrarSerie(hoy, nombre, i); setMsg(null); }
      setEdit((e) => { const c = { ...e }; delete c[clave(i, "kg")]; delete c[clave(i, "reps")]; return c; });
      return;
    }
    if (kgT === "" || repsT === "") return; // falta la otra casilla: todavía no se guarda
    const kg = numero(kgT), reps = numero(repsT);
    if (!(kg >= 0 && kg <= 1000)) return setMsg({ ok: false, texto: `Serie ${i}: revisa los kilos (entre 0 y 1000).` });
    if (!(Number.isInteger(reps) && reps >= 1 && reps <= 1000)) return setMsg({ ok: false, texto: `Serie ${i}: las repeticiones deben ser un número entero (1 o más).` });
    if (g && g.peso_kg === kg && g.reps === reps) return;
    const fallo = await guardarSerie({ fecha: hoy, ejercicio: nombre, serie: i, peso_kg: kg, reps });
    setMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: `Serie ${i} guardada.` });
  }

  const hechas = Array.from({ length: n }, (_, k) => guardadas(k + 1)).filter((m): m is Marca => !!m);
  const mejorHoy = hechas.length ? Math.max(...hechas.map((m) => m.peso_kg)) : null;
  const dif = mejorHoy !== null && previa ? Math.round((mejorHoy - previa.peso_kg) * 10) / 10 : null;

  return (
    <div className="flex flex-col gap-2" aria-label={`Pesos de ${nombre}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          {previa ? <>Última vez ({cuando(previa.fecha, hoy)}): <b>{coma(previa.peso_kg)} kg × {previa.reps}</b></> : "Primera vez: anota tus kilos para compararlos la próxima semana."}
        </p>
        {dif !== null && (
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold ${dif > 0 ? "border-green-700 text-green-700 dark:border-green-400 dark:text-green-400" : dif < 0 ? "border-red-600 text-red-600" : "border-zinc-400 text-zinc-500"}`}>
            {dif > 0 ? `▲ +${coma(dif)} kg` : dif < 0 ? `▼ ${coma(dif)} kg` : "= igual"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-[3.2rem_1fr_1fr_1.5rem] items-center gap-2 text-sm">
        {Array.from({ length: n }, (_, k) => {
          const i = k + 1, ok = !!guardadas(i);
          return (
            <div key={i} className="contents">
              <span className="text-xs font-bold text-zinc-500">Serie {i}</span>
              <div className="relative">
                <input className="campo !px-2 !py-2 text-center font-bold" inputMode="decimal" aria-label={`${nombre}, serie ${i}, kilos`} placeholder={sugerido ?? "kg"}
                  value={valor(i, "kg")} onChange={(e) => setEdit((s) => ({ ...s, [clave(i, "kg")]: e.target.value }))} onBlur={() => alSalir(i)} />
                {valor(i, "kg") && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">kg</span>}
              </div>
              <div className="relative">
                <input className="campo !px-2 !py-2 text-center font-bold" inputMode="numeric" aria-label={`${nombre}, serie ${i}, repeticiones`} placeholder="reps"
                  value={valor(i, "reps")} onChange={(e) => setEdit((s) => ({ ...s, [clave(i, "reps")]: e.target.value }))} onBlur={() => alSalir(i)} />
              </div>
              <span aria-label={ok ? "guardada" : "sin guardar"} className={`flex size-6 items-center justify-center rounded-full text-xs font-black text-white ${ok ? "bg-green-600" : "bg-zinc-300 dark:bg-zinc-700"}`}>✓</span>
            </div>
          );
        })}
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-xs ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>{msg.texto}</p>}
    </div>
  );
}
