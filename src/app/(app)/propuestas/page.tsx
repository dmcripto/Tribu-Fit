"use client";

import { useState } from "react";
import { useUsuario } from "@/components/AppShell";
import AsignarNutricion from "@/components/AsignarNutricion";
import AsignarPlan from "@/components/AsignarPlan";
import Chip from "@/components/Chip";
import Desplegable from "@/components/Desplegable";
import PropuestaVista from "@/components/PropuestaVista";
import { formatoFecha, resumenPropuesta } from "@/lib/datos";
import { useSaludAlumnos } from "@/lib/comunidad";
import { useAutoPropuestas, useCartera } from "@/lib/repo";
import { useToday } from "@/lib/store";
import type { Alumno, Propuesta } from "@/lib/types";

type Mensaje = { ok: boolean; texto: string } | null;
const TIPO = { rutinas: "Rutinas", nutricion: "Nutrición" } as const;

export default function Propuestas() {
  const usuario = useUsuario();
  const hoy = useToday();
  const cartera = useCartera(usuario);
  const salud = useSaludAlumnos(usuario);
  useAutoPropuestas(cartera, hoy, usuario?.rol === "entrenador", salud);
  const { alumnos, perfiles, propuestas, asignar, asignarNutricion, resolverPropuesta } = cartera;

  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [inicio, setInicio] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [msg, setMsg] = useState<Mensaje>(null);
  const [trabajando, setTrabajando] = useState(false);

  if (usuario?.rol !== "entrenador") {
    return (
      <main className="flex flex-col items-start gap-3 py-6">
        <h1 className="titulo">Solo para entrenadores</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Las propuestas automáticas las revisa tu entrenador/a.</p>
      </main>
    );
  }

  const fechaInicio = inicio || hoy;
  const alumnoDe = (id: string): Alumno | undefined => alumnos.find((a) => a.id === id);
  const nombreDe = (id: string) => alumnoDe(id)?.nombre ?? "Alumno";
  const pendientes = propuestas.filter((p) => p.estado === "pendiente").sort((a, b) => nombreDe(a.alumno_id).localeCompare(nombreDe(b.alumno_id)));
  const conAvisos = pendientes.filter((p) => p.avisos.length > 0);
  const listas = pendientes.filter((p) => p.avisos.length === 0);
  const resueltas = propuestas.filter((p) => p.estado !== "pendiente").sort((a, b) => b.creado.localeCompare(a.creado)).slice(0, 10);
  const sinPerfil = alumnos.filter((a) => a.permiso && !perfiles[a.id]);

  /** Aprueba: lo entrega al alumno (como plan u objetivo) y marca la propuesta como aprobada. */
  async function aprobar(p: Propuesta): Promise<string | null> {
    const fallo =
      p.tipo === "rutinas"
        ? await asignar({ alumno_id: p.alumno_id, nombre: p.contenido.nombre, fecha_inicio: fechaInicio, semanas: p.contenido.semanas })
        : await asignarNutricion(p.alumno_id, p.contenido);
    if (fallo) return fallo;
    return resolverPropuesta(p.id, "aprobada");
  }

  async function aprobarUna(p: Propuesta) {
    setTrabajando(true);
    const fallo = await aprobar(p);
    setTrabajando(false);
    setMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: `Aprobada. ${nombreDe(p.alumno_id).split(" ")[0]} ya la tiene en su ${p.tipo === "rutinas" ? "pestaña Rutinas" : "pestaña Nutrición"}.` });
  }

  async function rechazar(p: Propuesta) {
    const fallo = await resolverPropuesta(p.id, "rechazada");
    setMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: "Propuesta rechazada. No se volverá a generar en unos días." });
  }

  async function aprobarSeleccion() {
    const elegidas = listas.filter((p) => seleccion.includes(p.id));
    if (elegidas.length === 0) return setMsg({ ok: false, texto: "Marca primero las propuestas que quieres aprobar." });
    setTrabajando(true);
    let hechas = 0;
    let error: string | null = null;
    for (const p of elegidas) {
      const fallo = await aprobar(p);
      if (fallo) { error = `${nombreDe(p.alumno_id)}: ${fallo}`; break; }
      hechas++;
    }
    setTrabajando(false);
    setSeleccion([]);
    setMsg(error ? { ok: false, texto: `Se aprobaron ${hechas}. Se detuvo en ${error}` } : { ok: true, texto: `Se aprobaron ${hechas} propuestas y los alumnos ya las tienen.` });
  }

  const alternar = (id: string) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const todasMarcadas = listas.length > 0 && listas.every((p) => seleccion.includes(p.id));

  // Función que devuelve JSX (no un componente): así el editor abierto no se reinicia al marcar casillas.
  function tarjeta(p: Propuesta, seleccionable: boolean) {
    const alumno = alumnoDe(p.alumno_id);
    const abierto = abierta === p.id;
    return (
      <li key={p.id} className="tarjeta flex flex-col gap-3">
        <div className="flex items-start gap-3">
          {seleccionable && (
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0 accent-orange-600"
              aria-label={`Seleccionar propuesta de ${TIPO[p.tipo].toLowerCase()} de ${nombreDe(p.alumno_id)}`}
              checked={seleccion.includes(p.id)}
              onChange={() => alternar(p.id)}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-black">{nombreDe(p.alumno_id)}</span>
              <Chip tono="neutro">{TIPO[p.tipo]}</Chip>
            </div>
            <p className="text-sm text-zinc-500">{resumenPropuesta(p)}</p>
          </div>
        </div>

        {p.avisos.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-md border border-amber-500 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            {p.avisos.map((a) => <li key={a}>• {a}</li>)}
          </ul>
        )}

        <button type="button" className="self-start text-sm font-bold text-orange-600" aria-expanded={abierto} onClick={() => setAbierta(abierto ? null : p.id)}>
          {abierto ? "Ocultar detalle" : "Ver detalle y motivos"}
        </button>
        {abierto && (
          <div className="flex flex-col gap-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <div>
              <p className="etiqueta">Por qué el sistema propone esto</p>
              <ul className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                {p.razones.map((r) => <li key={r}>• {r}</li>)}
              </ul>
            </div>
            <PropuestaVista propuesta={p} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={trabajando} onClick={() => aprobarUna(p)}>Aprobar y enviar</button>
          {alumno && (
            <button type="button" className="btn-ghost" onClick={() => setEditando(editando === p.id ? null : p.id)}>
              {editando === p.id ? "Cerrar edición" : "Editar antes de enviar"}
            </button>
          )}
          <button type="button" className="px-3 py-2 text-sm font-bold text-red-600" onClick={() => rechazar(p)}>Rechazar</button>
        </div>

        {editando === p.id && alumno && (
          <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
            {p.tipo === "rutinas" ? (
              <AsignarPlan
                key={`edit-${p.id}`} alumno={alumno} hoy={hoy} asignar={asignar} borrador={p.contenido}
                alAsignar={() => { void resolverPropuesta(p.id, "aprobada"); setEditando(null); setMsg({ ok: true, texto: "Plan editado y enviado. La propuesta quedó aprobada." }); }}
              />
            ) : (
              <AsignarNutricion
                key={`edit-${p.id}`} alumno={alumno} actual={cartera.objetivos[p.alumno_id]} asignar={asignarNutricion} borrador={p.contenido}
                alAsignar={() => { void resolverPropuesta(p.id, "aprobada"); setEditando(null); setMsg({ ok: true, texto: "Objetivo editado y enviado. La propuesta quedó aprobada." }); }}
              />
            )}
          </div>
        )}
      </li>
    );
  }

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="titulo">Propuestas</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {pendientes.length === 0
            ? "No tienes propuestas pendientes."
            : `${pendientes.length} por revisar. El sistema las preparó con los datos de tus alumnos. Nada les llega hasta que tú lo apruebes.`}
        </p>
      </div>

      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-md border px-3 py-2 text-sm ${msg.ok ? "border-green-700 text-green-700 dark:text-green-400" : "border-red-600 text-red-600"}`}>{msg.texto}</p>}

      {pendientes.length === 0 && (
        <section className="tarjeta flex flex-col gap-2">
          <h2 className="subtitulo">Cómo funciona</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Cuando un alumno completa su perfil de entrenamiento y te da permiso, el sistema prepara un plan de rutinas y un objetivo de nutrición a su medida, y los deja aquí para que los valides. Se vuelven a preparar solos cuando un plan termina o cuando el progreso del alumno pide un ajuste.
          </p>
        </section>
      )}

      {sinPerfil.length > 0 && (
        <section className="tarjeta flex flex-col gap-1">
          <h2 className="subtitulo">Faltan perfiles ({sinPerfil.length})</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Estos alumnos aún no completaron su perfil, así que no se les puede preparar una propuesta: {sinPerfil.map((a) => a.nombre).join(", ")}. Lo completan en su pantalla de Inicio.
          </p>
        </section>
      )}

      {conAvisos.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Propuestas que necesitan tu atención">
          <h2 className="subtitulo">Necesitan tu atención ({conAvisos.length})</h2>
          <p className="text-sm text-zinc-500">Tienen avisos: molestias, datos que faltan o edades que piden cuidado. Ábrelas una a una.</p>
          <ul className="flex flex-col gap-3">{conAvisos.map((p) => tarjeta(p, false))}</ul>
        </section>
      )}

      {listas.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Propuestas listas para aprobar">
          <h2 className="subtitulo">Listas para aprobar ({listas.length})</h2>
          <div className="tarjeta flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" className="size-5 accent-orange-600" checked={todasMarcadas} onChange={() => setSeleccion(todasMarcadas ? [] : listas.map((p) => p.id))} />
              Marcar todas
            </label>
            <div>
              <label className="etiqueta" htmlFor="inicio-planes">Los planes empiezan el</label>
              <input className="campo" id="inicio-planes" type="date" value={fechaInicio} min={hoy} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <button type="button" className="btn-primary" disabled={trabajando || seleccion.length === 0} onClick={aprobarSeleccion}>
              Aprobar {seleccion.length > 0 ? `${seleccion.length} ` : ""}seleccionadas
            </button>
          </div>
          <ul className="flex flex-col gap-3">{listas.map((p) => tarjeta(p, true))}</ul>
        </section>
      )}

      {resueltas.length > 0 && (
        <Desplegable titulo="Resueltas recientemente" detalle="Lo último que aprobaste o rechazaste">
          <ul className="flex flex-col text-sm">
            {resueltas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 py-2 dark:border-zinc-800">
                <span><b>{nombreDe(p.alumno_id)}</b> · {TIPO[p.tipo]} · <span className="text-zinc-500">{formatoFecha(p.creado.slice(0, 10))}</span></span>
                <Chip tono={p.estado === "aprobada" ? "ok" : "neutro"}>{p.estado === "aprobada" ? "Aprobada" : "Rechazada"}</Chip>
              </li>
            ))}
          </ul>
        </Desplegable>
      )}
    </main>
  );
}
