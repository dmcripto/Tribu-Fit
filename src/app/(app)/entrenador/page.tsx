"use client";

import { useState } from "react";
import { useUsuario } from "@/components/AppShell";
import AsignarNutricion from "@/components/AsignarNutricion";
import AsignarPlan from "@/components/AsignarPlan";
import Chip from "@/components/Chip";
import GraficoPeso from "@/components/GraficoPeso";
import Pestanas from "@/components/Pestanas";
import { FotosProgreso, MarcasEjercicio } from "@/components/ProgresoExtra";
import { alertasEntrenador, resumenSemanal } from "@/lib/logros";
import {
  PREMIUM_TEXTO, estadoAlumno, estadoCuota, estadoPremium, formatoFecha, entrenosSemana, planTerminado,
  promedioNutricion, semanaActual, type Estado,
} from "@/lib/datos";
import Link from "next/link";
import { datosParaMotor, useAutoPropuestas, useCartera, usePagoConfig, usePagos } from "@/lib/repo";
import { generarNutricion, generarPlan } from "@/lib/motor";
import { useToday } from "@/lib/store";
import type { Alumno, PremiumModo } from "@/lib/types";

const ESTADO: Record<Estado, { texto: string; tono: "ok" | "aviso" | "mal" }> = {
  al_dia: { texto: "Al día", tono: "ok" },
  revisar: { texto: "Revisar", tono: "aviso" },
  riesgo: { texto: "En riesgo", tono: "mal" },
};
const ORDEN: Record<Estado, number> = { riesgo: 0, revisar: 1, al_dia: 2 };
const coma = (n: number) => n.toFixed(1).replace(".", ",");

function CodigoInvitacion({ codigo }: { codigo?: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* si el navegador no deja copiar, el código sigue visible para copiarlo a mano */
    }
  }
  return (
    <section className="tarjeta flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="subtitulo">Tu código</h2>
        <p className="text-sm text-zinc-500">Pásaselo a tus alumnos para que se vinculen contigo.</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-md border-2 border-orange-600 px-3 py-1.5 font-mono text-xl font-bold tracking-widest" aria-label="Código de invitación">
          {codigo ?? "—"}
        </span>
        <button type="button" className="btn-ghost" onClick={copiar}>{copiado ? "Copiado" : "Copiar"}</button>
      </div>
    </section>
  );
}

export default function Entrenador() {
  const usuario = useUsuario();
  const hoy = useToday();
  const cartera = useCartera(usuario);
  const { alumnos, planes, objetivos, asignar, asignarNutricion, excepciones, fijarExcepcion, perfiles, propuestas, crearPropuesta } = cartera;
  useAutoPropuestas(cartera, hoy, usuario?.rol === "entrenador");
  const { config } = usePagoConfig(usuario);
  const { pagos } = usePagos(usuario);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState("resumen");
  const [aviso, setAviso] = useState<string | null>(null);
  const [generado, setGenerado] = useState<string | null>(null);

  if (usuario?.rol !== "entrenador") {
    return (
      <main className="flex flex-col items-start gap-3 py-6">
        <h1 className="titulo">Solo para entrenadores</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Para ver el progreso de tus alumnos, crea una cuenta eligiendo &quot;Entrenador/a&quot; en el registro.
        </p>
      </main>
    );
  }

  const premiumDe = (id: string) =>
    estadoPremium({
      pagos: pagos.filter((p) => p.alumno_id === id), cobra: config !== null,
      gracia: config?.gracia ?? 3, excepcion: excepciones[id], hoy,
    });
  const filas = alumnos
    .map((a) => ({ a, ...estadoAlumno(a.entrenos, hoy), premium: premiumDe(a.id) }))
    .sort((x, y) => ORDEN[x.estado] - ORDEN[y.estado]);
  const actual: Alumno | undefined = alumnos.find((a) => a.id === sel);

  const pendientesDe = (id: string) => propuestas.filter((p) => p.alumno_id === id && p.estado === "pendiente").length;

  /** Genera ahora la propuesta de un tipo con los datos actuales del alumno (sustituye la pendiente). */
  async function generarAhora(a: Alumno, tipo: "rutinas" | "nutricion") {
    const datos = datosParaMotor(a, perfiles[a.id] ?? null, hoy);
    const fallo = tipo === "rutinas"
      ? await crearPropuesta({ alumno_id: a.id, tipo, ...generarPlan(datos) }, true)
      : await crearPropuesta({ alumno_id: a.id, tipo, ...generarNutricion(datos) }, true);
    setGenerado(fallo ?? "Propuesta lista. Revísala y apruébala en Propuestas.");
  }

  function abrir(id: string) {
    setSel(id);
    setTab("resumen");
    setAviso(null);
    setGenerado(null);
    window.scrollTo({ top: 0 });
  }

  /* ---------------- Lista de alumnos ---------------- */
  if (!actual) {
    const enRiesgo = filas.filter((f) => f.estado === "riesgo").length;
    return (
      <main className="flex flex-col gap-5">
        <div>
          <h1 className="titulo">Alumnos</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {alumnos.length === 0
              ? "Aún no tienes alumnos."
              : `${alumnos.length} alumnos${enRiesgo ? ` · ${enRiesgo} necesitan atención` : " · todos al día"}`}
          </p>
        </div>

        <CodigoInvitacion codigo={usuario.codigo} />

        {alumnos.length > 0 && (() => {
          const bloqueados = new Set(config === null ? [] : filas.filter((f) => !f.premium.activo).map((f) => f.a.id));
          const alertas = alertasEntrenador(alumnos, hoy, bloqueados);
          const res = resumenSemanal(alumnos, hoy);
          return (
            <>
              <section className="tarjeta flex flex-col gap-2" aria-label="Resumen de la semana">
                <h2 className="subtitulo">Esta semana</h2>
                <p className="text-sm">
                  <b>{res.entrenos}</b> entrenos de tu tribu · <b>{res.activos}</b> de {res.visibles} alumnos activos ({res.pctActivos} %)
                </p>
              </section>
              <section className="tarjeta flex flex-col gap-2" aria-label="Alertas">
                <h2 className="subtitulo">Atención primero{alertas.length > 0 ? ` · ${alertas.length}` : ""}</h2>
                {alertas.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nada urgente. Tus alumnos van al día.</p>
                ) : (
                  <ul className="flex flex-col text-sm">
                    {alertas.slice(0, 8).map((al, i) => (
                      <li key={`${al.alumno_id}-${al.tipo}-${i}`} className="flex items-center justify-between gap-3 border-t border-zinc-200 py-2 first:border-0 dark:border-zinc-800">
                        <span>
                          <b className={al.gravedad === 2 ? "text-red-600" : ""}>{al.nombre}</b>
                          <span className="block text-zinc-600 dark:text-zinc-400">{al.texto}</span>
                        </span>
                        <span className="flex shrink-0 gap-3">
                          <Link href={`/chat?alumno=${al.alumno_id}`} className="font-bold text-orange-600">Escribir</Link>
                          <button type="button" className="font-bold text-orange-600" onClick={() => abrir(al.alumno_id)}>Abrir</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {alertas.length > 8 && <p className="text-xs text-zinc-500">Y {alertas.length - 8} más. Revisa la lista de abajo.</p>}
              </section>
            </>
          );
        })()}

        {alumnos.length === 0 ? (
          <section className="tarjeta">
            <p className="text-zinc-600 dark:text-zinc-400">
              Comparte tu código para que tus alumnos se vinculen contigo. Aparecerán aquí.
            </p>
          </section>
        ) : (
          <ul className="flex flex-col gap-3">
            {filas.map(({ a, estado, desde, premium }) => {
              const ult = [...a.medidas].sort((x, y) => x.fecha.localeCompare(y.fecha)).at(-1);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => abrir(a.id)}
                    className="tarjeta flex w-full flex-col gap-2 text-left hover:border-orange-600"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-lg font-black">{a.nombre}</span>
                      {a.permiso ? <Chip tono={ESTADO[estado].tono}>{ESTADO[estado].texto}</Chip> : <Chip tono="neutro">Sin permiso</Chip>}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {!a.permiso
                        ? "No comparte su progreso contigo"
                        : `${desde === null ? "Sin entrenos" : desde === 0 ? "Entrenó hoy" : `Último entreno hace ${desde} días`}${ult ? ` · ${coma(ult.peso_kg)} kg` : ""}`}
                    </span>
                    <span className="flex flex-wrap gap-2">
                      {config !== null && (
                        <Chip tono={premium.activo ? (premium.motivo === "en_gracia" ? "aviso" : "ok") : "mal"}>
                          Premium: {PREMIUM_TEXTO[premium.motivo]}
                        </Chip>
                      )}
                      {pendientesDe(a.id) > 0 && <Chip tono="aviso">Propuesta por revisar</Chip>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    );
  }

  /* ---------------- Ficha de un alumno ---------------- */
  const premium = premiumDe(actual.id);
  const est = estadoAlumno(actual.entrenos, hoy);
  const susPlanes = planes.filter((p) => p.alumno_id === actual.id);
  const susPagos = pagos.filter((p) => p.alumno_id === actual.id);
  const cuota = estadoCuota(susPagos, hoy);
  const prom = promedioNutricion(actual.comidas, hoy);
  const meta = objetivos[actual.id];
  const medidasOrdenadas = [...actual.medidas].sort((x, y) => x.fecha.localeCompare(y.fecha));

  async function cambiarAcceso(valor: string) {
    const fallo = await fijarExcepcion(actual!.id, valor === "auto" ? null : (valor as PremiumModo));
    setAviso(fallo ?? "Acceso actualizado.");
  }

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <button type="button" className="self-start text-sm font-bold text-orange-600" onClick={() => setSel(null)}>
          ← Todos los alumnos
        </button>
        <h1 className="titulo">{actual.nombre}</h1>
        <p className="text-sm text-zinc-500">{actual.objetivo || "Sin objetivo indicado"}</p>
        <Link href={`/chat?alumno=${actual.id}`} className="btn-ghost w-fit">Escribirle</Link>
        <div className="flex flex-wrap gap-2">
          {actual.permiso ? <Chip tono={ESTADO[est.estado].tono}>{ESTADO[est.estado].texto}</Chip> : <Chip tono="neutro">Sin permiso</Chip>}
          {config !== null && (
            <Chip tono={premium.activo ? (premium.motivo === "en_gracia" ? "aviso" : "ok") : "mal"}>
              Premium: {PREMIUM_TEXTO[premium.motivo]}
            </Chip>
          )}
        </div>
      </div>

      <Pestanas
        etiqueta={`Secciones de ${actual.nombre}`}
        activa={tab}
        onCambia={(t) => { setTab(t); setAviso(null); }}
        items={[
          { id: "resumen", texto: "Resumen" },
          { id: "rutinas", texto: "Rutinas" },
          { id: "nutricion", texto: "Nutrición" },
          { id: "progreso", texto: "Fotos y marcas" },
          { id: "pago", texto: "Pago" },
        ]}
      />

      {tab === "resumen" && (
        <div role="tabpanel" className="flex flex-col gap-5">
          {!actual.permiso ? (
            <p className="tarjeta text-sm text-zinc-600 dark:text-zinc-400">
              Este alumno no ha dado permiso para compartir su progreso contigo. Puede activarlo desde su cuenta.
            </p>
          ) : (
            <>
              <section className="tarjeta flex flex-col gap-3">
                <h2 className="subtitulo">Peso</h2>
                <GraficoPeso datos={medidasOrdenadas} />
              </section>
              <section className="tarjeta flex flex-col gap-2">
                <h2 className="subtitulo">Entrenos</h2>
                <p className="text-sm text-zinc-500">{entrenosSemana(actual.entrenos, hoy)} en los últimos 7 días</p>
                {actual.entrenos.length === 0 ? (
                  <p className="text-sm text-zinc-500">Aún no ha registrado entrenos.</p>
                ) : (
                  <ul className="flex flex-col text-sm">
                    {[...actual.entrenos].sort((x, y) => y.fecha.localeCompare(x.fecha)).slice(0, 5).map((e, i) => (
                      <li key={`${e.fecha}-${i}`} className="flex justify-between gap-3 border-t border-zinc-200 py-2 dark:border-zinc-800">
                        <span>{e.rutina}</span>
                        <span className="shrink-0 font-mono text-zinc-500">{formatoFecha(e.fecha).slice(0, 5)} · {e.hechos}/{e.total}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="tarjeta flex flex-col gap-2">
                <h2 className="subtitulo">Nutrición</h2>
                {!prom ? (
                  <p className="text-sm text-zinc-500">Aún no ha registrado comidas.</p>
                ) : (
                  <p className="text-sm">
                    Media de <b>{prom.kcal} kcal</b> y <b>{prom.proteina} g</b> de proteína al día
                    {meta ? ` (objetivo: ${meta.kcal} kcal y ${meta.proteina} g)` : " (sin objetivo personalizado)"}.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {(tab === "rutinas" || tab === "nutricion") && (
        <section className="tarjeta flex flex-col items-start gap-2">
          <h2 className="subtitulo">Propuesta automática</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {perfiles[actual.id]
              ? "Prepara un borrador con el perfil y el progreso de este alumno. Lo revisas antes de que le llegue."
              : "Este alumno aún no completó su perfil. Puedes generar un borrador igualmente: usará valores por defecto y te lo marcará como aviso."}
          </p>
          <button type="button" className="btn-ghost" onClick={() => generarAhora(actual, tab === "rutinas" ? "rutinas" : "nutricion")}>
            Generar propuesta de {tab === "rutinas" ? "rutinas" : "nutrición"}
          </button>
          {generado && (
            <p role="status" className="text-sm text-green-700 dark:text-green-400">
              {generado} <Link href="/propuestas" className="font-bold underline">Ir a Propuestas</Link>
            </p>
          )}
        </section>
      )}

      {tab === "rutinas" && (
        <div role="tabpanel" className="flex flex-col gap-5">
          <section className="tarjeta flex flex-col gap-2">
            <h2 className="subtitulo">Planes asignados</h2>
            {susPlanes.length === 0 ? (
              <p className="text-sm text-zinc-500">Todavía no le has asignado ningún plan.</p>
            ) : (
              <ul className="flex flex-col text-sm">
                {susPlanes.map((p) => {
                  const s = semanaActual(p, hoy);
                  return (
                    <li key={p.id} className="flex flex-wrap justify-between gap-x-3 border-t border-zinc-200 py-2 dark:border-zinc-800">
                      <span className="font-bold">{p.nombre}</span>
                      <span className="font-mono text-zinc-500">
                        {p.semanas.length} sem. · {planTerminado(p, hoy) ? "terminado" : s === 0 ? `empieza el ${formatoFecha(p.fecha_inicio).slice(0, 5)}` : `semana ${s}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="tarjeta">
            <AsignarPlan key={`plan-${actual.id}`} alumno={actual} hoy={hoy} asignar={asignar} />
          </section>
        </div>
      )}

      {tab === "nutricion" && (
        <div role="tabpanel" className="tarjeta">
          <AsignarNutricion key={`nutri-${actual.id}`} alumno={actual} actual={objetivos[actual.id]} asignar={asignarNutricion} />
        </div>
      )}

      {tab === "progreso" && (
        <div role="tabpanel" className="flex flex-col gap-5">
          {!actual.permiso ? (
            <p className="tarjeta text-sm text-zinc-600 dark:text-zinc-400">Este alumno no ha dado permiso para compartir su progreso contigo.</p>
          ) : (
            <>
              <MarcasEjercicio uid={actual.id} soloLectura />
              <FotosProgreso uid={actual.id} soloLectura />
            </>
          )}
        </div>
      )}

      {tab === "pago" && (
        <div role="tabpanel" className="flex flex-col gap-5">
          <section className="tarjeta flex flex-col gap-3">
            <h2 className="subtitulo">Cuota</h2>
            {config === null ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Aún no has configurado tu cobro, así que nadie se bloquea por falta de pago. Configúralo en Pagos, pestaña Mi cobro.
              </p>
            ) : (
              <p className="text-sm">
                {cuota.vence ? `Cubierta hasta el ${formatoFecha(cuota.vence)}.` : "Todavía no tiene pagos confirmados."}
              </p>
            )}
            {!premium.activo && (
              <p className="rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
                Su seguimiento personalizado está bloqueado. No verá el plan ni la nutrición que le asignes hasta que pague o le des cortesía.
              </p>
            )}
            <div>
              <label className="etiqueta" htmlFor="acceso">Acceso premium</label>
              <select
                id="acceso"
                className="campo"
                value={excepciones[actual.id] ?? "auto"}
                onChange={(e) => cambiarAcceso(e.target.value)}
              >
                <option value="auto">Automático (según sus pagos)</option>
                <option value="cortesia">Cortesía (premium gratis)</option>
                <option value="bloqueado">Bloquear</option>
              </select>
            </div>
            {aviso && <p role="status" className="text-sm text-green-700 dark:text-green-400">{aviso}</p>}
          </section>
        </div>
      )}
    </main>
  );
}
