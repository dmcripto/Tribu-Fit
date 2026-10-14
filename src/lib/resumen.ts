import type { Entreno, Marca, Medida } from "./types";

export const DIAS_CICLO = 90;
export const SEMANAS_TABLA = [1, 4, 8, 12] as const;

export type FilaResumen = {
  ejercicio: string;
  /** Mejor peso (kg) de las semanas 1, 4, 8 y 12 del ciclo. null = ese día no entrenó el ejercicio. */
  semanas: Record<number, number | null>;
  /** Mejor peso de cada semana en la que hay datos (para el gráfico). */
  porSemana: { semana: number; kg: number }[];
  inicio: number | null;
  fin: number | null;
  cambio: number | null;
  pct: number | null;
};

export type Resumen = {
  desde: string;
  hasta: string;
  /** Día del ciclo en el que está (1 a 90). */
  dia: number;
  completo: boolean;
  ciclo: number;
  ciclos: number;
  filas: FilaResumen[];
  entrenos: { hechos: number; planeados: number; pct: number };
  peso: { inicial: number; final: number } | null;
  fuerzaPct: number | null;
};

const MS = 86_400_000;
const dias = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / MS);
const sumar = (f: string, n: number) => new Date(Date.parse(f) + n * MS).toISOString().slice(0, 10);
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Resumen de 90 días: los ciclos cuentan desde el primer peso registrado. Para cada ejercicio toma el mejor peso
 * de cada semana y compara la primera semana con datos contra la última.
 */
export function resumenNoventaDias(o: {
  marcas: Marca[]; entrenos: Entreno[]; medidas: Medida[]; hoy: string; diasSemana?: number; ciclo?: number;
}): Resumen | null {
  const { marcas, entrenos, medidas, hoy } = o;
  const diasSemana = o.diasSemana && o.diasSemana > 0 ? o.diasSemana : 3;
  const validas = marcas.filter((m) => m.peso_kg > 0 && m.fecha <= hoy);
  if (!hoy || validas.length === 0) return null;
  const inicioTotal = validas.map((m) => m.fecha).sort()[0];
  const ciclos = Math.floor(dias(hoy, inicioTotal) / DIAS_CICLO) + 1;
  const ciclo = Math.min(Math.max(o.ciclo ?? ciclos, 1), ciclos);
  const desde = sumar(inicioTotal, (ciclo - 1) * DIAS_CICLO);
  const hasta = sumar(desde, DIAS_CICLO - 1);
  const tope = hoy < hasta ? hoy : hasta;
  const transcurridos = dias(tope, desde) + 1;

  const enVentana = validas.filter((m) => m.fecha >= desde && m.fecha <= hasta);
  const grupos = new Map<string, { nombre: string; semanas: Map<number, number> }>();
  for (const m of enVentana) {
    const k = norm(m.ejercicio);
    const g = grupos.get(k) ?? { nombre: m.ejercicio.trim(), semanas: new Map() };
    const sem = Math.min(12, Math.floor(dias(m.fecha, desde) / 7) + 1);
    g.semanas.set(sem, Math.max(g.semanas.get(sem) ?? 0, m.peso_kg));
    grupos.set(k, g);
  }

  const filas: FilaResumen[] = [...grupos.values()].map((g) => {
    const porSemana = [...g.semanas.entries()].sort((a, b) => a[0] - b[0]).map(([semana, kg]) => ({ semana, kg }));
    const inicio = porSemana[0]?.kg ?? null;
    const fin = porSemana.length >= 2 ? porSemana[porSemana.length - 1].kg : null;
    const cambio = inicio !== null && fin !== null ? r1(fin - inicio) : null;
    const pct = cambio !== null && inicio ? Math.round((cambio / inicio) * 100) : null;
    return {
      ejercicio: g.nombre,
      semanas: Object.fromEntries(SEMANAS_TABLA.map((s) => [s, g.semanas.get(s) ?? null])),
      porSemana, inicio, fin, cambio, pct,
    };
  }).sort((a, b) => a.ejercicio.localeCompare(b.ejercicio, "es"));

  const hechos = entrenos.filter((e) => e.fecha >= desde && e.fecha <= tope).length;
  const planeados = Math.max(1, Math.round((diasSemana * transcurridos) / 7));
  const ms = medidas.filter((m) => m.fecha >= desde && m.fecha <= tope).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const peso = ms.length >= 2 ? { inicial: ms[0].peso_kg, final: ms[ms.length - 1].peso_kg } : null;
  const pcts = filas.map((f) => f.pct).filter((p): p is number => p !== null);

  return {
    desde, hasta, dia: Math.min(DIAS_CICLO, transcurridos), completo: hoy >= hasta, ciclo, ciclos, filas,
    entrenos: { hechos, planeados, pct: Math.min(100, Math.round((hechos / planeados) * 100)) },
    peso,
    fuerzaPct: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
  };
}

/** Series que tiene un ejercicio de la rutina: «4 × 6» → 4. Si no se entiende, 3. */
export function seriesDe(texto: string): number {
  const m = /^\s*(\d{1,2})\s*[×xX*]/.exec(texto);
  const n = m ? Number(m[1]) : 3;
  return Math.min(Math.max(n, 1), 10);
}

/** Última vez que se hizo el ejercicio antes de `hoy`: fecha y mejor serie (más peso). */
export function ultimaVez(marcas: Marca[], ejercicio: string, hoy: string): { fecha: string; peso_kg: number; reps: number } | null {
  const k = norm(ejercicio);
  const previas = marcas.filter((m) => norm(m.ejercicio) === k && m.fecha < hoy);
  if (previas.length === 0) return null;
  const fecha = previas.map((m) => m.fecha).sort().at(-1)!;
  const mejor = previas.filter((m) => m.fecha === fecha).sort((a, b) => b.peso_kg - a.peso_kg || b.reps - a.reps)[0];
  return { fecha, peso_kg: mejor.peso_kg, reps: mejor.reps };
}

export const mismoEjercicio = (a: string, b: string) => norm(a) === norm(b);
