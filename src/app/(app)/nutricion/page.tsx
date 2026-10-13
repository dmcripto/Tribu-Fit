"use client";

import { useState } from "react";
import { useUsuario } from "@/components/AppShell";
import CampoTexto from "@/components/CampoTexto";
import Desplegable from "@/components/Desplegable";
import { estimarObjetivo, formatoFecha, sumarDias, totalesDia } from "@/lib/datos";
import PremiumAviso from "@/components/PremiumAviso";
import { useAgua, useComidas, useMedidas, useObjetivoNutricion, usePremium } from "@/lib/repo";
import { useToday } from "@/lib/store";

function Barra({ etiqueta, valor, meta, unidad }: { etiqueta: string; valor: number; meta: number; unidad: string }) {
  const pct = meta > 0 ? Math.min(100, (100 * valor) / meta) : 0;
  const pasado = meta > 0 && valor > meta;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-3 text-sm">
        <span>{etiqueta}</span>
        <span className="font-mono tabular-nums">
          {Math.round(valor)} / {meta} {unidad}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className={`h-full ${pasado ? "bg-amber-500" : "bg-orange-600"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Nutricion() {
  const hoy = useToday();
  const usuario = useUsuario();
  const uid = usuario?.id ?? "";
  const { comidas, anadir, borrar } = useComidas(uid);
  const { vasos, fijar } = useAgua(uid, hoy);
  const { medidas } = useMedidas(uid);
  const premium = usePremium(usuario);
  const objetivoCoach = useObjetivoNutricion(uid);
  const asignado = premium.activo ? objetivoCoach : null;
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const ultimoPeso = [...medidas].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1)?.peso_kg;
  const objetivo = asignado ?? estimarObjetivo(ultimoPeso, usuario?.objetivo ?? "");
  const hoyTot = totalesDia(comidas, hoy);
  const delDia = comidas.filter((c) => c.fecha === hoy);
  const ultimosDias = Array.from({ length: 7 }, (_, i) => (hoy ? sumarDias(hoy, -i) : ""));

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => {
      const v = String(f.get(k) ?? "").replace(",", ".").trim();
      return v === "" ? 0 : Number(v);
    };
    const nombre = String(f.get("nombre") ?? "").trim();
    const kcal = num("kcal");
    const [p, c, g] = [num("proteina"), num("carbos"), num("grasas")];
    if (!nombre) return setError("Escribe qué comiste.");
    if (!(kcal > 0 && kcal <= 4000)) return setError("Escribe las calorías, entre 1 y 4000.");
    if ([p, c, g].some((x) => Number.isNaN(x) || x < 0 || x > 500)) return setError("Revisa los gramos de proteína, carbohidratos y grasas.");
    const fallo = await anadir({ fecha: hoy, nombre, kcal: Math.round(kcal), proteina: p, carbos: c, grasas: g });
    if (fallo) return setError(fallo);
    setError(null);
    setFormKey((k) => k + 1);
  }

  return (
    <main className="flex flex-col gap-5">
      <PremiumAviso estado={premium} />
      <div>
        <h1 className="titulo">Nutrición</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {asignado ? (
            <>Objetivo <span className="font-bold text-orange-600">personalizado por tu entrenador/a</span>.</>
          ) : (
            "Objetivo orientativo según tu peso y tu meta. Tu entrenador/a puede personalizarlo. No sustituye el consejo de un profesional de la salud."
          )}
        </p>
      </div>

      <section className="tarjeta flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="subtitulo">Hoy</h2>
          <span className="font-mono text-sm text-zinc-500">
            {objetivo.kcal - hoyTot.kcal >= 0
              ? `Te quedan ${objetivo.kcal - hoyTot.kcal} kcal`
              : `Te pasas ${hoyTot.kcal - objetivo.kcal} kcal`}
          </span>
        </div>
        <Barra etiqueta="Calorías" valor={hoyTot.kcal} meta={objetivo.kcal} unidad="kcal" />
        <Barra etiqueta="Proteína" valor={hoyTot.proteina} meta={objetivo.proteina} unidad="g" />
        <Barra etiqueta="Carbohidratos" valor={hoyTot.carbos} meta={objetivo.carbos} unidad="g" />
        <Barra etiqueta="Grasas" valor={hoyTot.grasas} meta={objetivo.grasas} unidad="g" />
      </section>

      <Desplegable titulo="Añadir comida" abierto={delDia.length === 0}>
        <form key={formKey} onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <div>
            <label className="etiqueta" htmlFor="c-nombre">Qué comiste</label>
            <CampoTexto id="c-nombre" name="nombre" placeholder="Avena con plátano" autoComplete="off" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="c-kcal">Calorías (kcal)</label>
            <CampoTexto id="c-kcal" name="kcal" inputMode="decimal" placeholder="350" autoComplete="off" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="etiqueta" htmlFor="c-p">Prot. (g)</label>
              <input className="campo" id="c-p" name="proteina" inputMode="decimal" placeholder="12" />
            </div>
            <div>
              <label className="etiqueta" htmlFor="c-c">Carb. (g)</label>
              <input className="campo" id="c-c" name="carbos" inputMode="decimal" placeholder="60" />
            </div>
            <div>
              <label className="etiqueta" htmlFor="c-g">Grasas (g)</label>
              <input className="campo" id="c-g" name="grasas" inputMode="decimal" placeholder="8" />
            </div>
          </div>
          <p className="text-xs text-zinc-500">Los gramos son opcionales. Con las calorías basta.</p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div><button className="btn-primary">Guardar comida</button></div>
        </form>
      </Desplegable>

      <section className="tarjeta flex flex-col gap-2">
        <h2 className="subtitulo">Comidas de hoy</h2>
        {delDia.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no has registrado nada hoy.</p>
        ) : (
          <ul className="flex flex-col text-sm">
            {delDia.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 border-t border-zinc-200 py-2 dark:border-zinc-800">
                <span className="min-w-0">
                  <span className="block truncate font-bold">{c.nombre}</span>
                  <span className="font-mono text-xs text-zinc-500">P {c.proteina} · C {c.carbos} · G {c.grasas}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-mono tabular-nums">{c.kcal} kcal</span>
                  <button type="button" aria-label={`Quitar ${c.nombre}`} onClick={() => borrar(c.id)} className="p-1 text-zinc-500 hover:text-red-600">
                    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></svg>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarjeta flex flex-col gap-3">
        <h2 className="subtitulo">Agua</h2>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: Math.max(objetivo.agua, vasos) }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Vaso ${n}`}
              aria-pressed={n <= vasos}
              onClick={() => fijar(vasos === n ? n - 1 : n)}
              className={`h-10 w-8 rounded-b-xl rounded-t border-2 border-orange-600 ${n <= vasos ? "bg-orange-600" : ""}`}
            />
          ))}
        </div>
        <p className="font-mono text-sm text-zinc-500">
          {vasos} de {objetivo.agua} vasos ({(vasos * 0.25).toFixed(2).replace(".", ",")} L)
        </p>
      </section>

      {asignado?.notas && (
        <Desplegable titulo="Notas de tu entrenador/a" abierto>
          <p className="whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">{asignado.notas}</p>
        </Desplegable>
      )}

      <Desplegable titulo="Últimos 7 días">
        <ul className="flex flex-col gap-1 text-sm">
          {ultimosDias.map((d) => {
            const t = totalesDia(comidas, d).kcal;
            return (
              <li key={d || "x"} className="grid grid-cols-[3.5rem_1fr_5rem] items-center gap-3">
                <span className="font-mono text-xs text-zinc-500">{d ? formatoFecha(d).slice(0, 5) : ""}</span>
                <span className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <span className="block h-full bg-orange-600" style={{ width: `${Math.min(100, (100 * t) / objetivo.kcal)}%` }} />
                </span>
                <span className="text-right font-mono text-xs tabular-nums">{t ? `${t} kcal` : "—"}</span>
              </li>
            );
          })}
        </ul>
      </Desplegable>
    </main>
  );
}
