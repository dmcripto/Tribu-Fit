"use client";

import { useState } from "react";
import { estimarObjetivo } from "@/lib/datos";
import type { Alumno, ObjetivoNutricion } from "@/lib/types";

type Props = {
  alumno: Alumno;
  actual: ObjetivoNutricion | undefined;
  asignar: (alumnoId: string, o: ObjetivoNutricion) => Promise<string | null>;
};

type Texto = Record<"kcal" | "proteina" | "carbos" | "grasas" | "agua", string>;

const aTexto = (o: ObjetivoNutricion): Texto => ({
  kcal: String(o.kcal), proteina: String(o.proteina), carbos: String(o.carbos),
  grasas: String(o.grasas), agua: String(o.agua),
});

const CAMPOS: { k: keyof Texto; etiqueta: string }[] = [
  { k: "kcal", etiqueta: "Calorías (kcal)" },
  { k: "proteina", etiqueta: "Proteína (g)" },
  { k: "carbos", etiqueta: "Carbohidratos (g)" },
  { k: "grasas", etiqueta: "Grasas (g)" },
  { k: "agua", etiqueta: "Agua (vasos)" },
];

export default function AsignarNutricion({ alumno, actual, asignar }: Props) {
  const pesoActual = [...alumno.medidas].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1)?.peso_kg;
  const estimado = estimarObjetivo(pesoActual, alumno.objetivo);
  const [valores, setValores] = useState<Texto>(aTexto(actual ?? estimado));
  const [notas, setNotas] = useState(actual?.notas ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  function usarEstimacion() {
    setValores(aTexto(estimado));
    setMsg(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const n = (k: keyof Texto) => Number(valores[k].replace(",", "."));
    const kcal = n("kcal"), proteina = n("proteina"), carbos = n("carbos"), grasas = n("grasas"), agua = n("agua");
    if (![kcal, proteina, carbos, grasas, agua].every(Number.isFinite))
      return setMsg({ ok: false, texto: "Escribe solo números en todos los campos." });
    if (kcal < 800 || kcal > 6000) return setMsg({ ok: false, texto: "Las calorías deben estar entre 800 y 6000." });
    if ([proteina, carbos, grasas].some((x) => x < 0 || x > 800)) return setMsg({ ok: false, texto: "Revisa los gramos de cada macro." });
    if (agua < 0 || agua > 24) return setMsg({ ok: false, texto: "Los vasos de agua deben estar entre 0 y 24." });
    setEnviando(true);
    const fallo = await asignar(alumno.id, {
      kcal: Math.round(kcal), proteina: Math.round(proteina), carbos: Math.round(carbos),
      grasas: Math.round(grasas), agua: Math.round(agua), notas: notas.trim(),
    });
    setEnviando(false);
    setMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: "Objetivo guardado. El alumno lo verá en su pestaña Nutrición." });
  }

  const nombre = alumno.nombre.split(" ")[0];
  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-black uppercase">Nutrición de {nombre}</h3>
        <button type="button" className="text-sm font-bold text-orange-600" onClick={usarEstimacion}>
          Usar estimación{pesoActual ? ` (${pesoActual} kg)` : ""}
        </button>
      </div>
      <p className="text-sm text-zinc-500">
        {actual ? "Ya tiene un objetivo personalizado. Puedes cambiarlo." : "Todavía usa la estimación general. Personalízalo aquí."}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {CAMPOS.map(({ k, etiqueta }) => (
          <div key={k}>
            <label className="etiqueta" htmlFor={`nu-${k}`}>{etiqueta}</label>
            <input
              className="campo"
              id={`nu-${k}`}
              inputMode="decimal"
              value={valores[k]}
              onChange={(e) => setValores((v) => ({ ...v, [k]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div>
        <label className="etiqueta" htmlFor="nu-notas">Notas y comidas sugeridas</label>
        <textarea
          className="campo min-h-24"
          id="nu-notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Desayuno: avena con fruta. Evita refrescos. Cena ligera antes de las 21:00."
        />
      </div>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
          {msg.texto}
        </p>
      )}
      <div><button className="btn-primary" disabled={enviando}>{enviando ? "Guardando..." : `Guardar para ${nombre}`}</button></div>
    </form>
  );
}
