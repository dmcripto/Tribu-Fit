import type { Comida, Entreno, Medida, Metodo, ObjetivoNutricion, Pago, PerfilFitness, PremiumModo, Propuesta } from "./types";

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

export const PLANES_KEY = "tf_planes";

export type SemanaPlan = { semana: number; rutinas: Rutina[] };
export type Plan = {
  id: string;
  alumno_id: string;
  nombre: string;
  fecha_inicio: string;
  semanas: SemanaPlan[];
};
export const VACIO_PLANES: Plan[] = [];

export function sumarDias(fecha: string, n: number) {
  return new Date(Date.parse(fecha) + n * 86_400_000).toISOString().slice(0, 10);
}

/** AAAA-MM-DD a DD/MM/AAAA. */
export function formatoFecha(f: string) {
  const [a, m, d] = f.split("-");
  return `${d}/${m}/${a}`;
}

/** Semana del plan que toca hoy: 0 si aún no empieza, tope en la última. */
export function semanaActual(plan: Plan, hoy: string) {
  if (!hoy) return 0;
  const d = dias(hoy, plan.fecha_inicio);
  if (d < 0) return 0;
  return Math.min(Math.floor(d / 7) + 1, plan.semanas.length);
}

export function planTerminado(plan: Plan, hoy: string) {
  return !!hoy && dias(hoy, plan.fecha_inicio) >= plan.semanas.length * 7;
}

export type Estado = "al_dia" | "revisar" | "riesgo";

/** Estado de seguimiento según días sin entrenar. */
export function estadoAlumno(entrenos: Entreno[], hoy: string) {
  if (!hoy) return { estado: "al_dia" as Estado, ultimo: null, desde: null };
  const ultimo = entrenos.map((e) => e.fecha).sort().at(-1) ?? null;
  const desde = ultimo === null ? null : dias(hoy, ultimo);
  const estado: Estado =
    desde === null || desde > 7 ? "riesgo" : desde >= 4 ? "revisar" : "al_dia";
  return { estado, ultimo, desde };
}

/* ---------- Nutrición ---------- */

export const COMIDAS_KEY = "tf_comidas";
export const AGUA_KEY = "tf_agua";
export const NUTRI_KEY = "tf_nutricion";
export const VACIO_COMIDAS: Comida[] = [];
export const VACIO_AGUA: Record<string, number> = {};
export const VACIO_NUTRI: Record<string, ObjetivoNutricion> = {};

/** Estimación orientativa a partir del peso y el objetivo. No sustituye un plan profesional. */
export function estimarObjetivo(peso: number | undefined, objetivo: string): ObjetivoNutricion {
  const kg = peso && peso > 30 ? peso : 70;
  const o = objetivo.toLowerCase();
  const musculo = o.includes("músculo") || o.includes("musculo");
  let kcal = kg * 30;
  if (o.includes("grasa")) kcal -= 400;
  else if (musculo) kcal += 300;
  kcal = Math.round(kcal / 50) * 50;
  const proteina = Math.round(kg * (musculo ? 2 : 1.8));
  const grasas = Math.round(kg * 0.9);
  const carbos = Math.max(0, Math.round((kcal - proteina * 4 - grasas * 9) / 4));
  return { kcal, proteina, carbos, grasas, agua: 8, notas: "" };
}

export function totalesDia(comidas: Comida[], fecha: string) {
  const del = comidas.filter((c) => c.fecha === fecha);
  const suma = (k: "kcal" | "proteina" | "carbos" | "grasas") => del.reduce((s, c) => s + c[k], 0);
  return { kcal: suma("kcal"), proteina: suma("proteina"), carbos: suma("carbos"), grasas: suma("grasas") };
}

/** Media diaria de los últimos `ventana` días en los que registró comidas. */
export function promedioNutricion(comidas: Comida[], hoy: string, ventana = 7) {
  if (!hoy) return null;
  const dentro = comidas.filter((c) => dias(hoy, c.fecha) >= 0 && dias(hoy, c.fecha) < ventana);
  const fechas = [...new Set(dentro.map((c) => c.fecha))];
  if (fechas.length === 0) return null;
  const total = (k: "kcal" | "proteina") => dentro.reduce((s, c) => s + c[k], 0);
  return {
    dias: fechas.length,
    kcal: Math.round(total("kcal") / fechas.length),
    proteina: Math.round(total("proteina") / fechas.length),
  };
}

/* ---------- Pagos ---------- */

export const PAGO_CONFIG_KEY = "tf_pago_config";
export const PAGOS_KEY = "tf_pagos";
export const VACIO_PAGOS: Pago[] = [];

export const METODOS: Record<Metodo, string> = {
  mercadopago: "Mercado Pago",
  tarjeta: "Tarjeta de débito o crédito",
  qr: "QR",
  transferencia: "Transferencia",
  efectivo: "Efectivo",
};

/** Un enlace de pago solo se acepta si es https (evita enlaces peligrosos). */
export function enlaceSeguro(url: string) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** Una imagen subida solo se muestra si es una imagen en data URL. */
export const esImagen = (s: string | undefined): s is string => !!s && s.startsWith("data:image/");

export type EstadoCuota = "sin_pagos" | "al_dia" | "por_vencer" | "vencida";

/** Estado de la cuota según el último pago confirmado. */
export function estadoCuota(pagos: Pago[], hoy: string) {
  const vence = pagos.filter((p) => p.estado === "confirmado" && p.vence).map((p) => p.vence as string).sort().at(-1) ?? null;
  if (!hoy) return { estado: "al_dia" as EstadoCuota, vence };
  if (!vence) return { estado: "sin_pagos" as EstadoCuota, vence };
  const d = dias(vence, hoy);
  return { estado: (d < 0 ? "vencida" : d <= 5 ? "por_vencer" : "al_dia") as EstadoCuota, vence };
}

/** Nuevo vencimiento al confirmar: 30 días desde hoy o desde el vencimiento actual, lo que sea mayor. */
export function siguienteVencimiento(pagos: Pago[], hoy: string) {
  const { vence } = estadoCuota(pagos, hoy);
  const base = vence && vence > hoy ? vence : hoy;
  return sumarDias(base, 30);
}

/* ---------- Premium ---------- */

export const PREMIUM_EXC_KEY = "tf_premium_exc";
export const VACIO_EXC: Record<string, PremiumModo> = {};
export const GRACIA_POR_DEFECTO = 3;

export type PremiumMotivo =
  | "libre" | "cortesia" | "bloqueado" | "al_dia" | "en_gracia" | "vencido" | "sin_pagos";

export type EstadoPremium = {
  activo: boolean;
  motivo: PremiumMotivo;
  vence: string | null;
  graciaHasta: string | null;
};

/**
 * Mismas reglas que la función premium_activo de la base de datos:
 * sin entrenadora que cobre, o con cortesía, está activo; bloqueado, no; y si no,
 * hace falta un pago confirmado cuyo vencimiento más los días de gracia no haya pasado.
 */
export function estadoPremium(o: {
  pagos: Pago[];
  cobra: boolean;
  gracia: number;
  excepcion?: PremiumModo | null;
  hoy: string;
}): EstadoPremium {
  const { vence } = estadoCuota(o.pagos, o.hoy);
  const graciaHasta = vence ? sumarDias(vence, o.gracia) : null;
  const r = (activo: boolean, motivo: PremiumMotivo): EstadoPremium => ({ activo, motivo, vence, graciaHasta });
  if (o.excepcion === "bloqueado") return r(false, "bloqueado");
  if (o.excepcion === "cortesia") return r(true, "cortesia");
  if (!o.cobra || !o.hoy) return r(true, "libre");
  if (!vence) return r(false, "sin_pagos");
  const d = dias(vence, o.hoy);
  if (d >= 0) return r(true, "al_dia");
  if (-d <= o.gracia) return r(true, "en_gracia");
  return r(false, "vencido");
}

export const PREMIUM_TEXTO: Record<PremiumMotivo, string> = {
  libre: "Activo",
  cortesia: "Activo (cortesía)",
  bloqueado: "Bloqueado",
  al_dia: "Activo",
  en_gracia: "En gracia",
  vencido: "Bloqueado: cuota vencida",
  sin_pagos: "Bloqueado: sin pagos",
};

/* ---------- Perfil y propuestas automáticas ---------- */

export const PERFILES_KEY = "tf_perfiles";
export const PROPUESTAS_KEY = "tf_propuestas";
export const VACIO_PERFILES: Record<string, PerfilFitness> = {};
export const VACIO_PROPUESTAS: Propuesta[] = [];

/** Días que una propuesta rechazada o aprobada frena que se genere otra igual. */
export const DIAS_SIN_REPETIR = { rechazada: 7, aprobada: 14 };

/** Resumen de una línea del contenido de una propuesta. */
export function resumenPropuesta(p: Propuesta): string {
  if (p.tipo === "nutricion") {
    const c = p.contenido;
    return `${c.kcal} kcal · proteína ${c.proteina} g · carbohidratos ${c.carbos} g · grasas ${c.grasas} g`;
  }
  const s1 = p.contenido.semanas[0]?.rutinas ?? [];
  return `${p.contenido.semanas.length} semanas · ${s1.length} sesiones por semana · ${s1.map((r) => r.nombre).join(", ")}`;
}
