/**
 * Motor de propuestas automáticas.
 *
 * A partir de los datos de un alumno genera un borrador de plan de rutinas y de objetivo de
 * nutrición. Son reglas fijas y explicables, sin inteligencia artificial: cada propuesta
 * incluye las razones y los avisos, y siempre la revisa una persona antes de llegar al alumno.
 *
 * Archivo autocontenido (solo importa tipos) para poder probarlo aparte.
 */
import type { Comida, ContenidoRutinas, Entreno, Medida, ObjetivoNutricion, PerfilFitness } from "./types";

export type DatosAlumno = {
  nombre: string;
  /** Objetivo en texto libre: "Perder grasa", "Ganar músculo", "Correr más"... */
  objetivo: string;
  /** "Principiante" | "Intermedio" | "Avanzado" */
  nivel: string;
  perfil: PerfilFitness | null;
  medidas: Medida[];
  entrenos: Entreno[];
  comidas: Comida[];
  /** Fecha de hoy, AAAA-MM-DD. */
  hoy: string;
};

export type Resultado<T> = { contenido: T; razones: string[]; avisos: string[] };

type Meta = "grasa" | "musculo" | "correr" | "activo";
type Zona = "rodilla" | "hombro" | "espalda" | "muneca";
type Patron =
  | "sent" | "bisag" | "uni" | "glut" | "emp_h" | "emp_v" | "tir_h" | "tir_v"
  | "biceps" | "triceps" | "delt_lat" | "delt_post" | "pant" | "core";

const MS_DIA = 86_400_000;
const dias = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / MS_DIA);
const redondea = (n: number, paso: number) => Math.round(n / paso) * paso;
const entre = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function metaDe(objetivo: string): Meta {
  const o = objetivo.toLowerCase();
  if (o.includes("grasa") || o.includes("peso") || o.includes("adelg")) return "grasa";
  if (o.includes("músculo") || o.includes("musculo") || o.includes("fuerza")) return "musculo";
  if (o.includes("correr") || o.includes("running") || o.includes("resistencia")) return "correr";
  return "activo";
}

const ETIQUETA_META: Record<Meta, string> = {
  grasa: "perder grasa", musculo: "ganar músculo", correr: "correr más", activo: "estar activo",
};

function nivelDe(nivel: string): 1 | 2 | 3 {
  const n = nivel.toLowerCase();
  if (n.startsWith("princ")) return 1;
  if (n.startsWith("avanz")) return 3;
  return 2;
}

/** Zonas con molestias que el alumno menciona en texto libre. */
export function zonasDe(texto: string): Zona[] {
  const t = texto.toLowerCase();
  const z: Zona[] = [];
  if (/rodill|menisc|ligamento cruzado/.test(t)) z.push("rodilla");
  if (/hombr|manguito|clavícula|clavicula/.test(t)) z.push("hombro");
  if (/espald|lumbar|columna|hernia|ci[aá]tic|dorsal/.test(t)) z.push("espalda");
  if (/mu[ñn]eca|carpo|codo/.test(t)) z.push("muneca");
  return z;
}

/* ---------------- Catálogo de ejercicios ---------------- */

type Ej = { n: string; lugar: "ambos" | "casa" | "gym"; evita?: Zona[] };

const CATALOGO: Record<Patron, Ej[]> = {
  sent: [
    { n: "Sentadilla con barra", lugar: "gym", evita: ["rodilla", "espalda"] },
    { n: "Prensa de piernas", lugar: "gym" },
    { n: "Sentadilla goblet con mancuerna", lugar: "ambos", evita: ["rodilla"] },
    { n: "Sentadilla a la silla", lugar: "ambos" },
    { n: "Sentadilla libre", lugar: "casa", evita: ["rodilla"] },
  ],
  bisag: [
    { n: "Peso muerto rumano con barra", lugar: "gym", evita: ["espalda"] },
    { n: "Peso muerto rumano con mancuernas", lugar: "ambos", evita: ["espalda"] },
    { n: "Curl femoral tumbado", lugar: "gym" },
    { n: "Curl femoral con toalla", lugar: "casa" },
    { n: "Puente de glúteo a una pierna", lugar: "casa" },
  ],
  uni: [
    { n: "Zancadas caminando", lugar: "ambos", evita: ["rodilla"] },
    { n: "Sentadilla búlgara", lugar: "ambos", evita: ["rodilla"] },
    { n: "Subida al cajón", lugar: "ambos", evita: ["rodilla"] },
    { n: "Extensión de cadera en polea", lugar: "gym" },
    { n: "Puente de glúteo a una pierna", lugar: "casa" },
  ],
  glut: [
    { n: "Hip thrust con barra", lugar: "gym" },
    { n: "Puente de glúteo", lugar: "ambos" },
    { n: "Hip thrust con mochila", lugar: "casa" },
  ],
  emp_h: [
    { n: "Press de banca con barra", lugar: "gym", evita: ["hombro", "muneca"] },
    { n: "Press inclinado con mancuernas", lugar: "gym", evita: ["hombro"] },
    { n: "Press en máquina de pecho", lugar: "gym" },
    { n: "Flexiones", lugar: "casa", evita: ["muneca"] },
    { n: "Flexiones con manos elevadas", lugar: "casa" },
    { n: "Fondos en banco", lugar: "casa", evita: ["hombro", "muneca"] },
  ],
  emp_v: [
    { n: "Press militar con mancuernas", lugar: "gym", evita: ["hombro"] },
    { n: "Press militar con barra", lugar: "gym", evita: ["hombro"] },
    { n: "Press landmine", lugar: "gym" },
    { n: "Pike push-up", lugar: "casa", evita: ["hombro", "muneca"] },
    { n: "Elevación lateral con botellas", lugar: "casa" },
  ],
  tir_h: [
    { n: "Remo en polea sentado", lugar: "gym" },
    { n: "Remo con barra", lugar: "gym", evita: ["espalda"] },
    { n: "Remo con mancuerna a una mano", lugar: "ambos" },
    { n: "Remo invertido en mesa", lugar: "casa" },
  ],
  tir_v: [
    { n: "Jalón al pecho", lugar: "gym" },
    { n: "Dominadas asistidas", lugar: "gym" },
    { n: "Jalón con banda elástica", lugar: "casa" },
    { n: "Remo con mochila inclinado", lugar: "casa" },
  ],
  biceps: [
    { n: "Curl con mancuernas", lugar: "ambos" },
    { n: "Curl con barra", lugar: "gym", evita: ["muneca"] },
    { n: "Curl con banda elástica", lugar: "casa" },
  ],
  triceps: [
    { n: "Extensión de tríceps en polea", lugar: "gym" },
    { n: "Press francés con mancuerna", lugar: "ambos", evita: ["muneca"] },
    { n: "Extensión de tríceps con banda", lugar: "casa" },
  ],
  delt_lat: [
    { n: "Elevaciones laterales", lugar: "ambos", evita: ["hombro"] },
    { n: "Elevación lateral con botellas", lugar: "casa", evita: ["hombro"] },
  ],
  delt_post: [
    { n: "Face pull", lugar: "gym" },
    { n: "Pájaros con mancuernas", lugar: "ambos" },
    { n: "Pájaros con banda elástica", lugar: "casa" },
  ],
  pant: [
    { n: "Elevación de talones de pie", lugar: "ambos" },
    { n: "Elevación de talones sentado", lugar: "gym" },
  ],
  core: [
    { n: "Plancha", lugar: "ambos", evita: ["muneca"] },
    { n: "Dead bug", lugar: "ambos" },
    { n: "Plancha lateral", lugar: "ambos", evita: ["hombro"] },
    { n: "Crunch en polea", lugar: "gym" },
    { n: "Bicicleta abdominal", lugar: "casa" },
  ],
};

const COMPUESTOS: Patron[] = ["sent", "bisag", "uni", "emp_h", "emp_v", "tir_h", "tir_v"];
const ESTATICOS = new Set(["Plancha", "Plancha lateral", "Dead bug"]);

/** Rutinas tipo: cada una es una lista de patrones de movimiento. */
const SESIONES: Record<string, { titulo: string; slots: Patron[] }> = {
  FB_A: { titulo: "Cuerpo completo A", slots: ["sent", "emp_h", "tir_h", "glut", "core"] },
  FB_B: { titulo: "Cuerpo completo B", slots: ["bisag", "emp_v", "tir_v", "uni", "core"] },
  FB_C: { titulo: "Cuerpo completo C", slots: ["sent", "emp_h", "tir_v", "bisag", "core"] },
  UP_A: { titulo: "Torso A", slots: ["emp_h", "tir_h", "emp_v", "tir_v", "biceps", "triceps"] },
  LO_A: { titulo: "Pierna A", slots: ["sent", "bisag", "uni", "pant", "core"] },
  UP_B: { titulo: "Torso B", slots: ["emp_v", "tir_v", "emp_h", "tir_h", "delt_post", "biceps"] },
  LO_B: { titulo: "Pierna B", slots: ["bisag", "sent", "glut", "pant", "core"] },
  PUSH: { titulo: "Empuje", slots: ["emp_h", "emp_v", "emp_h", "triceps", "delt_lat"] },
  PULL: { titulo: "Tirón", slots: ["tir_v", "tir_h", "tir_h", "biceps", "delt_post"] },
  LEGS: { titulo: "Pierna", slots: ["sent", "bisag", "uni", "glut", "pant"] },
};

function plantillaFuerza(dias: number): string[] {
  if (dias <= 2) return ["FB_A", "FB_B"];
  if (dias === 3) return ["FB_A", "FB_B", "FB_C"];
  if (dias === 4) return ["UP_A", "LO_A", "UP_B", "LO_B"];
  if (dias === 5) return ["PUSH", "PULL", "LEGS", "UP_A", "LO_A"];
  return ["PUSH", "PULL", "LEGS", "UP_B", "LO_B", "FB_A"];
}

/** Si un patrón se queda sin opciones, se prueba con estos otros antes de omitir el hueco. */
const ALTERNATIVAS: Record<Patron, Patron[]> = {
  sent: ["uni", "glut", "bisag"], bisag: ["glut", "sent", "uni"], uni: ["glut", "sent", "bisag"], glut: ["bisag", "uni"],
  emp_h: ["emp_v", "triceps"], emp_v: ["emp_h", "delt_lat"], tir_h: ["tir_v", "delt_post", "biceps"],
  tir_v: ["tir_h", "biceps"], biceps: ["tir_h"], triceps: ["emp_h"], delt_lat: ["emp_v"], delt_post: ["tir_h"],
  pant: ["core"], core: ["pant"],
};

/**
 * Elige un ejercicio del patrón que sirva para el lugar y no cargue las zonas con molestias,
 * sin repetir ninguno de la sesión. Si no queda ninguno seguro, devuelve null: es mejor omitir
 * el hueco que repetir o incluir algo que pueda empeorar una lesión.
 */
function elegir(patron: Patron, lugar: "casa" | "gimnasio", zonas: Zona[], usados: Set<string>, variante: number): string | null {
  const sirve = (e: Ej) =>
    (e.lugar === "ambos" || (lugar === "casa" ? e.lugar === "casa" : e.lugar === "gym")) &&
    !(e.evita ?? []).some((z) => zonas.includes(z)) &&
    !usados.has(e.n);
  for (const pat of [patron, ...ALTERNATIVAS[patron]]) {
    const pool = CATALOGO[pat].filter(sirve);
    if (pool.length) {
      const e = pool[variante % pool.length];
      usados.add(e.n);
      return e.n;
    }
  }
  return null;
}

type Ctx = { meta: Meta; nivel: 1 | 2 | 3; lugar: "casa" | "gimnasio"; zonas: Zona[]; recorte: number; extraAccesorios: number };

function prescripcion(patron: Patron, nombre: string, c: Ctx) {
  const compuesto = COMPUESTOS.includes(patron);
  let series: number;
  let reps: string;
  if (compuesto) {
    series = c.meta === "musculo" ? (c.nivel === 1 ? 3 : 4) : c.meta === "grasa" ? 3 : c.nivel === 1 ? 2 : 3;
    reps = c.meta === "musculo" ? (c.nivel === 1 ? "8-10" : "6-8") : c.meta === "grasa" ? "8-12" : "10-12";
  } else {
    series = c.nivel === 1 ? 2 : 3;
    reps = c.meta === "musculo" ? "10-12" : "12-15";
    series += c.extraAccesorios;
  }
  series = Math.max(2, series - c.recorte);
  const texto = ESTATICOS.has(nombre) ? `${series} × 30-45 s` : `${series} × ${reps}`;
  const carga =
    c.lugar === "casa"
      ? "Peso corporal. Si te sobra, hazlo más lento (3 segundos al bajar)."
      : c.nivel === 1
      ? "Peso cómodo. Primero la técnica."
      : `Deja ${c.nivel === 2 ? "2" : "1-2"} repeticiones en reserva.`;
  return { series: texto, carga: ESTATICOS.has(nombre) ? "Cuerpo estable, sin dolor." : carga, numSeries: series };
}

type Ej2 = { nombre: string; series: string; carga: string };

function construirSesion(clave: string, indice: number, c: Ctx, finisher: Ej2 | null): { titulo: string; ejercicios: Ej2[] } {
  const plantilla = SESIONES[clave];
  const usados = new Set<string>();
  const ejercicios: Ej2[] = [];
  plantilla.slots.forEach((patron, i) => {
    const nombre = elegir(patron, c.lugar, c.zonas, usados, indice + (i % 2));
    if (nombre === null) return;
    const p = prescripcion(patron, nombre, c);
    ejercicios.push({ nombre, series: p.series, carga: p.carga });
  });
  if (finisher) ejercicios.push(finisher);
  return { titulo: plantilla.titulo, ejercicios };
}

function sesionDeCarrera(tipo: "suave" | "intervalos" | "larga", descarga: boolean): { titulo: string; ejercicios: Ej2[] } {
  const calor = { nombre: "Calentamiento y vuelta a la calma", series: "5 min + 5 min", carga: "Caminando o trotando muy suave." };
  if (tipo === "suave")
    return { titulo: "Carrera suave", ejercicios: [{ nombre: "Carrera continua", series: descarga ? "25 min" : "30-40 min", carga: "Ritmo en el que puedas hablar." }, calor] };
  if (tipo === "intervalos")
    return { titulo: "Intervalos", ejercicios: [{ nombre: "Intervalos de carrera", series: descarga ? "4 × 2 min rápido / 2 min suave" : "6 × 2 min rápido / 2 min suave", carga: "Rápido: esfuerzo 8 de 10. Suave: recuperas." }, calor] };
  return { titulo: "Tirada larga", ejercicios: [{ nombre: "Carrera larga", series: descarga ? "30 min" : "45-60 min", carga: "Ritmo suave y constante." }, calor] };
}

/* ---------------- Datos derivados del alumno ---------------- */

/** Kilos por semana en los últimos 28 días, o null si no hay datos suficientes. */
export function tendenciaPeso(medidas: Medida[], hoy: string): number | null {
  const m = medidas
    .filter((x) => dias(hoy, x.fecha) >= 0 && dias(hoy, x.fecha) <= 28)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (m.length < 3) return null;
  const t0 = Date.parse(m[0].fecha);
  const xs = m.map((x) => (Date.parse(x.fecha) - t0) / MS_DIA);
  if (xs[xs.length - 1] < 14) return null;
  const n = m.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = m.reduce((s, v) => s + v.peso_kg, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (m[i].peso_kg - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den === 0 ? null : (num / den) * 7;
}

function ultimoPeso(medidas: Medida[]): number | null {
  const m = [...medidas].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
  return m ? m.peso_kg : null;
}

/** Proporción de los entrenos previstos que realmente hizo en las últimas 4 semanas. */
export function adherencia(entrenos: Entreno[], diasSemana: number, hoy: string): { hechos: number; previstos: number; ratio: number } {
  const hechos = entrenos.filter((e) => dias(hoy, e.fecha) >= 0 && dias(hoy, e.fecha) < 28).length;
  const previstos = Math.max(1, diasSemana * 4);
  return { hechos, previstos, ratio: hechos / previstos };
}

const PERFIL_POR_DEFECTO: PerfilFitness = {
  edad: null, sexo: "no_dice", altura_cm: null, dias_semana: 3, lugar: "gimnasio", lesiones: "", restricciones: "",
};

/** Avisos que dependen del perfil y valen para rutinas y nutrición. */
function avisosDePerfil(d: DatosAlumno, perfilReal: boolean): string[] {
  const a: string[] = [];
  const p = d.perfil ?? PERFIL_POR_DEFECTO;
  if (!perfilReal) a.push("El alumno aún no completó su perfil de entrenamiento. Se usaron valores por defecto (3 días por semana, en gimnasio). Pídele que lo complete antes de aprobar.");
  if (p.edad !== null && p.edad < 16) a.push("Menor de 16 años: no es la edad de uso del servicio. Necesita autorización de un tutor y supervisión profesional.");
  else if (p.edad !== null && p.edad < 18) a.push("Menor de edad: el plan no incluye déficit de calorías. Revísalo con especial cuidado.");
  if (p.edad !== null && p.edad >= 60) a.push("Persona de 60 años o más: conviene confirmar con su médico que puede entrenar con esta intensidad.");
  const zonas = zonasDe(p.lesiones);
  if (p.lesiones.trim()) {
    a.push(
      zonas.length
        ? `Indicó molestias o lesiones (${p.lesiones.trim()}). Se evitaron ejercicios que cargan: ${zonas.join(", ")}. Valídalo con un profesional de la salud.`
        : `Indicó molestias o lesiones: "${p.lesiones.trim()}". El sistema no pudo interpretarlas: revisa los ejercicios a mano.`,
    );
  }
  return a;
}

/* ---------------- Rutinas ---------------- */

export function generarPlan(d: DatosAlumno): Resultado<ContenidoRutinas> {
  const perfilReal = d.perfil !== null;
  const p = d.perfil ?? PERFIL_POR_DEFECTO;
  const meta = metaDe(d.objetivo);
  const nivel = nivelDe(d.nivel);
  const zonas = zonasDe(p.lesiones);
  const razones: string[] = [];
  const avisos = avisosDePerfil(d, perfilReal);

  // Días por semana, ajustados a lo que el alumno realmente cumple.
  let diasSemana = entre(Math.round(p.dias_semana), 2, 6);
  const adh = adherencia(d.entrenos, diasSemana, d.hoy);
  const tieneHistorial = d.entrenos.length > 0;
  let recorte = 0;
  razones.push(`Objetivo: ${ETIQUETA_META[meta]}. Nivel: ${["", "principiante", "intermedio", "avanzado"][nivel]}. Entrena ${diasSemana} días por semana ${p.lugar === "casa" ? "en casa, sin gimnasio" : "en gimnasio"}.`);
  if (tieneHistorial && adh.ratio < 0.5 && diasSemana > 2) {
    diasSemana -= 1;
    razones.push(`Hizo ${adh.hechos} de ${adh.previstos} entrenos previstos en 4 semanas (${Math.round(adh.ratio * 100)}%). Se baja a ${diasSemana} días para que el plan sea sostenible.`);
  } else if (tieneHistorial && adh.ratio >= 0.85) {
    razones.push(`Muy buena constancia: ${adh.hechos} entrenos en 4 semanas (${Math.round(adh.ratio * 100)}% de lo previsto). Se mantiene el volumen.`);
  } else if (tieneHistorial) {
    razones.push(`Constancia: ${adh.hechos} entrenos en 4 semanas (${Math.round(adh.ratio * 100)}% de lo previsto).`);
  } else {
    recorte = 1;
    razones.push("Todavía no registra entrenos: se empieza con una serie menos por ejercicio para adaptarse.");
  }

  // Tendencia de peso: si se estanca, se añade trabajo.
  const tend = tendenciaPeso(d.medidas, d.hoy);
  let finisherLargo = false;
  let extraAccesorios = 0;
  if (tend !== null) {
    if (meta === "grasa" && tend > -0.1) {
      finisherLargo = true;
      razones.push(`El peso no baja (${tend >= 0 ? "+" : ""}${tend.toFixed(2).replace(".", ",")} kg por semana en el último mes). Se alarga el cardio final de cada sesión.`);
    } else if (meta === "musculo" && tend < 0.05) {
      extraAccesorios = 1;
      razones.push(`El peso no sube (${tend >= 0 ? "+" : ""}${tend.toFixed(2).replace(".", ",")} kg por semana). Se añade una serie a los ejercicios de acompañamiento.`);
    } else {
      razones.push(`Tendencia de peso: ${tend >= 0 ? "+" : ""}${tend.toFixed(2).replace(".", ",")} kg por semana, acorde al objetivo.`);
    }
  }

  const c: Ctx = { meta, nivel, lugar: p.lugar, zonas, recorte, extraAccesorios };
  const finisher: Ej2 | null =
    meta === "grasa" || meta === "activo"
      ? { nombre: p.lugar === "casa" ? "Caminata rápida o circuito suave" : "Caminata rápida o bicicleta suave", series: finisherLargo ? "25 min" : "15-20 min", carga: "Ritmo constante, sin llegar a la fatiga." }
      : null;

  // Estructura semanal.
  let claves: { tipo: "fuerza" | "carrera"; clave: string; sub?: "suave" | "intervalos" | "larga" }[];
  if (meta === "correr") {
    const fuerza = plantillaFuerza(2).map((clave) => ({ tipo: "fuerza" as const, clave }));
    const carreras = (["suave", "intervalos", "larga"] as const).slice(0, Math.max(1, Math.min(3, diasSemana - 2))).map((sub) => ({ tipo: "carrera" as const, clave: sub, sub }));
    claves = [...carreras, ...fuerza];
    razones.push(`Combina ${carreras.length} ${carreras.length === 1 ? "sesión" : "sesiones"} de carrera con 2 de fuerza para correr mejor y evitar lesiones.`);
  } else {
    const lista = plantillaFuerza(meta === "activo" ? Math.min(diasSemana, 4) : diasSemana);
    claves = lista.map((clave) => ({ tipo: "fuerza" as const, clave }));
    const nombres = { 2: "cuerpo completo A/B", 3: "cuerpo completo A/B/C", 4: "torso y pierna ×2", 5: "empuje, tirón y pierna + torso y pierna", 6: "empuje, tirón y pierna ×2" } as Record<number, string>;
    razones.push(`Con ${claves.length} sesiones por semana: ${nombres[claves.length] ?? "rutina completa"}.`);
  }
  if (meta === "musculo") razones.push(nivel === 1 ? "Series moderadas de 8-10 repeticiones para aprender la técnica." : "Ejercicios principales de 6-8 repeticiones y accesorios de 10-12 para ganar músculo.");
  if (meta === "grasa") razones.push("Repeticiones medias (8-12 en principales, 12-15 en accesorios) y cardio final para favorecer la pérdida de grasa conservando músculo.");
  if (zonas.length) razones.push(`Se sustituyeron ejercicios que cargan ${zonas.join(" y ")} por alternativas más suaves.`);
  razones.push("Semanas 1 a 3: progresa cada semana (1-2 repeticiones más o un poco más de peso). Semana 4: descarga con la mitad de las series.");

  const construye = (descarga: boolean) =>
    claves.map((k, i) => {
      const base =
        k.tipo === "carrera"
          ? sesionDeCarrera(k.sub as "suave" | "intervalos" | "larga", descarga)
          : construirSesion(k.clave, i, descarga ? { ...c, recorte: c.recorte + 2 } : c, finisher);
      const minutos = k.tipo === "carrera" ? 45 : 15 + base.ejercicios.length * 8;
      const ejercicios = descarga && k.tipo === "fuerza"
        ? base.ejercicios.map((e) => ({ ...e, carga: e.carga.startsWith("Peso corporal") ? e.carga : "Ligera: 50-60% de tu peso habitual. Técnica perfecta." }))
        : base.ejercicios;
      return {
        nombre: descarga ? `${base.titulo} · descarga` : base.titulo,
        detalle: `Día ${i + 1} · unos ${redondea(minutos, 5)} min${descarga ? " · semana de descarga" : ""}`,
        ejercicios,
      };
    });

  const normal = construye(false);
  const suave = construye(true);
  const semanas = [1, 2, 3, 4].map((semana) => ({ semana, rutinas: semana === 4 ? suave : normal }));
  const nombre = `Plan automático · ${ETIQUETA_META[meta].replace(/^./, (x) => x.toUpperCase())}`;
  return { contenido: { nombre, semanas }, razones, avisos };
}

/* ---------------- Nutrición ---------------- */

export function generarNutricion(d: DatosAlumno): Resultado<ObjetivoNutricion> {
  const perfilReal = d.perfil !== null;
  const p = d.perfil ?? PERFIL_POR_DEFECTO;
  const meta = metaDe(d.objetivo);
  const razones: string[] = [];
  const avisos = avisosDePerfil(d, perfilReal);

  let peso = ultimoPeso(d.medidas);
  if (peso === null) {
    peso = 70;
    avisos.push("El alumno no tiene peso registrado: se calculó con 70 kg. Pídele que registre su peso antes de aprobar.");
  }

  // Gasto energético: fórmula de Mifflin-St Jeor si hay edad y altura; si no, una estimación simple.
  let bmr: number;
  if (p.edad !== null && p.altura_cm !== null) {
    const ajusteSexo = p.sexo === "hombre" ? 5 : p.sexo === "mujer" ? -161 : -78;
    bmr = 10 * peso + 6.25 * p.altura_cm - 5 * p.edad + ajusteSexo;
    razones.push(`Metabolismo basal de ${Math.round(bmr)} kcal (fórmula de Mifflin-St Jeor con ${peso} kg, ${p.altura_cm} cm y ${p.edad} años).`);
  } else {
    bmr = peso * 22;
    avisos.push("Faltan la edad o la altura del alumno: el cálculo de calorías es una estimación simple por peso. Pídele que complete su perfil.");
    razones.push(`Sin edad o altura: metabolismo basal estimado en ${Math.round(bmr)} kcal (22 kcal por kg).`);
  }
  const diasSemana = entre(Math.round(p.dias_semana), 1, 7);
  const factor = diasSemana <= 2 ? 1.35 : diasSemana === 3 ? 1.45 : diasSemana === 4 ? 1.55 : diasSemana === 5 ? 1.65 : 1.75;
  const mantenimiento = bmr * factor;
  razones.push(`Con ${diasSemana} días de entrenamiento por semana, el gasto total estimado es de ${Math.round(mantenimiento)} kcal al día.`);

  // Ajuste según el objetivo.
  const menor = p.edad !== null && p.edad < 18;
  const ajuste: Record<Meta, number> = { grasa: 0.82, musculo: 1.1, correr: 1.05, activo: 1 };
  let kcal = mantenimiento * (menor && meta === "grasa" ? 1 : ajuste[meta]);
  razones.push(
    meta === "grasa" && !menor ? "Objetivo perder grasa: déficit del 18% sobre el gasto."
    : meta === "grasa" ? "Objetivo perder grasa, pero es menor de edad: se mantiene el gasto sin déficit."
    : meta === "musculo" ? "Objetivo ganar músculo: superávit del 10% sobre el gasto."
    : meta === "correr" ? "Objetivo correr más: 5% más para sostener el volumen de carrera."
    : "Objetivo estar activo: se mantiene el gasto.",
  );

  // Ajuste fino según la tendencia real del peso.
  const tend = tendenciaPeso(d.medidas, d.hoy);
  if (tend !== null) {
    if (meta === "grasa" && tend > -0.1 && !menor) {
      kcal -= 100;
      razones.push(`El peso no baja (${tend >= 0 ? "+" : ""}${tend.toFixed(2).replace(".", ",")} kg por semana): se restan 100 kcal.`);
    } else if (meta === "grasa" && tend < -(peso * 0.01)) {
      kcal += 100;
      razones.push(`Baja de peso muy deprisa (${tend.toFixed(2).replace(".", ",")} kg por semana): se suman 100 kcal para no perder músculo.`);
    } else if (meta === "musculo" && tend < 0.05) {
      kcal += 100;
      razones.push(`El peso no sube (${tend >= 0 ? "+" : ""}${tend.toFixed(2).replace(".", ",")} kg por semana): se suman 100 kcal.`);
    } else if (meta === "musculo" && tend > 0.5) {
      kcal -= 100;
      razones.push(`Sube de peso muy deprisa (+${tend.toFixed(2).replace(".", ",")} kg por semana): se restan 100 kcal para ganar menos grasa.`);
    } else {
      razones.push(`Tendencia de peso de ${tend >= 0 ? "+" : ""}${tend.toFixed(2).replace(".", ",")} kg por semana: no hace falta ajustar.`);
    }
  }

  // Suelo de seguridad.
  const suelo = p.sexo === "hombre" ? 1500 : p.sexo === "mujer" ? 1200 : 1350;
  if (kcal < suelo && !menor) {
    kcal = suelo;
    avisos.push(`El cálculo daba menos de ${suelo} kcal. Se subió a ese mínimo de seguridad. Valídalo con un profesional.`);
  }
  kcal = entre(redondea(kcal, 50), 1000, 5000);

  // Macronutrientes.
  const gPorKg = meta === "grasa" ? 2 : meta === "musculo" ? 1.9 : meta === "correr" ? 1.6 : 1.5;
  let proteina = Math.round(peso * gPorKg);
  proteina = Math.min(proteina, Math.round((kcal * 0.4) / 4));
  let grasas = Math.round(peso * 0.9);
  grasas = entre(grasas, Math.round((kcal * 0.2) / 9), Math.round((kcal * 0.35) / 9));
  let carbos = Math.round((kcal - proteina * 4 - grasas * 9) / 4);
  if (carbos < 80) {
    avisos.push("Los carbohidratos quedaron por debajo de 80 g al día: es un plan muy bajo en carbohidratos. Revísalo.");
    carbos = Math.max(0, carbos);
  }
  proteina = redondea(proteina, 5);
  grasas = redondea(grasas, 5);
  carbos = redondea(carbos, 5);
  razones.push(`Proteína ${gPorKg} g por kg de peso, grasas ${(grasas / peso).toFixed(1).replace(".", ",")} g por kg, y el resto en carbohidratos.`);

  const agua = entre(Math.round((peso * 35) / 250), 6, 14);

  // Notas que verá el alumno una vez aprobada la propuesta.
  const comidas = meta === "musculo" ? "4 comidas" : "3 o 4 comidas";
  const lineas = [
    `Reparte tus calorías en ${comidas} al día y pon proteína en cada una (unos ${Math.round(proteina / 4 / 5) * 5} g).`,
    "Prioriza comida sin procesar y verduras en al menos dos comidas.",
    `Bebe unos ${agua} vasos de agua al día.`,
  ];
  if (meta === "grasa") lineas.push("Si en 3 semanas tu peso no baja, tu entrenador/a ajustará las calorías.");
  if (meta === "musculo") lineas.push("Come algo de carbohidratos y proteína antes y después de entrenar.");
  if (p.restricciones.trim()) {
    lineas.push(`Tienes en cuenta lo que indicaste: ${p.restricciones.trim()}.`);
    avisos.push(`Indicó restricciones o alergias alimentarias: "${p.restricciones.trim()}". Revisa las notas y las comidas que le sugieras.`);
  }

  return { contenido: { kcal, proteina, carbos, grasas, agua, notas: lineas.join("\n") }, razones, avisos };
}
