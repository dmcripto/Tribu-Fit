import type { Entreno, Medida } from "./types";

export const MEDIDAS_KEY = "tf_medidas";
export const ENTRENOS_KEY = "tf_entrenos";
export const VACIO_MEDIDAS: Medida[] = [];
export const VACIO_ENTRENOS: Entreno[] = [];

export type Rutina = {
  nombre: string;
  detalle: string;
  ejercicios: { nombre: string; series: string; carga: string }[];
};

export const RUTINAS: Rutina[] = [
  {
    nombre: "Empuje · pecho y hombro",
    detalle: "Lunes · 55 min",
    ejercicios: [
      { nombre: "Press banca", series: "4 × 6", carga: "80 kg" },
      { nombre: "Press militar", series: "3 × 8", carga: "40 kg" },
      { nombre: "Fondos", series: "3 × 10", carga: "Peso corporal" },
      { nombre: "Elevaciones laterales", series: "3 × 12", carga: "10 kg" },
    ],
  },
  {
    nombre: "Tirón · espalda y bíceps",
    detalle: "Martes · 50 min",
    ejercicios: [
      { nombre: "Dominadas", series: "4 × 6", carga: "Peso corporal" },
      { nombre: "Remo con barra", series: "4 × 8", carga: "70 kg" },
      { nombre: "Face pull", series: "3 × 15", carga: "25 kg" },
      { nombre: "Curl con barra", series: "3 × 10", carga: "30 kg" },
    ],
  },
  {
    nombre: "Pierna",
    detalle: "Jueves · 60 min",
    ejercicios: [
      { nombre: "Sentadilla", series: "5 × 5", carga: "105 kg" },
      { nombre: "Peso muerto rumano", series: "3 × 8", carga: "90 kg" },
      { nombre: "Prensa", series: "3 × 12", carga: "180 kg" },
      { nombre: "Elevación de gemelos", series: "4 × 15", carga: "60 kg" },
    ],
  },
];

function dias(a: string, b: string) {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

/** Días seguidos con entreno, contando hacia atrás desde hoy (o ayer). */
export function racha(entrenos: Entreno[], hoy: string) {
  if (!hoy) return 0;
  const fechas = new Set(entrenos.map((e) => e.fecha));
  let d = fechas.has(hoy) ? hoy : new Date(Date.parse(hoy) - 86_400_000).toISOString().slice(0, 10);
  let n = 0;
  while (fechas.has(d)) {
    n++;
    d = new Date(Date.parse(d) - 86_400_000).toISOString().slice(0, 10);
  }
  return n;
}

export function entrenosSemana(entrenos: Entreno[], hoy: string) {
  if (!hoy) return 0;
  return entrenos.filter((e) => dias(hoy, e.fecha) >= 0 && dias(hoy, e.fecha) < 7).length;
}
