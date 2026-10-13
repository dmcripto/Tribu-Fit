import { racha, sumarDias } from "./datos";
import type { Alumno, Entreno, FotoProgreso, Marca, Medida } from "./types";

export type Insignia = { id: string; titulo: string; detalle: string; lograda: boolean; progreso?: string };

/** Insignias que se ganan solas a partir de lo que la persona ya registra. */
export function insignias(d: { entrenos: Entreno[]; medidas: Medida[]; marcas: Marca[]; fotos: FotoProgreso[]; hoy: string }): Insignia[] {
  const { entrenos, medidas, marcas, fotos, hoy } = d;
  const total = entrenos.length;
  const mejorRacha = mayorRacha(entrenos);
  const act = racha(entrenos, hoy);
  const prog = (n: number, meta: number) => `${Math.min(n, meta)}/${meta}`;
  return [
    { id: "primer", titulo: "Primer paso", detalle: "Registra tu primer entreno", lograda: total >= 1 },
    { id: "diez", titulo: "Constante", detalle: "10 entrenos registrados", lograda: total >= 10, progreso: prog(total, 10) },
    { id: "cincuenta", titulo: "Imparable", detalle: "50 entrenos registrados", lograda: total >= 50, progreso: prog(total, 50) },
    { id: "cien", titulo: "Leyenda de la tribu", detalle: "100 entrenos registrados", lograda: total >= 100, progreso: prog(total, 100) },
    { id: "racha3", titulo: "Racha de 3", detalle: "3 días seguidos entrenando", lograda: Math.max(mejorRacha, act) >= 3, progreso: prog(Math.max(mejorRacha, act), 3) },
    { id: "racha7", titulo: "Semana perfecta", detalle: "7 días seguidos entrenando", lograda: Math.max(mejorRacha, act) >= 7, progreso: prog(Math.max(mejorRacha, act), 7) },
    { id: "peso", titulo: "Con los números claros", detalle: "5 registros de peso", lograda: medidas.length >= 5, progreso: prog(medidas.length, 5) },
    { id: "marca", titulo: "Rompe marcas", detalle: "Registra 3 marcas de ejercicios", lograda: marcas.length >= 3, progreso: prog(marcas.length, 3) },
    { id: "foto", titulo: "Antes y después", detalle: "Sube 2 fotos de progreso", lograda: fotos.length >= 2, progreso: prog(fotos.length, 2) },
  ];
}

/** Mayor cantidad de días seguidos con entreno en todo el historial. */
export function mayorRacha(entrenos: Entreno[]) {
  const dias = [...new Set(entrenos.map((e) => e.fecha))].sort();
  let mejor = 0, actual = 0, prev = "";
  for (const f of dias) {
    actual = prev && Date.parse(f) - Date.parse(prev) === 86_400_000 ? actual + 1 : 1;
    mejor = Math.max(mejor, actual);
    prev = f;
  }
  return mejor;
}

/** Progreso de un alumno en un reto: entrenos distintos en el rango. */
export function progresoReto(entrenos: Entreno[], desde: string, hasta: string) {
  return entrenos.filter((e) => e.fecha >= desde && e.fecha <= hasta).length;
}

/** Estimación de 1RM (fórmula de Epley). */
export function unRM(peso: number, reps: number) {
  return reps <= 1 ? peso : peso * (1 + reps / 30);
}

/** Mejor marca (por 1RM estimado) de cada ejercicio. */
export function mejoresMarcas(marcas: Marca[]) {
  const m = new Map<string, Marca>();
  for (const x of marcas) {
    const a = m.get(x.ejercicio);
    if (!a || unRM(x.peso_kg, x.reps) > unRM(a.peso_kg, a.reps)) m.set(x.ejercicio, x);
  }
  return [...m.values()].sort((a, b) => a.ejercicio.localeCompare(b.ejercicio));
}

/* ---------- Alertas para la entrenadora ---------- */

export type Alerta = { alumno_id: string; nombre: string; tipo: "inactivo" | "sin_peso" | "estancado" | "sin_permiso" | "pago" | "chequeo"; texto: string; gravedad: 1 | 2 };

const dif = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

/** Detecta a quién atender primero. Un alumno puede tener varias alertas. */
export function alertasEntrenador(alumnos: Alumno[], hoy: string, bloqueados: Set<string>, chequeos: Record<string, string> = {}): Alerta[] {
  if (!hoy) return [];
  const out: Alerta[] = [];
  for (const a of alumnos) {
    const base = { alumno_id: a.id, nombre: a.nombre };
    if (bloqueados.has(a.id)) out.push({ ...base, tipo: "pago", texto: "Su seguimiento premium está bloqueado (pago pendiente o vencido).", gravedad: 2 });
    if (!a.permiso) { out.push({ ...base, tipo: "sin_permiso", texto: "No comparte su progreso contigo.", gravedad: 1 }); continue; }
    const ch = estadoChequeo(chequeos[a.id], hoy);
    if (ch.estado === "vencido") out.push({ ...base, tipo: "chequeo", texto: `Su chequeo mensual con fotos lleva ${ch.dias} días sin hacerse.`, gravedad: 1 });
    else if (ch.estado === "sin" && Object.keys(chequeos).length > 0) out.push({ ...base, tipo: "chequeo", texto: "Aún no subió fotos de chequeo.", gravedad: 1 });
    const ult = a.entrenos.map((e) => e.fecha).sort().at(-1);
    const sin = ult ? dif(hoy, ult) : null;
    if (sin === null) out.push({ ...base, tipo: "inactivo", texto: "Todavía no registra ningún entreno.", gravedad: 1 });
    else if (sin > 7) out.push({ ...base, tipo: "inactivo", texto: `Lleva ${sin} días sin entrenar.`, gravedad: 2 });
    const um = [...a.medidas].sort((x, y) => x.fecha.localeCompare(y.fecha)).at(-1);
    if (um && dif(hoy, um.fecha) > 21) out.push({ ...base, tipo: "sin_peso", texto: `No registra su peso hace ${dif(hoy, um.fecha)} días.`, gravedad: 1 });
    // Estancado: peso casi igual en las últimas 4 semanas con objetivo de cambiarlo.
    const rec = a.medidas.filter((m) => dif(hoy, m.fecha) <= 28).sort((x, y) => x.fecha.localeCompare(y.fecha));
    if (rec.length >= 3 && /perder|grasa|ganar|musculo|músculo|volumen/i.test(a.objetivo ?? "")) {
      const cambio = Math.abs(rec[rec.length - 1].peso_kg - rec[0].peso_kg);
      if (cambio < 0.3) out.push({ ...base, tipo: "estancado", texto: "Su peso no se mueve en 4 semanas: revisa su plan.", gravedad: 1 });
    }
  }
  return out.sort((x, y) => y.gravedad - x.gravedad || x.nombre.localeCompare(y.nombre));
}

/** Resumen de la semana de toda la tribu de la entrenadora. */
export function resumenSemanal(alumnos: Alumno[], hoy: string) {
  const con = alumnos.filter((a) => a.permiso);
  const entrenos = con.reduce((n, a) => n + a.entrenos.filter((e) => dif(hoy, e.fecha) >= 0 && dif(hoy, e.fecha) < 7).length, 0);
  const activos = con.filter((a) => a.entrenos.some((e) => dif(hoy, e.fecha) >= 0 && dif(hoy, e.fecha) < 7)).length;
  return { alumnos: alumnos.length, visibles: con.length, entrenos, activos, pctActivos: con.length ? Math.round((activos / con.length) * 100) : 0 };
}

/* ---------- Chequeo mensual ---------- */

export const CICLO_CHEQUEO = 30;
export type EstadoChequeo = { estado: "sin" | "al_dia" | "pronto" | "toca" | "vencido"; dias: number | null; proximo: string | null };

/** Cada 30 días toca un chequeo con fotos. Pasados 5 días de ese plazo se considera vencido. */
export function estadoChequeo(ultima: string | null | undefined, hoy: string): EstadoChequeo {
  if (!hoy) return { estado: "al_dia", dias: null, proximo: null };
  if (!ultima) return { estado: "sin", dias: null, proximo: null };
  const dias = dif(hoy, ultima);
  const estado = dias < CICLO_CHEQUEO - 5 ? "al_dia" : dias < CICLO_CHEQUEO ? "pronto" : dias < CICLO_CHEQUEO + 5 ? "toca" : "vencido";
  return { estado, dias, proximo: sumarDias(ultima, CICLO_CHEQUEO) };
}
