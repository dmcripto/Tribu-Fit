"use client";

import { useState } from "react";
import CampoTexto from "@/components/CampoTexto";
import { RUTINAS, formatoFecha, type Rutina } from "@/lib/datos";
import type { NuevoPlan } from "@/lib/repo";
import type { Alumno } from "@/lib/types";

type Ejercicio = { id: string; nombre: string; series: string; carga: string };
type RutinaEd = { uid: string; nombre: string; detalle: string; ejercicios: Ejercicio[] };

const MAX_SEMANAS = 8;

const nuevoId = () => crypto.randomUUID();

function aEditable(r: Rutina, uid: string): RutinaEd {
  return {
    uid,
    nombre: r.nombre,
    detalle: r.detalle,
    ejercicios: r.ejercicios.map((e) => ({ id: nuevoId(), ...e })),
  };
}

function inicial(): RutinaEd[] {
  return RUTINAS.map((r, i) => aEditable(r, `base-${i}`));
}

/** Todas las rutinas base marcadas en todas las semanas posibles. */
function seleccionInicial(): string[] {
  const claves: string[] = [];
  for (let s = 1; s <= MAX_SEMANAS; s++) for (let i = 0; i < RUTINAS.length; i++) claves.push(`${s}-base-${i}`);
  return claves;
}

type Props = {
  alumno: Alumno;
  hoy: string;
  asignar: (p: NuevoPlan) => Promise<string | null>;
};

export default function AsignarPlan({ alumno, hoy, asignar }: Props) {
  const [nombre, setNombre] = useState("Plan de 4 semanas");
  const [semanas, setSemanas] = useState(4);
  const [inicio, setInicio] = useState(hoy);
  const [rutinas, setRutinas] = useState<RutinaEd[]>(inicial);
  const [marcadas, setMarcadas] = useState<string[]>(seleccionInicial);
  const [editando, setEditando] = useState(false);
  const [porSemana, setPorSemana] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiarRutina = (uid: string, parche: Partial<RutinaEd>) =>
    setRutinas((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...parche } : r)));
  const cambiarEjercicio = (uid: string, id: string, parche: Partial<Ejercicio>) =>
    setRutinas((rs) =>
      rs.map((r) => (r.uid === uid ? { ...r, ejercicios: r.ejercicios.map((e) => (e.id === id ? { ...e, ...parche } : e)) } : r)),
    );
  const quitarEjercicio = (uid: string, id: string) =>
    setRutinas((rs) => rs.map((r) => (r.uid === uid ? { ...r, ejercicios: r.ejercicios.filter((e) => e.id !== id) } : r)));
  const anadirEjercicio = (uid: string) =>
    setRutinas((rs) =>
      rs.map((r) => (r.uid === uid ? { ...r, ejercicios: [...r.ejercicios, { id: nuevoId(), nombre: "", series: "3 × 10", carga: "" }] } : r)),
    );
  const anadirRutina = () =>
    setRutinas((rs) => [...rs, { uid: nuevoId(), nombre: "Nueva rutina", detalle: "", ejercicios: [{ id: nuevoId(), nombre: "", series: "3 × 10", carga: "" }] }]);
  const quitarRutina = (uid: string) => {
    setRutinas((rs) => rs.filter((r) => r.uid !== uid));
    setMarcadas((m) => m.filter((k) => !k.endsWith(`-${uid}`)));
  };
  /** Marca o desmarca una rutina en todas las semanas a la vez. */
  const alternarTodas = (uid: string, valor: boolean) =>
    setMarcadas((m) => {
      const sin = m.filter((k) => !k.endsWith(`-${uid}`));
      return valor ? [...sin, ...Array.from({ length: MAX_SEMANAS }, (_, i) => `${i + 1}-${uid}`)] : sin;
    });
  const alternar = (clave: string) =>
    setMarcadas((m) => (m.includes(clave) ? m.filter((k) => k !== clave) : [...m, clave]));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const fecha = inicio || hoy;
    if (!nombre.trim()) return setMsg({ ok: false, texto: "Ponle un nombre al plan." });
    const lista = Array.from({ length: semanas }, (_, i) => ({
      semana: i + 1,
      rutinas: rutinas
        .filter((r) => marcadas.includes(`${i + 1}-${r.uid}`))
        .map((r) => ({
          nombre: r.nombre.trim(),
          detalle: r.detalle.trim(),
          ejercicios: r.ejercicios
            .filter((x) => x.nombre.trim())
            .map((x) => ({ nombre: x.nombre.trim(), series: x.series.trim(), carga: x.carga.trim() })),
        })),
    }));
    for (const s of lista) {
      if (s.rutinas.length === 0) return setMsg({ ok: false, texto: `La semana ${s.semana} no tiene ninguna rutina.` });
      const mala = s.rutinas.find((r) => !r.nombre || r.ejercicios.length === 0);
      if (mala) return setMsg({ ok: false, texto: `Revisa "${mala.nombre || "una rutina sin nombre"}": necesita nombre y al menos un ejercicio.` });
    }
    setEnviando(true);
    const fallo = await asignar({ alumno_id: alumno.id, nombre: nombre.trim(), fecha_inicio: fecha, semanas: lista });
    setEnviando(false);
    setMsg(
      fallo
        ? { ok: false, texto: fallo }
        : { ok: true, texto: `Plan asignado. La semana 1 se libera el ${formatoFecha(fecha)} y el resto una por semana.` },
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <h2 className="subtitulo">Nuevo plan de rutinas</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="etiqueta" htmlFor="plan-nombre">Nombre</label>
          <CampoTexto id="plan-nombre" valor={nombre} onCambio={setNombre} autoComplete="off" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="plan-semanas">Duración</label>
          <select className="campo" id="plan-semanas" value={semanas} onChange={(e) => setSemanas(Number(e.target.value))}>
            <option value={1}>1 semana</option>
            <option value={2}>2 semanas</option>
            <option value={4}>4 semanas (mensual)</option>
            <option value={8}>8 semanas</option>
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor="plan-inicio">Empieza el</label>
          <input className="campo" id="plan-inicio" type="date" value={inicio} min={hoy} onChange={(e) => setInicio(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {rutinas.length} rutinas disponibles para {alumno.nombre.split(" ")[0]}. Edítalas o crea las tuyas.
          </p>
          <button type="button" className="btn-ghost" aria-expanded={editando} onClick={() => setEditando((v) => !v)}>
            {editando ? "Cerrar editor" : "Personalizar rutinas"}
          </button>
        </div>
        {editando && (
          <div className="flex flex-col gap-4">
            {rutinas.map((r) => (
              <fieldset key={r.uid} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <legend className="sr-only">{r.nombre || "Rutina"}</legend>
                <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_auto]">
                  <div>
                    <label className="etiqueta" htmlFor={`rn-${r.uid}`}>Nombre de la rutina</label>
                    <CampoTexto id={`rn-${r.uid}`} valor={r.nombre} onCambio={(v) => cambiarRutina(r.uid, { nombre: v })} autoComplete="off" />
                  </div>
                  <div>
                    <label className="etiqueta" htmlFor={`rd-${r.uid}`}>Detalle</label>
                    <CampoTexto id={`rd-${r.uid}`} valor={r.detalle} onCambio={(v) => cambiarRutina(r.uid, { detalle: v })} placeholder="Lunes · 55 min" autoComplete="off" />
                  </div>
                  <div className="flex items-end">
                    <button type="button" className="text-sm font-bold text-red-600" onClick={() => quitarRutina(r.uid)}>Quitar rutina</button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="hidden grid-cols-[1.6fr_0.8fr_1fr_2rem] gap-2 font-mono text-xs uppercase text-zinc-500 sm:grid">
                    <span>Ejercicio</span><span>Series</span><span>Carga</span><span />
                  </div>
                  {r.ejercicios.map((x) => (
                    <div key={x.id} className="grid grid-cols-[1fr_1fr_2rem] gap-2 sm:grid-cols-[1.6fr_0.8fr_1fr_2rem]">
                      <div className="col-span-3 sm:col-span-1">
                        <CampoTexto aria-label="Ejercicio" valor={x.nombre} onCambio={(v) => cambiarEjercicio(r.uid, x.id, { nombre: v })} placeholder="Press banca" autoComplete="off" />
                      </div>
                      <input className="campo" aria-label="Series" value={x.series} onChange={(e) => cambiarEjercicio(r.uid, x.id, { series: e.target.value })} placeholder="4 × 6" />
                      <input className="campo" aria-label="Carga" value={x.carga} onChange={(e) => cambiarEjercicio(r.uid, x.id, { carga: e.target.value })} placeholder="80 kg" />
                      <button type="button" aria-label={`Quitar ejercicio ${x.nombre}`} onClick={() => quitarEjercicio(r.uid, x.id)} className="text-zinc-500 hover:text-red-600">
                        <svg viewBox="0 0 16 16" className="mx-auto size-4" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></svg>
                      </button>
                    </div>
                  ))}
                  <div><button type="button" className="text-sm font-bold text-orange-600" onClick={() => anadirEjercicio(r.uid)}>+ Añadir ejercicio</button></div>
                </div>
              </fieldset>
            ))}
            <div><button type="button" className="btn-ghost" onClick={anadirRutina}>+ Nueva rutina</button></div>
          </div>
        )}
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="etiqueta">Rutinas del plan</legend>
        {!porSemana ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {rutinas.map((r) => {
              const todas = Array.from({ length: semanas }, (_, i) => i + 1).every((s) => marcadas.includes(`${s}-${r.uid}`));
              return (
                <label key={r.uid} className="flex items-center gap-2">
                  <input type="checkbox" className="size-5 accent-orange-600" checked={todas} onChange={() => alternarTodas(r.uid, !todas)} />
                  {r.nombre.split(" · ")[0] || "Sin nombre"}
                </label>
              );
            })}
          </div>
        ) : (
          Array.from({ length: semanas }, (_, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-200 pt-2 text-sm dark:border-zinc-800">
              <span className="w-20 font-mono text-xs uppercase text-zinc-500">Semana {i + 1}</span>
              {rutinas.map((r) => {
                const clave = `${i + 1}-${r.uid}`;
                return (
                  <label key={clave} className="flex items-center gap-2">
                    <input type="checkbox" className="accent-orange-600" checked={marcadas.includes(clave)} onChange={() => alternar(clave)} />
                    {r.nombre.split(" · ")[0] || "Sin nombre"}
                  </label>
                );
              })}
            </div>
          ))
        )}
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" className="accent-orange-600" checked={porSemana} onChange={(e) => setPorSemana(e.target.checked)} />
          Cambiar las rutinas semana por semana
        </label>
      </fieldset>

      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
          {msg.texto}
        </p>
      )}
      <div><button className="btn-primary" disabled={enviando}>{enviando ? "Asignando..." : `Asignar a ${alumno.nombre.split(" ")[0]}`}</button></div>
    </form>
  );
}
