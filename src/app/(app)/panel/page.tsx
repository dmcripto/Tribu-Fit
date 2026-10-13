"use client";

import Link from "next/link";
import { useState } from "react";
import { useUsuario } from "@/components/AppShell";
import { entrenosSemana, racha } from "@/lib/datos";
import { AVISO_KEY, vincularEntrenador } from "@/lib/auth";
import PerfilEntrenamiento from "@/components/PerfilEntrenamiento";
import PremiumAviso from "@/components/PremiumAviso";
import { useEntrenos, useMedidas, usePremium } from "@/lib/repo";
import { modoDemo } from "@/lib/supabase";
import { useLocal, useToday } from "@/lib/store";
import { useRecordatorios } from "@/lib/recordatorios";
import { useRecordatoriosLeidos } from "@/lib/comunidad";

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="tarjeta">
      <div className="text-4xl font-black tabular-nums">{valor}</div>
      <div className="mt-1 text-xs text-zinc-500">{etiqueta}</div>
    </div>
  );
}

function Vinculo() {
  const [codigo, setCodigo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return setAviso("Escribe el código que te dio tu entrenador/a.");
    const fallo = await vincularEntrenador(codigo);
    setAviso(fallo ?? "Listo. Tu entrenador/a ya puede ver tu progreso.");
  }
  return (
    <form onSubmit={enviar} className="tarjeta flex flex-col gap-3">
      <h2 className="subtitulo">Tu entrenador/a</h2>
      <p className="text-sm text-zinc-500">
        Escribe su código de invitación para compartirle tu progreso y recibir tus planes.
      </p>
      <div className="flex gap-2">
        <input
          className="campo max-w-48 uppercase"
          aria-label="Código de invitación"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="ABC123"
        />
        <button className="btn-primary">Vincular</button>
      </div>
      {aviso && <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">{aviso}</p>}
    </form>
  );
}

const SIN_AVISO: string | null = null;

export default function Panel() {
  const usuario = useUsuario();
  const [avisoCodigo, setAvisoCodigo] = useLocal<string | null>(AVISO_KEY, SIN_AVISO);
  const hoy = useToday();
  const { medidas } = useMedidas(usuario?.id ?? "");
  const { entrenos } = useEntrenos(usuario?.id ?? "");
  const premium = usePremium(usuario);
  const recordatorios = useRecordatorios(usuario);
  const { leidos } = useRecordatoriosLeidos();
  const paraHoy = recordatorios.filter((r) => !leidos.includes(r.id)).slice(0, 3);

  const orden = [...medidas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const ultima = orden[orden.length - 1];
  const cambio = ultima && orden.length > 1 ? ultima.peso_kg - orden[0].peso_kg : null;
  const semana = entrenosSemana(entrenos, hoy);
  const recientes = [...entrenos].reverse().slice(0, 5);
  const coma = (n: number) => n.toFixed(1).replace(".", ",");

  return (
    <main className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          {usuario?.rol === "entrenador" ? "Entrenador/a" : usuario?.objetivo || "Tu progreso"}
        </p>
        <h1 className="titulo">
          Hola, {usuario?.nombre}
        </h1>
      </div>
      {avisoCodigo && (
        <section role="alert" className="flex flex-col items-start gap-2 rounded-xl border-2 border-amber-500 p-4">
          <p className="text-sm">{avisoCodigo}</p>
          <button type="button" className="text-sm font-bold text-orange-600" onClick={() => setAvisoCodigo(null)}>Entendido</button>
        </section>
      )}
      {usuario?.rol === "atleta" && <PremiumAviso estado={premium} mostrarActivo />}
      {paraHoy.length > 0 && (
        <section className="tarjeta flex flex-col gap-2" aria-label="Para hoy">
          <h2 className="subtitulo">Para hoy</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {paraHoy.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-2 first:border-0 first:pt-0 dark:border-zinc-800">
                <span className={r.urgente ? "font-bold text-red-600" : ""}>{r.titulo}</span>
                <Link href={r.enlace} className="shrink-0 font-bold text-orange-600">Abrir</Link>
              </li>
            ))}
          </ul>
          {recordatorios.length > paraHoy.length && <Link href="/avisos" className="text-sm text-zinc-500 underline">Ver todos</Link>}
        </section>
      )}
      {usuario?.rol === "entrenador" && (
        <p className="text-sm">
          <Link href="/entrenador" className="font-bold text-orange-600">Ir a Alumnos</Link>
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Dato
          valor={ultima ? `${coma(ultima.peso_kg)} kg` : "—"}
          etiqueta={cambio === null ? "Peso actual" : `Peso actual · ${cambio > 0 ? "+" : ""}${coma(cambio)} kg`}
        />
        <Dato valor={ultima?.grasa_pct !== undefined ? `${String(ultima.grasa_pct).replace(".", ",")} %` : "—"} etiqueta="Grasa corporal" />
        <Dato valor={String(semana)} etiqueta="Entrenos en 7 días" />
        <Dato valor={String(racha(entrenos, hoy))} etiqueta="Días de racha" />
      </div>
      <section className="tarjeta flex flex-col gap-3">
        <h2 className="subtitulo">Últimos entrenos</h2>
        {recientes.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aún no has registrado entrenos.{" "}
            <Link href="/rutinas" className="font-bold text-orange-600">Empieza con una rutina</Link>.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {recientes.map((e, i) => (
              <li key={`${e.fecha}-${i}`} className="flex justify-between gap-3 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                <span>{e.rutina}</span>
                <span className="font-mono text-zinc-500">{e.fecha} · {e.hechos}/{e.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {usuario?.rol === "atleta" && !modoDemo && !usuario.entrenadorId && <Vinculo />}
      {usuario?.rol === "atleta" && <PerfilEntrenamiento usuario={usuario} />}
      {!ultima && usuario?.rol === "atleta" && (
        <p className="text-sm text-zinc-500">
          Registra tu primer peso en <Link href="/medidas" className="font-bold text-orange-600">Progreso</Link> para ver tu evolución.
        </p>
      )}
    </main>
  );
}
