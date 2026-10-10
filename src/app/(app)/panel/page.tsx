"use client";

import Link from "next/link";
import { useUsuario } from "@/components/AppShell";
import {
  ENTRENOS_KEY, MEDIDAS_KEY, VACIO_ENTRENOS, VACIO_MEDIDAS, entrenosSemana, racha,
} from "@/lib/datos";
import { useLocal, useToday } from "@/lib/store";

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="tarjeta">
      <div className="text-4xl font-black tabular-nums">{valor}</div>
      <div className="mt-1 text-xs text-zinc-500">{etiqueta}</div>
    </div>
  );
}

export default function Panel() {
  const usuario = useUsuario();
  const hoy = useToday();
  const [medidas] = useLocal(MEDIDAS_KEY, VACIO_MEDIDAS);
  const [entrenos] = useLocal(ENTRENOS_KEY, VACIO_ENTRENOS);

  const orden = [...medidas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const ultima = orden[orden.length - 1];
  const cambio = ultima && orden.length > 1 ? ultima.peso_kg - orden[0].peso_kg : null;
  const semana = entrenosSemana(entrenos, hoy);
  const recientes = [...entrenos].reverse().slice(0, 5);

  return (
    <main className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          {usuario?.objetivo || "Tu progreso"}
        </p>
        <h1 className="text-5xl font-black uppercase leading-none">
          Hola, {usuario?.nombre}
        </h1>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Dato
          valor={ultima ? `${ultima.peso_kg.toFixed(1).replace(".", ",")} kg` : "—"}
          etiqueta={cambio === null ? "Peso actual" : `Peso actual · ${cambio > 0 ? "+" : ""}${cambio.toFixed(1).replace(".", ",")} kg`}
        />
        <Dato valor={ultima?.grasa_pct !== undefined ? `${ultima.grasa_pct} %` : "—"} etiqueta="Grasa corporal" />
        <Dato valor={String(semana)} etiqueta="Entrenos en 7 días" />
        <Dato valor={String(racha(entrenos, hoy))} etiqueta="Días de racha" />
      </div>
      <section className="tarjeta flex flex-col gap-3">
        <h2 className="text-2xl font-black uppercase">Últimos entrenos</h2>
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
      {!ultima && (
        <p className="text-sm text-zinc-500">
          Registra tu primer peso en <Link href="/medidas" className="font-bold text-orange-600">Medidas</Link> para ver tu evolución.
        </p>
      )}
    </main>
  );
}
