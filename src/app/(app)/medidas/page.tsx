"use client";

import { useState } from "react";
import { MEDIDAS_KEY, VACIO_MEDIDAS } from "@/lib/datos";
import { useLocal, useToday } from "@/lib/store";
import type { Medida } from "@/lib/types";

function Grafico({ datos }: { datos: Medida[] }) {
  if (datos.length < 2)
    return (
      <p className="text-sm text-zinc-500">
        Añade al menos dos registros para ver tu evolución.
      </p>
    );
  const W = 560, H = 200, L = 40, R = 16, T = 14, B = 26;
  const pesos = datos.map((d) => d.peso_kg);
  const min = Math.floor(Math.min(...pesos) - 1);
  const max = Math.ceil(Math.max(...pesos) + 1);
  const x = (i: number) => L + (i * (W - L - R)) / (datos.length - 1);
  const y = (v: number) => T + ((max - v) * (H - T - B)) / (max - min);
  const pts = datos.map((d, i) => `${x(i)},${y(d.peso_kg)}`).join(" ");
  const ult = datos[datos.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Peso de ${datos[0].peso_kg} a ${ult.peso_kg} kilos`}>
      {[min, (min + max) / 2, max].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} className="stroke-zinc-200 dark:stroke-zinc-800" />
          <text x={L - 6} y={y(g) + 4} textAnchor="end" className="fill-zinc-500 text-[11px]">{g}</text>
        </g>
      ))}
      <polygon points={`${x(0)},${y(min)} ${pts} ${x(datos.length - 1)},${y(min)}`} className="fill-orange-600/15" />
      <polyline points={pts} fill="none" className="stroke-orange-600" strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={x(datos.length - 1)} cy={y(ult.peso_kg)} r={5} className="fill-orange-600" />
      <text x={x(0)} y={H - 6} className="fill-zinc-500 text-[11px]">{datos[0].fecha}</text>
      <text x={W - R} y={H - 6} textAnchor="end" className="fill-zinc-500 text-[11px]">{ult.fecha}</text>
    </svg>
  );
}

export default function Medidas() {
  const hoy = useToday();
  const [medidas, setMedidas] = useLocal(MEDIDAS_KEY, VACIO_MEDIDAS);
  const [error, setError] = useState<string | null>(null);
  const ordenadas = [...medidas].sort((a, b) => a.fecha.localeCompare(b.fecha));

  function anadir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    const f = new FormData(formulario);
    const num = (k: string) => {
      const v = String(f.get(k) ?? "").replace(",", ".").trim();
      return v === "" ? undefined : Number(v);
    };
    const peso = num("peso");
    if (peso === undefined || !(peso > 20 && peso < 400))
      return setError("Escribe un peso válido en kilos, por ejemplo 78,4.");
    const grasa = num("grasa");
    const cintura = num("cintura");
    if ((grasa !== undefined && !(grasa > 2 && grasa < 70)) || (cintura !== undefined && !(cintura > 30 && cintura < 250)))
      return setError("Revisa el % de grasa y la cintura.");
    setError(null);
    const fecha = String(f.get("fecha") || hoy);
    setMedidas((prev) => [
      ...prev.filter((m) => m.fecha !== fecha),
      { fecha, peso_kg: peso, grasa_pct: grasa, cintura_cm: cintura },
    ]);
    formulario.reset();
  }

  const primera = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-5xl font-black uppercase leading-none">Medidas</h1>
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <form onSubmit={anadir} noValidate className="tarjeta flex flex-col gap-4">
          <h2 className="text-2xl font-black uppercase">Nuevo registro</h2>
          <div>
            <label className="etiqueta" htmlFor="fecha">Fecha</label>
            <input className="campo" id="fecha" name="fecha" type="date" defaultValue={hoy} key={hoy} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="peso">Peso (kg)</label>
            <input className="campo" id="peso" name="peso" inputMode="decimal" placeholder="78,4" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="etiqueta" htmlFor="grasa">Grasa (%)</label>
              <input className="campo" id="grasa" name="grasa" inputMode="decimal" placeholder="18,2" />
            </div>
            <div>
              <label className="etiqueta" htmlFor="cintura">Cintura (cm)</label>
              <input className="campo" id="cintura" name="cintura" inputMode="decimal" placeholder="84" />
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div><button className="btn-primary">Guardar medida</button></div>
        </form>

        <section className="tarjeta flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-black uppercase">Evolución del peso</h2>
            {primera && ultima && primera !== ultima && (
              <span className="font-mono text-sm text-orange-600">
                {(ultima.peso_kg - primera.peso_kg > 0 ? "+" : "")}
                {(ultima.peso_kg - primera.peso_kg).toFixed(1).replace(".", ",")} kg
              </span>
            )}
          </div>
          <Grafico datos={ordenadas} />
          {ordenadas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-mono text-xs uppercase text-zinc-500">
                    <th className="p-2">Fecha</th><th className="p-2">Peso</th><th className="p-2">Grasa</th><th className="p-2">Cintura</th>
                  </tr>
                </thead>
                <tbody>
                  {[...ordenadas].reverse().map((m) => (
                    <tr key={m.fecha} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="p-2">{m.fecha}</td>
                      <td className="p-2">{m.peso_kg.toFixed(1).replace(".", ",")} kg</td>
                      <td className="p-2">{m.grasa_pct !== undefined ? `${m.grasa_pct} %` : "—"}</td>
                      <td className="p-2">{m.cintura_cm !== undefined ? `${m.cintura_cm} cm` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
