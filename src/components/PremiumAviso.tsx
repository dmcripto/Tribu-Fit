"use client";

import Link from "next/link";
import { formatoFecha, type EstadoPremium } from "@/lib/datos";
import { useLocal, useToday } from "@/lib/store";

/** Días antes del vencimiento en que aparece el aviso amable. */
export const DIAS_AVISO_SUAVE = 7;
const CERRADOS_KEY = "tf_aviso_cuota_cerrado";
const VACIO: string[] = [];

const diasEntre = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

function cuandoVence(falta: number) {
  return falta <= 0 ? "hoy" : falta === 1 ? "mañana" : `en ${falta} días`;
}

/**
 * Aviso del estado premium del alumno. Tono amable: antes de vencer solo recuerda («cuando quieras»),
 * y si ya venció explica qué pasa y cómo volver, sin alarmas.
 * `avisoSuave` muestra el recordatorio previo al vencimiento (se puede cerrar por hoy).
 */
export default function PremiumAviso({
  estado, mostrarActivo = false, sinBoton = false, avisoSuave = false,
}: { estado: EstadoPremium; mostrarActivo?: boolean; sinBoton?: boolean; avisoSuave?: boolean }) {
  const hoy = useToday();
  const [cerrados, setCerrados] = useLocal<string[]>(CERRADOS_KEY, VACIO);

  if (estado.motivo === "bloqueado") {
    return (
      <section role="status" className="flex flex-col items-start gap-2 rounded-xl border-2 border-red-600 p-4">
        <h2 className="text-xl font-black uppercase text-red-600">Seguimiento personalizado bloqueado</h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Tu entrenador/a pausó tu acceso al plan y la nutrición personalizados. Habla con tu entrenador/a para reactivarlo.
        </p>
      </section>
    );
  }
  if (!estado.activo) {
    return (
      <section role="status" className="flex flex-col items-start gap-2 rounded-xl border border-amber-500/70 bg-amber-500/10 p-4">
        <h2 className="text-lg font-black">Tu seguimiento personalizado está en pausa</h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {estado.motivo === "vencido" && estado.vence
            ? `Tu cuota venció el ${formatoFecha(estado.vence)}. `
            : "Todavía no tenemos un pago confirmado. "}
          Mientras tanto sigues viendo las rutinas generales y puedes registrar tus medidas, comidas y entrenos. Cuando renueves tu cuota, vuelves a tener tu plan y la atención de tu entrenador/a.
        </p>
        {!sinBoton && <Link href="/pagos" className="btn-primary">Ir a Pagos</Link>}
      </section>
    );
  }
  if (estado.motivo === "en_gracia" && estado.graciaHasta) {
    return (
      <section role="status" className="flex flex-col items-start gap-2 rounded-xl border border-amber-500/70 bg-amber-500/10 p-4">
        <h2 className="text-lg font-black">Es momento de renovar tu cuota</h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Tu cuota ya venció, pero tienes hasta el {formatoFecha(estado.graciaHasta)} para renovarla sin perder nada de tu seguimiento.
        </p>
        {!sinBoton && <Link href="/pagos" className="btn-primary">Renovar cuota</Link>}
      </section>
    );
  }
  if (avisoSuave && estado.motivo === "al_dia" && estado.vence && hoy) {
    const falta = diasEntre(estado.vence, hoy);
    const clave = `${estado.vence}:${hoy}`;
    if (falta >= 0 && falta <= DIAS_AVISO_SUAVE && !cerrados.includes(clave)) {
      return (
        <section role="status" aria-label="Aviso de cuota" className="flex flex-col items-start gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 p-4">
          <h2 className="text-lg font-black">Tu cuota vence {cuandoVence(falta)}</h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Cuando quieras puedes renovarla{sinBoton ? " más abajo" : " desde Pagos"} y seguir entrenando sin cortes. ¡Gracias por ser parte de la tribu!
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {!sinBoton && <Link href="/pagos" className="btn-primary">Renovar cuota</Link>}
            <button type="button" className="text-sm font-bold text-zinc-500 underline" onClick={() => setCerrados((p) => [...p.slice(-30), clave])}>
              Recordármelo mañana
            </button>
          </div>
        </section>
      );
    }
  }
  if (mostrarActivo && (estado.motivo === "al_dia" || estado.motivo === "cortesia")) {
    return (
      <p className="text-sm text-green-700 dark:text-green-400">
        Premium activo{estado.motivo === "cortesia" ? " (cortesía de tu entrenador/a)" : estado.vence ? ` hasta el ${formatoFecha(estado.vence)}` : ""}.
      </p>
    );
  }
  return null;
}
