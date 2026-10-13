"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useUsuario } from "@/components/AppShell";
import Conversacion from "@/components/Conversacion";
import { useHilos } from "@/lib/comunidad";
import { useCartera } from "@/lib/repo";
import { modoDemo } from "@/lib/supabase";
import type { Usuario } from "@/lib/types";

function VistaAlumno({ yo, contexto }: { yo: Usuario; contexto: string }) {
  const sinCoach = !modoDemo && !yo.entrenadorId;
  if (sinCoach) {
    return (
      <p className="tarjeta text-sm text-zinc-600 dark:text-zinc-400">
        Aún no tienes entrenador/a vinculado/a. Escribe su código en Inicio para poder chatear con él o ella.
      </p>
    );
  }
  return <Conversacion yo={yo} alumnoId={yo.id} contextoInicial={contexto} titulo="Tu entrenador/a" />;
}

function VistaEntrenador({ yo, inicial }: { yo: Usuario; inicial: string }) {
  const { alumnos } = useCartera(yo);
  const hilos = useHilos(yo);
  const [sel, setSel] = useState<string | null>(inicial || null);
  const actual = alumnos.find((a) => a.id === sel);
  const hiloDe = (id: string) => hilos.find((h) => h.alumno_id === id);

  if (actual) {
    return (
      <div className="flex flex-col gap-3">
        <button type="button" className="self-start text-sm font-bold text-orange-600" onClick={() => setSel(null)}>← Todas las conversaciones</button>
        <Conversacion yo={yo} alumnoId={actual.id} titulo={actual.nombre} />
      </div>
    );
  }
  const ordenados = [...alumnos].sort((a, b) =>
    (hiloDe(b.id)?.ultimo.creado ?? "").localeCompare(hiloDe(a.id)?.ultimo.creado ?? "") || a.nombre.localeCompare(b.nombre));
  return alumnos.length === 0 ? (
    <p className="tarjeta text-sm text-zinc-600 dark:text-zinc-400">Cuando tus alumnos se vinculen contigo podrás chatear con ellos aquí.</p>
  ) : (
    <ul className="flex flex-col gap-2">
      {ordenados.map((a) => {
        const h = hiloDe(a.id);
        return (
          <li key={a.id}>
            <button type="button" onClick={() => setSel(a.id)} className="tarjeta flex w-full items-center justify-between gap-3 text-left hover:border-orange-600">
              <span className="min-w-0">
                <span className="block font-black">{a.nombre}</span>
                <span className="block truncate text-sm text-zinc-500">{h ? h.ultimo.texto : "Sin mensajes todavía"}</span>
              </span>
              {h && h.noLeidos > 0 && (
                <span aria-label={`${h.noLeidos} sin leer`} className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-bold text-white">{h.noLeidos}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Contenido() {
  const yo = useUsuario();
  const params = useSearchParams();
  if (!yo) return null;
  return (
    <main className="flex flex-col gap-4">
      <h1 className="titulo">Chat</h1>
      {yo.rol === "entrenador"
        ? <VistaEntrenador yo={yo} inicial={params.get("alumno") ?? ""} />
        : <VistaAlumno yo={yo} contexto={params.get("tema") ?? ""} />}
    </main>
  );
}

export default function Chat() {
  return <Suspense fallback={null}><Contenido /></Suspense>;
}

