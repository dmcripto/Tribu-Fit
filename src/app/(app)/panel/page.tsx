"use client";

import Link from "next/link";
import Icono, { type NombreIcono } from "@/components/Iconos";
import { useState } from "react";
import { useUsuario } from "@/components/AppShell";
import { entrenosSemana, racha } from "@/lib/datos";
import { AVISO_KEY, vincularEntrenador } from "@/lib/auth";
import PerfilEntrenamiento from "@/components/PerfilEntrenamiento";
import PremiumAviso from "@/components/PremiumAviso";
import { useEntrenos, useMedidas, usePerfil, usePremium } from "@/lib/repo";
import { modoDemo } from "@/lib/supabase";
import { useCliente, useLocal, useToday } from "@/lib/store";
import { useRecordatorios } from "@/lib/recordatorios";
import { useRecordatoriosLeidos } from "@/lib/comunidad";

const TONOS = {
  naranja: "from-orange-500 to-red-600 shadow-orange-600/30",
  ambar: "from-amber-400 to-orange-500 shadow-amber-500/30",
  rosa: "from-rose-500 to-pink-600 shadow-rose-500/30",
  verde: "from-emerald-500 to-teal-600 shadow-emerald-600/30",
} as const;

function Dato({ valor, etiqueta, icono, tono }: { valor: string; etiqueta: string; icono: NombreIcono; tono: keyof typeof TONOS }) {
  return (
    <div className="tarjeta flex flex-col gap-3">
      <span className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${TONOS[tono]}`}>
        <Icono nombre={icono} className="size-5" />
      </span>
      <div>
        <div className="text-3xl font-black tabular-nums leading-none">{valor}</div>
        <div className="mt-1.5 text-xs text-zinc-500">{etiqueta}</div>
      </div>
    </div>
  );
}

/** Anillo de avance de la semana: entrenos hechos frente a los que planeaste. */
function Anillo({ hechos, meta }: { hechos: number; meta: number }) {
  const r = 34, c = 2 * Math.PI * r;
  const pct = Math.min(1, hechos / Math.max(meta, 1));
  return (
    <div className="relative size-24 shrink-0" role="img" aria-label={`${hechos} de ${meta} entrenos esta semana`}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="9" className="stroke-orange-500/15" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className="stroke-orange-500 transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-2xl font-black tabular-nums">{hechos}</span>
        <span className="text-[10px] text-zinc-500">de {meta}</span>
      </div>
    </div>
  );
}

function saludo(h: number) {
  return h < 6 ? "Buenas noches" : h < 13 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches";
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
  const { perfil } = usePerfil(usuario);
  const hora = useCliente(() => new Date().getHours(), 12);
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
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-orange-600">
            {saludo(hora)} · {usuario?.rol === "entrenador" ? "Entrenador/a" : usuario?.objetivo || "Tu progreso"}
          </p>
          <h1 className="titulo mt-1">
            Hola, {usuario?.nombre}
          </h1>
        </div>
        {usuario?.rol === "atleta" && <Anillo hechos={semana} meta={perfil?.dias_semana ?? 3} />}
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
          icono="peso" tono="naranja"
        />
        <Dato valor={ultima?.grasa_pct !== undefined ? `${String(ultima.grasa_pct).replace(".", ",")} %` : "—"} etiqueta="Grasa corporal" icono="grasa" tono="rosa" />
        <Dato valor={String(semana)} etiqueta="Entrenos en 7 días" icono="rayo" tono="ambar" />
        <Dato valor={String(racha(entrenos, hoy))} etiqueta="Días de racha" icono="fuego" tono="verde" />
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
