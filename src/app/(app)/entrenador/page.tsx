"use client";

import { useState } from "react";
import { useUsuario } from "@/components/AppShell";
import GraficoPeso from "@/components/GraficoPeso";
import {
  RUTINAS, estadoAlumno, formatoFecha, semanaActual, entrenosSemana, planTerminado,
  type Estado, type Plan,
} from "@/lib/datos";
import { useCartera, type NuevoPlan } from "@/lib/repo";
import { modoDemo } from "@/lib/supabase";
import { useToday } from "@/lib/store";
import type { Alumno } from "@/lib/types";

const ETIQUETA: Record<Estado, { texto: string; clase: string }> = {
  al_dia: { texto: "Al día", clase: "text-green-700 dark:text-green-400" },
  revisar: { texto: "Revisar", clase: "text-amber-700 dark:text-amber-400" },
  riesgo: { texto: "En riesgo", clase: "text-red-600" },
};

const coma = (n: number) => n.toFixed(1).replace(".", ",");

function AsignarPlan({
  alumno, hoy, asignar,
}: { alumno: Alumno; hoy: string; asignar: (p: NuevoPlan) => Promise<string | null> }) {
  const [nombre, setNombre] = useState("Plan de 4 semanas");
  const [semanas, setSemanas] = useState(4);
  const [inicio, setInicio] = useState(hoy);
  const [quitadas, setQuitadas] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  function alternar(clave: string) {
    setQuitadas((q) => (q.includes(clave) ? q.filter((k) => k !== clave) : [...q, clave]));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const fecha = inicio || hoy;
    const lista = Array.from({ length: semanas }, (_, i) => ({
      semana: i + 1,
      rutinas: RUTINAS.filter((_, j) => !quitadas.includes(`${i + 1}-${j}`)),
    }));
    if (!nombre.trim()) return setMsg({ ok: false, texto: "Ponle un nombre al plan." });
    const vacia = lista.find((s) => s.rutinas.length === 0);
    if (vacia) return setMsg({ ok: false, texto: `La semana ${vacia.semana} no tiene ninguna rutina.` });
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
      <h3 className="text-xl font-black uppercase">Asignar plan</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="etiqueta" htmlFor="plan-nombre">Nombre</label>
          <input className="campo" id="plan-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
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
      <fieldset className="flex flex-col gap-2">
        <legend className="etiqueta">Rutinas de cada semana</legend>
        {Array.from({ length: semanas }, (_, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-200 pt-2 text-sm dark:border-zinc-800">
            <span className="w-20 font-mono text-xs uppercase text-zinc-500">Semana {i + 1}</span>
            {RUTINAS.map((r, j) => {
              const clave = `${i + 1}-${j}`;
              return (
                <label key={clave} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-orange-600"
                    checked={!quitadas.includes(clave)}
                    onChange={() => alternar(clave)}
                  />
                  {r.nombre.split(" · ")[0]}
                </label>
              );
            })}
          </div>
        ))}
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

export default function Entrenador() {
  const usuario = useUsuario();
  const hoy = useToday();
  const { alumnos, planes, asignar } = useCartera(usuario);
  const [sel, setSel] = useState<string | null>(null);

  if (usuario?.rol !== "entrenador") {
    return (
      <main className="flex flex-col items-start gap-3 py-6">
        <h1 className="text-4xl font-black uppercase">Solo para entrenadores</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Para ver el progreso de tus alumnos, crea una cuenta eligiendo &quot;Entrenador/a&quot; en el registro.
        </p>
      </main>
    );
  }

  const filas = alumnos.map((a) => ({ a, ...estadoAlumno(a.entrenos, hoy) }));
  const orden: Record<Estado, number> = { riesgo: 0, revisar: 1, al_dia: 2 };
  filas.sort((x, y) => orden[x.estado] - orden[y.estado]);
  const actual = alumnos.find((a) => a.id === sel) ?? filas[0]?.a;
  const planesActual: Plan[] = actual ? planes.filter((p) => p.alumno_id === actual.id) : [];

  return (
    <main className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Panel de entrenador/a</p>
        <h1 className="text-5xl font-black uppercase leading-none">Mis alumnos</h1>
      </div>

      <section className="tarjeta flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black uppercase">Tu código de invitación</h2>
          <p className="text-sm text-zinc-500">
            Pásaselo a tus alumnos. Lo escriben al registrarse o en su panel para vincularse contigo.
          </p>
        </div>
        <span className="rounded-md border-2 border-orange-600 px-4 py-2 font-mono text-2xl font-bold tracking-widest" aria-label="Código de invitación">
          {usuario.codigo ?? "—"}
        </span>
      </section>

      {modoDemo && (
        <p className="rounded-md border border-orange-600/40 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
          Datos de ejemplo: los alumnos de ejemplo son inventados. Tu propia cuenta aparece como primer alumno para que pruebes
          el flujo completo. Con Supabase conectado verás a tus alumnos reales.
        </p>
      )}

      {alumnos.length === 0 ? (
        <section className="tarjeta">
          <p className="text-zinc-600 dark:text-zinc-400">
            Aún no tienes alumnos. Comparte tu código de invitación para que se vinculen contigo.
          </p>
        </section>
      ) : (
        <>
          <section className="tarjeta overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-xs uppercase text-zinc-500">
                  <th className="p-2">Alumno</th><th className="p-2">Último entreno</th><th className="p-2">7 días</th><th className="p-2">Peso</th><th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ a, estado, desde }) => {
                  const ult = [...a.medidas].sort((x, y) => x.fecha.localeCompare(y.fecha)).at(-1);
                  return (
                    <tr key={a.id} className={`border-t border-zinc-200 dark:border-zinc-800 ${a.id === actual?.id ? "bg-orange-600/10" : ""}`}>
                      <td className="p-2">
                        <button type="button" className="text-left font-bold underline-offset-2 hover:underline" onClick={() => setSel(a.id)} aria-pressed={a.id === actual?.id}>
                          {a.nombre}
                        </button>
                      </td>
                      <td className="p-2">{!a.permiso ? "—" : desde === null ? "Sin entrenos" : desde === 0 ? "Hoy" : `hace ${desde} días`}</td>
                      <td className="p-2">{a.permiso ? entrenosSemana(a.entrenos, hoy) : "—"}</td>
                      <td className="p-2">{a.permiso && ult ? `${coma(ult.peso_kg)} kg` : "—"}</td>
                      <td className="p-2">
                        {a.permiso ? (
                          <span className={`font-mono text-xs font-bold ${ETIQUETA[estado].clase}`}>{ETIQUETA[estado].texto}</span>
                        ) : (
                          <span className="font-mono text-xs text-zinc-500">Sin permiso</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {actual && (
            <section className="tarjeta flex flex-col gap-6" aria-label={`Detalle de ${actual.nombre}`}>
              <div>
                <h2 className="text-3xl font-black uppercase leading-none">{actual.nombre}</h2>
                <p className="text-sm text-zinc-500">{actual.objetivo || "Sin objetivo indicado"}</p>
              </div>
              {!actual.permiso ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Este alumno no ha dado permiso para compartir su progreso contigo. Puede activarlo al registrarse o desde su cuenta.
                </p>
              ) : (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xl font-black uppercase">Evolución del peso</h3>
                      <GraficoPeso datos={[...actual.medidas].sort((x, y) => x.fecha.localeCompare(y.fecha))} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xl font-black uppercase">Últimos entrenos</h3>
                      {actual.entrenos.length === 0 ? (
                        <p className="text-sm text-zinc-500">Aún no ha registrado entrenos.</p>
                      ) : (
                        <ul className="flex flex-col gap-2 text-sm">
                          {[...actual.entrenos].sort((x, y) => y.fecha.localeCompare(x.fecha)).slice(0, 6).map((e, i) => (
                            <li key={`${e.fecha}-${i}`} className="flex justify-between gap-3 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                              <span>{e.rutina}</span>
                              <span className="font-mono text-zinc-500">{formatoFecha(e.fecha)} · {e.hechos}/{e.total}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-black uppercase">Planes asignados</h3>
                    {planesActual.length === 0 ? (
                      <p className="text-sm text-zinc-500">Todavía no le has asignado ningún plan.</p>
                    ) : (
                      <ul className="flex flex-col gap-2 text-sm">
                        {planesActual.map((p) => {
                          const s = semanaActual(p, hoy);
                          return (
                            <li key={p.id} className="flex justify-between gap-3 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                              <span className="font-bold">{p.nombre}</span>
                              <span className="font-mono text-zinc-500">
                                {formatoFecha(p.fecha_inicio)} · {p.semanas.length} sem. ·{" "}
                                {planTerminado(p, hoy) ? "terminado" : s === 0 ? "aún no empieza" : `semana ${s}`}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}
              {/* key: reinicia el formulario al cambiar de alumno */}
              <AsignarPlan key={actual.id} alumno={actual} hoy={hoy} asignar={asignar} />
            </section>
          )}
        </>
      )}
    </main>
  );
}
