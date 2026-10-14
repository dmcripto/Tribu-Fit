"use client";

import { useState } from "react";
import { useSalud } from "@/lib/comunidad";
import { CONDICIONES, type Condicion } from "@/lib/salud";
import type { Usuario } from "@/lib/types";

/** El alumno declara si tiene alguna condición de salud que afecte lo que come. */
export default function SaludAlimentacion({ usuario }: { usuario: Usuario }) {
  const { salud, guardar } = useSalud(usuario);
  // Mientras no toca nada, se muestra lo guardado; al tocar, se edita una copia.
  const [borrador, setBorrador] = useState<{ condiciones: Condicion[]; detalle: string } | null>(null);
  const actual = borrador ?? salud;
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const alternar = (id: Condicion) => {
    const c = actual.condiciones.includes(id) ? actual.condiciones.filter((x) => x !== id) : [...actual.condiciones, id];
    setBorrador({ ...actual, condiciones: c });
    setMsg(null);
  };

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (actual.detalle.length > 300) return setMsg({ ok: false, texto: "El detalle es muy largo: resúmelo a menos de 300 caracteres." });
    setGuardando(true);
    const fallo = await guardar({ condiciones: actual.condiciones, detalle: actual.detalle.trim() });
    setGuardando(false);
    if (fallo) return setMsg({ ok: false, texto: fallo });
    setBorrador(null);
    setMsg({ ok: true, texto: actual.condiciones.length || actual.detalle.trim() ? "Guardado. Tu entrenador/a lo verá y tus recetas ya lo respetan." : "Guardado: no declaraste ninguna condición." });
  }

  return (
    <form onSubmit={enviar} noValidate className="tarjeta flex flex-col gap-3" aria-label="Salud y alimentación">
      <div>
        <h2 className="subtitulo">Salud y alimentación</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          ¿Tienes alguna condición de salud que afecte lo que comes? Cuéntaselo a tu entrenador/a: las recetas y los planes la van a respetar. Solo lo ve si le diste permiso en Cuenta.
        </p>
      </div>
      <div role="group" aria-label="Condiciones de salud" className="flex flex-wrap gap-2">
        {CONDICIONES.map((c) => {
          const on = actual.condiciones.includes(c.id);
          return (
            <button key={c.id} type="button" aria-pressed={on} onClick={() => alternar(c.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? "border-orange-600 bg-orange-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>
              {on ? "✓ " : ""}{c.texto}
            </button>
          );
        })}
      </div>
      <div>
        <label className="etiqueta" htmlFor="salud-detalle">Otra condición o detalle (opcional)</label>
        <textarea id="salud-detalle" className="campo min-h-20" value={actual.detalle} maxLength={300}
          onChange={(e) => { setBorrador({ ...actual, detalle: e.target.value }); setMsg(null); }}
          placeholder="Por ejemplo: diabetes tipo 2, me medico por la mañana" />
      </div>
      <p className="rounded-xl border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        No reemplaza la consulta con tu médico o nutricionista. Ante cualquier duda, consúltalo antes de cambiar tu alimentación.
      </p>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>{msg.texto}</p>}
      <div><button className="btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button></div>
    </form>
  );
}
