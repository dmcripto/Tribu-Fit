"use client";

import { useMemo } from "react";
import { formatoFecha, sumarDias } from "./datos";
import { useFotos, useRetos } from "./comunidad";
import { estadoChequeo, progresoReto } from "./logros";
import { useComidas, useEntrenos, useMedidas, usePagos, usePremium, usePropuestasPendientes } from "./repo";
import { useToday } from "./store";
import type { Usuario } from "./types";

export type Recordatorio = { id: string; titulo: string; texto: string; enlace: string; urgente?: boolean };

const dias = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

/** Recordatorios del día, calculados con los datos de la persona (no se envían: se muestran al abrir la app). */
export function useRecordatorios(yo: Usuario | null): Recordatorio[] {
  const hoy = useToday();
  const uid = yo?.id ?? "";
  const esAlumno = yo?.rol === "atleta";
  const { entrenos } = useEntrenos(esAlumno ? uid : "");
  const { medidas } = useMedidas(esAlumno ? uid : "");
  const { comidas } = useComidas(esAlumno ? uid : "");
  const { fotos } = useFotos(esAlumno ? uid : "");
  const premium = usePremium(yo);
  const { retos } = useRetos(yo);
  const propuestas = usePropuestasPendientes(yo);
  const { pagos } = usePagos(yo);

  return useMemo(() => {
    if (!yo || !hoy) return [];
    const out: Recordatorio[] = [];
    if (yo.rol === "entrenador") {
      if (propuestas > 0) out.push({ id: `r-prop-${hoy}`, titulo: `${propuestas} propuesta${propuestas === 1 ? "" : "s"} por revisar`, texto: "El sistema las preparó con los datos de tus alumnos. Apruébalas o edítalas.", enlace: "/propuestas" });
      const porConfirmar = pagos.filter((p) => p.estado === "pendiente").length;
      if (porConfirmar > 0) out.push({ id: `r-pagos-${hoy}`, titulo: `${porConfirmar} pago${porConfirmar === 1 ? "" : "s"} por confirmar`, texto: "Tus alumnos avisaron que pagaron.", enlace: "/pagos", urgente: true });
      return out;
    }
    if (!entrenos.some((e) => e.fecha === hoy)) out.push({ id: `r-entreno-${hoy}`, titulo: "Hoy aún no registras tu entreno", texto: "Elige tu rutina y márcala al terminar.", enlace: "/rutinas" });
    const ultPeso = [...medidas].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
    if (!ultPeso || dias(hoy, ultPeso.fecha) >= 7) out.push({ id: `r-peso-${hoy}`, titulo: "Toca registrar tu peso", texto: ultPeso ? `Tu último registro fue el ${formatoFecha(ultPeso.fecha)}.` : "Aún no tienes ningún registro.", enlace: "/medidas" });
    if (new Date().getHours() >= 13 && !comidas.some((c) => c.fecha === hoy)) out.push({ id: `r-comida-${hoy}`, titulo: "Registra lo que has comido hoy", texto: "¿Sin ideas? Mira las recetas sugeridas para ti.", enlace: "/recetas" });
    const ch = estadoChequeo(fotos.map((f) => f.fecha).sort().at(-1), hoy);
    if (ch.estado === "sin") out.push({ id: `r-chequeo-${hoy}`, titulo: "Haz tu primer chequeo con fotos", texto: "Frente, perfil izquierdo, perfil derecho y espalda: así vas a poder ver tu cambio mes a mes.", enlace: "/medidas" });
    else if (ch.estado === "toca" || ch.estado === "vencido") out.push({ id: `r-chequeo-${ch.proximo}`, titulo: "Toca tu chequeo mensual", texto: `Pasaron ${ch.dias} días desde tu último chequeo con fotos.`, enlace: "/medidas", urgente: ch.estado === "vencido" });
    else if (ch.estado === "pronto") out.push({ id: `r-chequeo-${ch.proximo}`, titulo: "Se acerca tu chequeo mensual", texto: `Te toca el ${formatoFecha(ch.proximo!)}. Prepara buena luz y la misma ropa.`, enlace: "/medidas" });
    if (!premium.activo && premium.motivo !== "libre") out.push({ id: `r-premium-${hoy}`, titulo: "Tu seguimiento personalizado está bloqueado", texto: "Paga tu cuota para recuperar tu plan.", enlace: "/pagos", urgente: true });
    else if (premium.activo && premium.vence && premium.motivo === "al_dia" && dias(premium.vence, hoy) <= 3)
      out.push({ id: `r-cuota-${premium.vence}`, titulo: "Tu cuota está por vencer", texto: `Vence el ${formatoFecha(premium.vence)}.`, enlace: "/pagos", urgente: true });
    else if (premium.motivo === "en_gracia" && premium.vence)
      out.push({ id: `r-gracia-${premium.vence}`, titulo: "Tu cuota venció", texto: `Tienes gracia hasta el ${formatoFecha(premium.graciaHasta ?? sumarDias(premium.vence, 3))}.`, enlace: "/pagos", urgente: true });
    for (const r of retos.filter((x) => x.desde <= hoy && x.hasta >= hoy)) {
      const n = progresoReto(entrenos, r.desde, r.hasta);
      if (n < r.meta_entrenos) out.push({ id: `r-reto-${r.id}-${hoy}`, titulo: `Reto «${r.titulo}»: ${n}/${r.meta_entrenos}`, texto: `Te quedan ${dias(r.hasta, hoy)} días.`, enlace: "/retos" });
    }
    return out;
  }, [yo, hoy, entrenos, medidas, comidas, fotos, premium, retos, propuestas, pagos]);
}
