import Link from "next/link";
import { formatoFecha, type EstadoPremium } from "@/lib/datos";

/** Aviso del estado premium del alumno: bloqueado, en gracia o (opcional) activo. */
export default function PremiumAviso({
  estado, mostrarActivo = false, sinBoton = false,
}: { estado: EstadoPremium; mostrarActivo?: boolean; sinBoton?: boolean }) {
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
      <section role="status" className="flex flex-col items-start gap-2 rounded-xl border-2 border-red-600 p-4">
        <h2 className="text-xl font-black uppercase text-red-600">Seguimiento personalizado bloqueado</h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {estado.motivo === "vencido" && estado.vence
            ? `Tu cuota venció el ${formatoFecha(estado.vence)}. `
            : "Aún no tenemos un pago confirmado. "}
          Mientras tanto ves las rutinas generales y puedes seguir registrando tus medidas, comidas y entrenos. Paga tu cuota para recuperar tu plan y la atención de tu entrenador/a.
        </p>
        {!sinBoton && <Link href="/pagos" className="btn-primary">Ir a Pagos</Link>}
      </section>
    );
  }
  if (estado.motivo === "en_gracia" && estado.graciaHasta) {
    return (
      <section role="status" className="flex flex-col items-start gap-2 rounded-xl border-2 border-amber-500 p-4">
        <h2 className="text-xl font-black uppercase text-amber-700 dark:text-amber-400">Tu cuota venció</h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Tienes hasta el {formatoFecha(estado.graciaHasta)} para renovar. Después se pausará tu seguimiento personalizado.
        </p>
        {!sinBoton && <Link href="/pagos" className="btn-primary">Renovar ahora</Link>}
      </section>
    );
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
