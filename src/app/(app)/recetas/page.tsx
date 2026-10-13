"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useUsuario } from "@/components/AppShell";
import { estimarObjetivo, totalesDia } from "@/lib/datos";
import { RECETAS, escalar, momentoActual, restriccionesA, sugerirRecetas, type Etiqueta, type Momento, type Receta, type Sugerencia } from "@/lib/recetas";
import { useComidas, useMedidas, useObjetivoNutricion, usePerfil, usePremium } from "@/lib/repo";
import { useCliente, useToday } from "@/lib/store";

const MOMENTOS: { id: Momento; texto: string }[] = [
  { id: "desayuno", texto: "Desayuno" }, { id: "almuerzo", texto: "Almuerzo" }, { id: "cena", texto: "Cena" }, { id: "snack", texto: "Snack" },
];
const RESTRICCIONES: { id: Etiqueta; texto: string }[] = [
  { id: "vegetariana", texto: "Vegetariana" }, { id: "vegana", texto: "Vegana" }, { id: "sin_lactosa", texto: "Sin lactosa" },
  { id: "sin_gluten", texto: "Sin gluten" }, { id: "sin_frutos_secos", texto: "Sin frutos secos" }, { id: "sin_huevo", texto: "Sin huevo" }, { id: "sin_pescado", texto: "Sin pescado" },
];

function Tarjeta({ s, onCambia, onAnadir, hecho }: { s: Sugerencia; onCambia: (p: number) => void; onAnadir: () => void; hecho: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const r = s.receta;
  return (
    <li className="tarjeta flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">{r.nombre}</h3>
          <p className="text-xs text-zinc-500">{r.minutos} min · {r.etiquetas.includes("vegana") ? "Vegana" : r.etiquetas.includes("vegetariana") ? "Vegetariana" : "Con carne o pescado"}</p>
        </div>
        <label className="text-xs text-zinc-500">
          Porción
          <select className="campo ml-1 inline-block !w-auto !py-1" value={s.porcion} onChange={(e) => onCambia(Number(e.target.value))} aria-label={`Porción de ${r.nombre}`}>
            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((p) => <option key={p} value={p}>{String(p).replace(".", ",")}×</option>)}
          </select>
        </label>
      </div>
      <p className="font-mono text-sm"><b>{s.kcal} kcal</b> · P {s.proteina} g · C {s.carbos} g · G {s.grasas} g</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={onAnadir} disabled={hecho}>{hecho ? "Añadida a hoy ✓" : "Añadir a mis comidas"}</button>
        <button type="button" className="btn-ghost" aria-expanded={abierta} onClick={() => setAbierta(!abierta)}>{abierta ? "Ocultar receta" : "Ver receta"}</button>
      </div>
      {abierta && (
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <h4 className="font-bold">Ingredientes (porción base)</h4>
            <ul className="mt-1 list-disc pl-5">{r.ingredientes.map((i) => <li key={i}>{i}</li>)}</ul>
            {s.porcion !== 1 && <p className="mt-1 text-xs text-zinc-500">Multiplica las cantidades por {String(s.porcion).replace(".", ",")}.</p>}
          </div>
          <div>
            <h4 className="font-bold">Preparación</h4>
            <ol className="mt-1 list-decimal pl-5">{r.pasos.map((p) => <li key={p}>{p}</li>)}</ol>
          </div>
        </div>
      )}
    </li>
  );
}

export default function Recetas() {
  const yo = useUsuario();
  const uid = yo?.id ?? "";
  const hoy = useToday();
  const { comidas, anadir } = useComidas(uid);
  const { medidas } = useMedidas(uid);
  const premium = usePremium(yo);
  const asignado = useObjetivoNutricion(uid);
  const { perfil } = usePerfil(yo);
  const hora = useCliente(() => new Date().getHours(), 12);
  const [elegido, setMomento] = useState<Momento | null>(null);
  const momento = elegido ?? momentoActual(hora);
  const [manual, setManual] = useState<Etiqueta[] | null>(null);
  const [porciones, setPorciones] = useState<Record<string, number>>({});
  const [anadidas, setAnadidas] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const delPerfil = useMemo(() => restriccionesA(perfil?.restricciones ?? ""), [perfil]);
  const restricciones = manual ?? delPerfil;
  const ultimoPeso = [...medidas].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1)?.peso_kg;
  const objetivo = (premium.activo ? asignado : null) ?? estimarObjetivo(ultimoPeso, yo?.objetivo ?? "");
  const consumido = totalesDia(comidas, hoy);

  const sugeridas = useMemo(
    () => sugerirRecetas({ momento, objetivo, consumido, restricciones, limite: 4 }),
    [momento, objetivo, consumido, restricciones],
  );
  const otras = RECETAS.filter((r) => r.momento.includes(momento) && restricciones.every((e) => r.etiquetas.includes(e)) && !sugeridas.some((s) => s.receta.id === r.id));

  function alternar(id: Etiqueta) {
    const base = restricciones;
    setManual(base.includes(id) ? base.filter((x) => x !== id) : [...base, id]);
  }
  async function agregar(s: Sugerencia) {
    const fallo = await anadir({ fecha: hoy, nombre: s.receta.nombre, kcal: s.kcal, proteina: s.proteina, carbos: s.carbos, grasas: s.grasas });
    if (fallo) return setMsg(fallo);
    setAnadidas((a) => [...a, s.receta.id]);
    setMsg(`«${s.receta.nombre}» se añadió a tus comidas de hoy.`);
  }
  const conPorcion = (r: Receta, base?: Sugerencia) => (porciones[r.id] ? escalar(r, porciones[r.id]) : base ?? escalar(r, 1));

  const resumen = (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      Hoy llevas <b>{Math.round(consumido.kcal)}</b> de <b>{objetivo.kcal} kcal</b> y <b>{Math.round(consumido.proteina)}</b> de <b>{objetivo.proteina} g</b> de proteína.
    </p>
  );

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="titulo">Recetas</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Sugerencias que encajan con lo que te queda del día. Ajustamos la porción para acercarte a tu objetivo.
        </p>
      </div>
      {resumen}
      <div role="group" aria-label="Momento del día" className="flex gap-2 overflow-x-auto pb-1">
        {MOMENTOS.map((m) => (
          <button key={m.id} type="button" aria-pressed={momento === m.id} onClick={() => { setMomento(m.id); setMsg(null); }}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${momento === m.id ? "border-orange-600 bg-orange-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>
            {m.texto}
          </button>
        ))}
      </div>
      <details className="tarjeta" open={restricciones.length > 0}>
        <summary className="cursor-pointer text-sm font-bold">Mis restricciones {restricciones.length > 0 && `(${restricciones.length})`}</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {RESTRICCIONES.map((r) => (
            <button key={r.id} type="button" aria-pressed={restricciones.includes(r.id)} onClick={() => alternar(r.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${restricciones.includes(r.id) ? "border-orange-600 bg-orange-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>
              {r.texto}
            </button>
          ))}
        </div>
        {perfil?.restricciones && manual === null && <p className="mt-2 text-xs text-zinc-500">Tomadas de tu perfil: «{perfil.restricciones}».</p>}
        {!perfil?.restricciones && <p className="mt-2 text-xs text-zinc-500">Puedes guardarlas en tu <Link href="/panel" className="underline">perfil de entrenamiento</Link>.</p>}
      </details>
      {msg && <p role="status" className="text-sm text-green-700 dark:text-green-400">{msg}</p>}

      <section className="flex flex-col gap-3" aria-label="Sugeridas para ti">
        <h2 className="subtitulo">Sugeridas para ti</h2>
        {sugeridas.length === 0 ? (
          <p className="tarjeta text-sm text-zinc-500">No tenemos recetas para ese momento con tus restricciones. Quita alguna para ver más opciones.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sugeridas.map((s) => {
              const act = conPorcion(s.receta, s);
              return <Tarjeta key={s.receta.id} s={act} hecho={anadidas.includes(s.receta.id)}
                onCambia={(p) => setPorciones((x) => ({ ...x, [s.receta.id]: p }))} onAnadir={() => agregar(act)} />;
            })}
          </ul>
        )}
      </section>

      {otras.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Más opciones">
          <h2 className="subtitulo">Más opciones</h2>
          <ul className="flex flex-col gap-3">
            {otras.map((r) => {
              const act = conPorcion(r);
              return <Tarjeta key={r.id} s={act} hecho={anadidas.includes(r.id)}
                onCambia={(p) => setPorciones((x) => ({ ...x, [r.id]: p }))} onAnadir={() => agregar(act)} />;
            })}
          </ul>
        </section>
      )}
      <p className="text-xs text-zinc-500">Valores aproximados. No sustituyen el consejo de un profesional de la salud.</p>
    </main>
  );
}
