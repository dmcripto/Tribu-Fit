"use client";

import { useState } from "react";
import { useUsuario } from "@/components/AppShell";
import GraficoPeso from "@/components/GraficoPeso";
import { ChequeoMensual, MarcasEjercicio } from "@/components/ProgresoExtra";
import ResumenNoventaDias from "@/components/ResumenNoventaDias";
import { useEntrenos, useMedidas, usePerfil } from "@/lib/repo";
import { useToday } from "@/lib/store";

export default function Medidas() {
  const hoy = useToday();
  const usuario = useUsuario();
  const { medidas, anadir } = useMedidas(usuario?.id ?? "");
  const { entrenos } = useEntrenos(usuario?.id ?? "");
  const { perfil } = usePerfil(usuario ?? null);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const ordenadas = [...medidas].sort((a, b) => a.fecha.localeCompare(b.fecha));

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    const f = new FormData(formulario);
    const num = (k: string) => {
      const v = String(f.get(k) ?? "").replace(",", ".").trim();
      return v === "" ? undefined : Number(v);
    };
    setGuardado(false);
    const peso = num("peso");
    if (peso === undefined || !(peso > 20 && peso < 400))
      return setError("Escribe un peso válido en kilos, por ejemplo 78,4.");
    const grasa = num("grasa");
    const cintura = num("cintura");
    if ((grasa !== undefined && !(grasa > 2 && grasa < 70)) || (cintura !== undefined && !(cintura > 30 && cintura < 250)))
      return setError("Revisa el % de grasa y la cintura.");
    const fecha = String(f.get("fecha") || hoy);
    if (fecha > hoy) return setError("La fecha no puede ser futura.");
    const fallo = await anadir({ fecha, peso_kg: peso, grasa_pct: grasa, cintura_cm: cintura });
    if (fallo) return setError(fallo);
    setError(null);
    setGuardado(true);
    formulario.reset();
  }

  const primera = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];
  const coma = (n: number) => n.toFixed(1).replace(".", ",");

  return (
    <main className="flex flex-col gap-6">
      <h1 className="titulo">Progreso</h1>
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <form onSubmit={enviar} noValidate className="tarjeta flex flex-col gap-4">
          <h2 className="subtitulo">Nuevo registro</h2>
          <div>
            <label className="etiqueta" htmlFor="fecha">Fecha</label>
            <input className="campo" id="fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} key={hoy} />
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
          {guardado && <p role="status" className="text-sm text-green-700 dark:text-green-400">Medida guardada.</p>}
          <div><button className="btn-primary">Guardar medida</button></div>
        </form>

        <section className="tarjeta flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="subtitulo">Evolución del peso</h2>
            {primera && ultima && primera !== ultima && (
              <span className="font-mono text-sm text-orange-600">
                {ultima.peso_kg - primera.peso_kg > 0 ? "+" : ""}
                {coma(ultima.peso_kg - primera.peso_kg)} kg
              </span>
            )}
          </div>
          <GraficoPeso datos={ordenadas} />
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
                      <td className="p-2">{coma(m.peso_kg)} kg</td>
                      <td className="p-2">{m.grasa_pct !== undefined ? `${String(m.grasa_pct).replace(".", ",")} %` : "—"}</td>
                      <td className="p-2">{m.cintura_cm !== undefined ? `${String(m.cintura_cm).replace(".", ",")} cm` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <ResumenNoventaDias uid={usuario?.id ?? ""} entrenos={entrenos} medidas={medidas} diasSemana={perfil?.dias_semana} nombre={usuario?.nombre} />
      <ChequeoMensual uid={usuario?.id ?? ""} />
      <MarcasEjercicio uid={usuario?.id ?? ""} />
    </main>
  );
}
