"use client";

import { useState } from "react";
import Chip from "@/components/Chip";
import GraficoPeso from "@/components/GraficoPeso";
import { EJERCICIOS } from "@/lib/ejercicios";
import { useFotos, useMarcas } from "@/lib/comunidad";
import { formatoFecha } from "@/lib/datos";
import { estadoChequeo, mejoresMarcas, unRM, type EstadoChequeo } from "@/lib/logros";
import type { AnguloFoto } from "@/lib/types";
import { imagenADataUrl } from "@/lib/imagen";
import { useToday } from "@/lib/store";

const coma = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

const ANGULOS: { id: Exclude<AnguloFoto, "otra">; texto: string; ayuda: string }[] = [
  { id: "frente", texto: "Frente", ayuda: "De pie, de frente, brazos relajados" },
  { id: "perfil_izq", texto: "Perfil izquierdo", ayuda: "De costado, lado izquierdo hacia la cámara" },
  { id: "perfil_der", texto: "Perfil derecho", ayuda: "De costado, lado derecho hacia la cámara" },
  { id: "espalda", texto: "Espalda", ayuda: "De espaldas, brazos relajados" },
];
const NOMBRE_ANGULO: Record<AnguloFoto, string> = {
  frente: "Frente", perfil: "Perfil", perfil_izq: "Perfil izquierdo", perfil_der: "Perfil derecho", espalda: "Espalda", otra: "Foto",
};
/** Para comparar «antes y después» también entran las fotos de «perfil» de antes de separar los dos lados. */
const ANGULOS_COMPARA = [...ANGULOS, { id: "perfil" as const, texto: "Perfil", ayuda: "" }];

const ESTADO_TEXTO: Record<EstadoChequeo["estado"], { texto: string; tono: "ok" | "aviso" | "mal" | "neutro" }> = {
  sin: { texto: "Sin chequeos", tono: "neutro" },
  al_dia: { texto: "Al día", tono: "ok" },
  pronto: { texto: "Se acerca", tono: "aviso" },
  toca: { texto: "Toca chequeo", tono: "aviso" },
  vencido: { texto: "Vencido", tono: "mal" },
};

/**
 * Chequeo mensual con fotos: cada 30 días el alumno sube cuatro fotos (frente, perfil izquierdo, perfil derecho y espalda) y se compara
 * con su primer chequeo. `soloLectura` es la vista de la entrenadora.
 */
export function ChequeoMensual({ uid, soloLectura = false }: { uid: string; soloLectura?: boolean }) {
  const hoy = useToday();
  const { fotos, anadir, borrar } = useFotos(uid);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [ver, setVer] = useState<string | null>(null);

  const ultima = fotos.map((f) => f.fecha).sort().at(-1) ?? null;
  const est = estadoChequeo(ultima, hoy);
  const deHoy = (a: AnguloFoto) => fotos.find((f) => f.fecha === hoy && f.tipo === a);

  async function subir(angulo: AnguloFoto, e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    const campo = e.target;
    if (!archivo) return;
    setOcupado(angulo);
    const { url, error } = await imagenADataUrl(archivo, { lado: 900 });
    if (!url) {
      setMsg({ ok: false, texto: error ?? "No se pudo leer la imagen." });
    } else {
      const previa = deHoy(angulo);
      const fallo = await anadir({ fecha: hoy, nota: "", imagen: url, tipo: angulo });
      if (!fallo && previa) await borrar(previa.id); // se reemplaza la foto del mismo ángulo de hoy
      setMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: `Foto de ${NOMBRE_ANGULO[angulo].toLowerCase()} guardada.` });
    }
    setOcupado(null);
    campo.value = "";
  }

  // Comparación: la primera foto de cada ángulo contra la más reciente.
  const comparaciones = ANGULOS_COMPARA.map((a) => {
    const lista = fotos.filter((f) => f.tipo === a.id).sort((x, y) => x.fecha.localeCompare(y.fecha));
    return lista.length >= 2 ? { a, antes: lista[0], ahora: lista[lista.length - 1] } : null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);
  const grupos = [...new Set(fotos.map((f) => f.fecha))].sort().reverse();
  const hechosHoy = ANGULOS.filter((a) => deHoy(a.id)).length;

  const encabezado = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="subtitulo">Chequeo mensual</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {est.estado === "sin"
            ? soloLectura ? "Todavía no subió fotos de chequeo." : "Aún no tienes chequeos. Sube tus 4 fotos para empezar a ver tu cambio."
            : `Último chequeo: ${formatoFecha(ultima!)} (hace ${est.dias} días). Próximo: ${formatoFecha(est.proximo!)}.`}
        </p>
      </div>
      <Chip tono={ESTADO_TEXTO[est.estado].tono}>{ESTADO_TEXTO[est.estado].texto}</Chip>
    </div>
  );

  return (
    <section className="tarjeta flex flex-col gap-4" aria-label="Chequeo mensual">
      {encabezado}

      {!soloLectura && (
        <div className="flex flex-col gap-3">
          {(est.estado === "toca" || est.estado === "vencido") && (
            <p role="status" className="rounded-xl border border-amber-500 bg-amber-500/10 px-3 py-2 text-sm">
              Ya pasaron los 30 días: toca tu chequeo. Con buena luz, misma ropa y mismo lugar que la vez anterior.
            </p>
          )}
          <p className="text-sm font-bold">Chequeo de hoy · {hechosHoy} de 4 fotos</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ANGULOS.map((a) => {
              const f = deHoy(a.id);
              return (
                <li key={a.id} className="flex flex-col gap-1.5">
                  <label className={`relative flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-center ${f ? "border-green-600" : "border-orange-500/60"}`}>
                    {f ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.imagen} alt={`${a.texto} de hoy`} className="size-full object-cover" />
                    ) : (
                      <span className="px-1 text-xs text-zinc-500">{ocupado === a.id ? "Guardando…" : "Tocar para subir"}</span>
                    )}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={`Subir foto de ${a.texto.toLowerCase()}`}
                      onChange={(e) => subir(a.id, e)} disabled={ocupado !== null} />
                  </label>
                  <span className="text-center text-xs font-bold">{a.texto}</span>
                  <span className="text-center text-[11px] leading-tight text-zinc-500">{f ? "Toca la foto para cambiarla" : a.ayuda}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-zinc-500">Solo tú y, si lo permites, tu entrenador/a pueden verlas. También registra tu peso en Medidas.</p>
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>{msg.texto}</p>}

      {comparaciones.length > 0 && (
        <div className="flex flex-col gap-3" aria-label="Antes y después">
          <h3 className="font-black">Antes y después</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {comparaciones.map(({ a, antes, ahora }) => (
              <div key={a.id} className="flex flex-col gap-1">
                <p className="text-xs font-bold uppercase text-zinc-500">{a.texto}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[["Antes", antes], ["Ahora", ahora]].map(([t, f]) => (
                    <figure key={t as string}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={(f as typeof antes).imagen} alt={`${a.texto}, ${(t as string).toLowerCase()}: ${(f as typeof antes).fecha}`} className="aspect-[3/4] w-full rounded-lg object-cover" />
                      <figcaption className="text-[11px] text-zinc-500">{t as string} · {formatoFecha((f as typeof antes).fecha)}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {grupos.length === 0 ? (
        soloLectura ? <p className="text-sm text-zinc-500">No hay fotos para mostrar.</p> : null
      ) : (
        <div className="flex flex-col gap-3">
          <h3 className="font-black">Historial</h3>
          {grupos.map((fecha) => (
            <div key={fecha} className="flex flex-col gap-1.5">
              <p className="font-mono text-xs text-zinc-500">{formatoFecha(fecha)}</p>
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {fotos.filter((f) => f.fecha === fecha).map((f) => (
                  <li key={f.id} className="relative">
                    <button type="button" onClick={() => setVer(f.id)} className="block w-full" aria-label={`Ver foto de ${NOMBRE_ANGULO[f.tipo].toLowerCase()} del ${f.fecha}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.imagen} alt="" className="aspect-square w-full rounded-md object-cover" />
                      <span className="block text-[11px] text-zinc-500">{NOMBRE_ANGULO[f.tipo]}</span>
                    </button>
                    {!soloLectura && (
                      <button type="button" onClick={() => borrar(f.id)} aria-label={`Borrar foto de ${NOMBRE_ANGULO[f.tipo].toLowerCase()} del ${f.fecha}`}
                        className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/70 text-white">×</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {ver && (() => {
        const f = fotos.find((x) => x.id === ver);
        return f ? (
          <div role="dialog" aria-modal="true" aria-label={`Foto del ${f.fecha}`} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4" onClick={() => setVer(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.imagen} alt={`Foto de ${NOMBRE_ANGULO[f.tipo].toLowerCase()} del ${f.fecha}`} className="max-h-[80vh] max-w-full rounded-lg" />
            <button type="button" className="btn-primary" onClick={() => setVer(null)}>Cerrar</button>
          </div>
        ) : null;
      })()}
    </section>
  );
}

export function MarcasEjercicio({ uid, soloLectura = false }: { uid: string; soloLectura?: boolean }) {
  const hoy = useToday();
  const { marcas, anadir, borrar } = useMarcas(uid);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [elegido, setElegido] = useState("");
  const mejores = mejoresMarcas(marcas);
  const sel = elegido || mejores[0]?.ejercicio || "";
  const serie = marcas
    .filter((m) => m.ejercicio === sel)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((m) => ({ fecha: m.fecha, peso_kg: Math.round(unRM(m.peso_kg, m.reps) * 10) / 10 }));

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const ejercicio = String(f.get("ejercicio") ?? "").trim();
    const peso = Number(String(f.get("peso") ?? "").replace(",", "."));
    const reps = Number(String(f.get("reps") ?? ""));
    if (!ejercicio) return setMsg({ ok: false, texto: "Escribe el ejercicio." });
    if (!(peso >= 0 && peso <= 1000)) return setMsg({ ok: false, texto: "Revisa el peso en kilos." });
    if (!(Number.isInteger(reps) && reps >= 1 && reps <= 1000)) return setMsg({ ok: false, texto: "Escribe las repeticiones (1 o más)." });
    const fallo = await anadir({ fecha: hoy, ejercicio: ejercicio.slice(0, 80), peso_kg: peso, reps });
    if (fallo) return setMsg({ ok: false, texto: fallo });
    setMsg({ ok: true, texto: "Marca guardada." });
    setElegido(ejercicio);
    form.reset();
  }

  return (
    <section className="tarjeta flex flex-col gap-4">
      <h2 className="subtitulo">Marcas por ejercicio</h2>
      {!soloLectura && (
        <form onSubmit={enviar} noValidate className="grid grid-cols-[1fr_5.5rem_4.5rem] items-end gap-2">
          <div className="col-span-3">
            <label className="etiqueta" htmlFor="marca-ejercicio">Ejercicio</label>
            <input className="campo" id="marca-ejercicio" name="ejercicio" list="lista-ejercicios" placeholder="Sentadilla" autoComplete="off" />
            <datalist id="lista-ejercicios">{EJERCICIOS.map((e) => <option key={e.id} value={e.nombre} />)}</datalist>
          </div>
          <div className="col-span-1">
            <label className="etiqueta" htmlFor="marca-peso">Peso (kg)</label>
            <input className="campo" id="marca-peso" name="peso" inputMode="decimal" placeholder="60" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="marca-reps">Reps</label>
            <input className="campo" id="marca-reps" name="reps" inputMode="numeric" placeholder="8" />
          </div>
          <div><button className="btn-primary w-full">Guardar</button></div>
        </form>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>{msg.texto}</p>}
      {mejores.length === 0 ? (
        <p className="text-sm text-zinc-500">{soloLectura ? "Sin marcas registradas." : "Registra lo que levantas para ver cómo subes tu fuerza."}</p>
      ) : (
        <>
          <ul className="flex flex-col text-sm">
            {mejores.map((m) => (
              <li key={m.ejercicio}>
                <button type="button" onClick={() => setElegido(m.ejercicio)}
                  className={`flex w-full justify-between gap-3 border-t border-zinc-200 py-2 text-left dark:border-zinc-800 ${sel === m.ejercicio ? "font-bold text-orange-600" : ""}`}>
                  <span>{m.ejercicio}</span>
                  <span className="font-mono">{coma(m.peso_kg)} kg × {m.reps} <span className="text-zinc-500">(≈{coma(unRM(m.peso_kg, m.reps))} kg 1RM)</span></span>
                </button>
              </li>
            ))}
          </ul>
          <div>
            <h3 className="mb-2 text-sm font-bold">{sel}: fuerza estimada (1RM)</h3>
            <GraficoPeso datos={serie} etiqueta="Fuerza estimada" unidad="kilos" />
          </div>
          {!soloLectura && (
            <details className="text-sm">
              <summary className="cursor-pointer text-zinc-500">Ver y borrar registros de {sel}</summary>
              <ul className="mt-2 flex flex-col">
                {marcas.filter((m) => m.ejercicio === sel).sort((a, b) => b.fecha.localeCompare(a.fecha)).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 border-t border-zinc-200 py-1.5 dark:border-zinc-800">
                    <span className="font-mono">{m.fecha} · {coma(m.peso_kg)} kg × {m.reps}</span>
                    <button type="button" className="px-2 text-zinc-500" aria-label={`Borrar marca del ${m.fecha}`} onClick={() => borrar(m.id)}>✕</button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
