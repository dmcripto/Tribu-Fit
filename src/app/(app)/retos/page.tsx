"use client";

import { useState } from "react";
import { useUsuario } from "@/components/AppShell";
import { useFotos, useMarcas, useRanking, useRetos } from "@/lib/comunidad";
import { formatoFecha, racha, sumarDias } from "@/lib/datos";
import { insignias, progresoReto } from "@/lib/logros";
import { useCartera, useEntrenos, useMedidas } from "@/lib/repo";
import { useToday } from "@/lib/store";
import type { FilaRanking, Reto, Usuario } from "@/lib/types";

function Barra({ valor, meta }: { valor: number; meta: number }) {
  const pct = Math.min(100, (100 * valor) / Math.max(meta, 1));
  return (
    <div role="progressbar" aria-valuenow={Math.min(valor, meta)} aria-valuemin={0} aria-valuemax={meta} className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div className={`h-full ${valor >= meta ? "bg-green-600" : "bg-orange-600"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Ranking({ filas }: { filas: FilaRanking[] }) {
  return (
    <section className="tarjeta flex flex-col gap-2" aria-label="Ranking de la tribu">
      <h2 className="subtitulo">Ranking de la tribu</h2>
      <p className="text-xs text-zinc-500">Entrenos de los últimos 30 días. Solo aparece quien activó «compartir con la tribu» en su cuenta.</p>
      {filas.length === 0 ? (
        <p className="text-sm text-zinc-500">Todavía no hay nadie en el ranking.</p>
      ) : (
        <ol className="flex flex-col text-sm">
          {filas.map((f, i) => (
            <li key={f.usuario_id} className={`flex items-center justify-between gap-3 border-t border-zinc-200 py-2 dark:border-zinc-800 ${f.es_yo ? "font-bold text-orange-600" : ""}`}>
              <span><span className="mr-2 inline-block w-6 font-mono text-zinc-500">{i + 1}.</span>{f.nombre}{f.es_yo ? " (tú)" : ""}</span>
              <span className="font-mono">{f.entrenos}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function VistaAlumno({ yo }: { yo: Usuario }) {
  const hoy = useToday();
  const { retos } = useRetos(yo);
  const { entrenos } = useEntrenos(yo.id);
  const { medidas } = useMedidas(yo.id);
  const { marcas } = useMarcas(yo.id);
  const { fotos } = useFotos(yo.id);
  const ranking = useRanking(yo);
  const activos = retos.filter((r) => r.hasta >= hoy);
  const logros = insignias({ entrenos, medidas, marcas, fotos, hoy });

  return (
    <>
      <section className="flex flex-col gap-3" aria-label="Retos">
        <h2 className="subtitulo">Retos</h2>
        {activos.length === 0 ? (
          <p className="tarjeta text-sm text-zinc-500">Tu entrenador/a todavía no lanzó ningún reto. Mientras tanto, mantén tu racha: llevas <b>{racha(entrenos, hoy)}</b> día(s).</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {activos.map((r) => {
              const n = progresoReto(entrenos, r.desde, r.hasta);
              return (
                <li key={r.id} className="tarjeta flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-black">{r.titulo}</h3>
                    <span className="font-mono text-sm">{Math.min(n, r.meta_entrenos)}/{r.meta_entrenos}</span>
                  </div>
                  {r.descripcion && <p className="text-sm text-zinc-600 dark:text-zinc-400">{r.descripcion}</p>}
                  <Barra valor={n} meta={r.meta_entrenos} />
                  <p className="text-xs text-zinc-500">
                    {formatoFecha(r.desde)} – {formatoFecha(r.hasta)}{n >= r.meta_entrenos ? " · ¡Reto cumplido! 🎉" : r.desde > hoy ? " · aún no empieza" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <Ranking filas={ranking} />
      <section className="tarjeta flex flex-col gap-3" aria-label="Insignias">
        <h2 className="subtitulo">Insignias · {logros.filter((l) => l.lograda).length}/{logros.length}</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {logros.map((l) => (
            <li key={l.id} className={`rounded-lg border p-3 text-sm ${l.lograda ? "border-orange-600" : "border-zinc-200 opacity-60 dark:border-zinc-800"}`}>
              <p className="font-bold">{l.lograda ? "🏅 " : "🔒 "}{l.titulo}</p>
              <p className="text-xs text-zinc-500">{l.detalle}</p>
              {!l.lograda && l.progreso && <p className="mt-1 font-mono text-xs">{l.progreso}</p>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function FormReto({ onCrear }: { onCrear: (r: Omit<Reto, "id">) => Promise<string | null> }) {
  const hoy = useToday();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const titulo = String(f.get("titulo") ?? "").trim();
    const meta = Number(f.get("meta"));
    const desde = String(f.get("desde") || hoy);
    const hasta = String(f.get("hasta") || "");
    setOk(false);
    if (!titulo) return setError("Ponle un nombre al reto.");
    if (!(Number.isInteger(meta) && meta >= 1 && meta <= 200)) return setError("La meta son entrenos: un número entre 1 y 200.");
    if (!hasta || hasta < desde) return setError("La fecha final debe ser igual o posterior al inicio.");
    const fallo = await onCrear({ titulo: titulo.slice(0, 80), descripcion: String(f.get("descripcion") ?? "").trim().slice(0, 300), meta_entrenos: meta, desde, hasta });
    if (fallo) return setError(fallo);
    setError(null);
    setOk(true);
    form.reset();
  }
  return (
    <form onSubmit={enviar} noValidate className="tarjeta flex flex-col gap-3">
      <h2 className="subtitulo">Nuevo reto</h2>
      <div><label className="etiqueta" htmlFor="r-titulo">Nombre</label><input className="campo" id="r-titulo" name="titulo" placeholder="12 entrenos en 30 días" maxLength={80} /></div>
      <div><label className="etiqueta" htmlFor="r-desc">Descripción (opcional)</label><input className="campo" id="r-desc" name="descripcion" maxLength={300} /></div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className="etiqueta" htmlFor="r-meta">Meta</label><input className="campo" id="r-meta" name="meta" inputMode="numeric" placeholder="12" /></div>
        <div><label className="etiqueta" htmlFor="r-desde">Desde</label><input className="campo" id="r-desde" name="desde" type="date" defaultValue={hoy} key={`d${hoy}`} /></div>
        <div><label className="etiqueta" htmlFor="r-hasta">Hasta</label><input className="campo" id="r-hasta" name="hasta" type="date" defaultValue={hoy ? sumarDias(hoy, 30) : ""} key={`h${hoy}`} /></div>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {ok && <p role="status" className="text-sm text-green-700 dark:text-green-400">Reto creado. Tus alumnos lo ven ya.</p>}
      <div><button className="btn-primary">Crear reto</button></div>
    </form>
  );
}

function VistaEntrenador({ yo }: { yo: Usuario }) {
  const hoy = useToday();
  const { retos, crear, borrar } = useRetos(yo);
  const { alumnos } = useCartera(yo);
  const ranking = useRanking(yo);
  const visibles = alumnos.filter((a) => a.permiso);
  return (
    <>
      <FormReto onCrear={crear} />
      <section className="flex flex-col gap-3" aria-label="Retos creados">
        <h2 className="subtitulo">Tus retos</h2>
        {retos.length === 0 ? <p className="tarjeta text-sm text-zinc-500">Aún no creaste ningún reto.</p> : (
          <ul className="flex flex-col gap-3">
            {[...retos].sort((a, b) => b.hasta.localeCompare(a.hasta)).map((r) => {
              const filas = visibles.map((a) => ({ a, n: progresoReto(a.entrenos, r.desde, r.hasta) })).sort((x, y) => y.n - x.n);
              const cumplen = filas.filter((f) => f.n >= r.meta_entrenos).length;
              return (
                <li key={r.id} className="tarjeta flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black">{r.titulo}</h3>
                      <p className="text-xs text-zinc-500">{formatoFecha(r.desde)} – {formatoFecha(r.hasta)} · meta {r.meta_entrenos} entrenos · {r.hasta < hoy ? "terminado" : "activo"}</p>
                    </div>
                    <button type="button" className="text-sm text-red-600 underline" onClick={() => borrar(r.id)} aria-label={`Borrar reto ${r.titulo}`}>Borrar</button>
                  </div>
                  <p className="text-sm">{cumplen} de {filas.length} alumnos lo cumplen.</p>
                  <ul className="flex flex-col gap-2 text-sm">
                    {filas.map(({ a, n }) => (
                      <li key={a.id}>
                        <div className="flex justify-between gap-2"><span>{a.nombre}</span><span className="font-mono">{Math.min(n, r.meta_entrenos)}/{r.meta_entrenos}</span></div>
                        <Barra valor={n} meta={r.meta_entrenos} />
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <Ranking filas={ranking} />
    </>
  );
}

export default function Retos() {
  const yo = useUsuario();
  if (!yo) return null;
  return (
    <main className="flex flex-col gap-5">
      <h1 className="titulo">Retos</h1>
      {yo.rol === "entrenador" ? <VistaEntrenador yo={yo} /> : <VistaAlumno yo={yo} />}
    </main>
  );
}
