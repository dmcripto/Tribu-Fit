"use client";

import { useState } from "react";
import GraficoPeso from "@/components/GraficoPeso";
import { EJERCICIOS } from "@/lib/ejercicios";
import { useFotos, useMarcas } from "@/lib/comunidad";
import { mejoresMarcas, unRM } from "@/lib/logros";
import { imagenADataUrl } from "@/lib/imagen";
import { useToday } from "@/lib/store";

const coma = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

export function FotosProgreso({ uid, soloLectura = false }: { uid: string; soloLectura?: boolean }) {
  const hoy = useToday();
  const { fotos, anadir, borrar } = useFotos(uid);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [ver, setVer] = useState<string | null>(null);

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    const campo = e.target;
    if (!archivo) return;
    setOcupado(true);
    const { url, error } = await imagenADataUrl(archivo, { lado: 900 });
    if (!url) {
      setMsg({ ok: false, texto: error ?? "No se pudo leer la imagen." });
    } else {
      const fallo = await anadir({ fecha: hoy, nota: "", imagen: url });
      setMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: "Foto guardada." });
    }
    setOcupado(false);
    campo.value = "";
  }

  const ordenadas = [...fotos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const primera = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];

  return (
    <section className="tarjeta flex flex-col gap-4">
      <h2 className="subtitulo">Fotos de progreso</h2>
      {!soloLectura && (
        <div className="flex flex-col gap-2">
          <label className="btn-ghost w-fit" aria-disabled={ocupado}>
            {ocupado ? "Guardando…" : "Añadir foto de hoy"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={subir} disabled={ocupado} aria-label="Elegir foto de progreso" />
          </label>
          <p className="text-xs text-zinc-500">Solo tú y, si lo permites, tu entrenador/a pueden verlas.</p>
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>{msg.texto}</p>}
      {ordenadas.length === 0 ? (
        <p className="text-sm text-zinc-500">{soloLectura ? "No hay fotos para mostrar." : "Aún no tienes fotos. Una al mes ayuda a ver el cambio que la báscula no muestra."}</p>
      ) : (
        <>
          {primera !== ultima && (
            <div className="grid grid-cols-2 gap-3" aria-label="Antes y después">
              {[["Antes", primera], ["Ahora", ultima]].map(([t, f]) => (
                <figure key={t as string} className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={(f as typeof primera).imagen} alt={`${t} · ${(f as typeof primera).fecha}`} className="aspect-[3/4] w-full rounded-lg object-cover" />
                  <figcaption className="text-xs text-zinc-500">{t as string} · {(f as typeof primera).fecha}</figcaption>
                </figure>
              ))}
            </div>
          )}
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {[...ordenadas].reverse().map((f) => (
              <li key={f.id} className="relative">
                <button type="button" onClick={() => setVer(f.id)} className="block w-full" aria-label={`Ver foto del ${f.fecha}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.imagen} alt="" className="aspect-square w-full rounded-md object-cover" />
                  <span className="block text-[11px] text-zinc-500">{f.fecha}</span>
                </button>
                {!soloLectura && (
                  <button type="button" onClick={() => borrar(f.id)} aria-label={`Borrar foto del ${f.fecha}`}
                    className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/70 text-white">×</button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {ver && (() => {
        const f = fotos.find((x) => x.id === ver);
        return f ? (
          <div role="dialog" aria-modal="true" aria-label={`Foto del ${f.fecha}`} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4" onClick={() => setVer(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.imagen} alt={`Foto del ${f.fecha}`} className="max-h-[80vh] max-w-full rounded-lg" />
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
