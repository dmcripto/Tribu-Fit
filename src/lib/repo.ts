"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AGUA_KEY, COMIDAS_KEY, ENTRENOS_KEY, MEDIDAS_KEY, NUTRI_KEY, PAGOS_KEY, PAGO_CONFIG_KEY, PLANES_KEY,
  GRACIA_POR_DEFECTO, PREMIUM_EXC_KEY, VACIO_AGUA, VACIO_COMIDAS, VACIO_ENTRENOS, VACIO_EXC, VACIO_MEDIDAS,
  VACIO_NUTRI, VACIO_PAGOS, VACIO_PLANES, estadoPremium, sumarDias, type EstadoPremium, type Plan, type SemanaPlan,
} from "./datos";
import { modoDemo, supabase } from "./supabase";
import { useLocal, useToday } from "./store";
import type { Alumno, Comida, Entreno, Medida, Metodo, ObjetivoNutricion, Pago, PagoConfig, PremiumModo, Usuario } from "./types";

const db = () => supabase as SupabaseClient;

/** Carga asíncrona con recarga manual. `cargar` debe ser estable (useCallback). */
function useRemoto<T>(cargar: () => Promise<T>, inicial: T) {
  const [data, setData] = useState<T>(inicial);
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    cargar().then((d) => { if (vivo) setData(d); }).catch(() => {});
    return () => { vivo = false; };
  }, [cargar, n]);
  const recargar = useCallback(() => setN((x) => x + 1), []);
  return [data, recargar] as const;
}

/** Supabase devuelve como máximo 1.000 filas por consulta: se piden por páginas. */
async function traerTodo<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null }>,
): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data } = await pagina(desde, desde + 999);
    const filas = (data ?? []) as T[];
    todo.push(...filas);
    if (filas.length < 1000) return todo;
  }
}

/* ---------- Medidas ---------- */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useMedidasLocal(_uid: string) {
  const [medidas, set] = useLocal(MEDIDAS_KEY, VACIO_MEDIDAS);
  const anadir = useCallback(async (m: Medida) => {
    set((prev) => [...prev.filter((x) => x.fecha !== m.fecha), m]);
    return null as string | null;
  }, [set]);
  return { medidas, anadir };
}

function useMedidasRemoto(uid: string) {
  const cargar = useCallback(async (): Promise<Medida[]> => {
    if (!uid) return [];
    const { data } = await db().from("medidas")
      .select("fecha,peso_kg,grasa_pct,cintura_cm").eq("usuario_id", uid).order("fecha");
    return (data ?? []).map((m) => ({
      fecha: m.fecha,
      peso_kg: Number(m.peso_kg),
      grasa_pct: m.grasa_pct == null ? undefined : Number(m.grasa_pct),
      cintura_cm: m.cintura_cm == null ? undefined : Number(m.cintura_cm),
    }));
  }, [uid]);
  const [medidas, recargar] = useRemoto(cargar, VACIO_MEDIDAS);
  const anadir = useCallback(async (m: Medida) => {
    const { error } = await db().from("medidas").upsert(
      { usuario_id: uid, fecha: m.fecha, peso_kg: m.peso_kg, grasa_pct: m.grasa_pct ?? null, cintura_cm: m.cintura_cm ?? null },
      { onConflict: "usuario_id,fecha" },
    );
    if (!error) recargar();
    return error ? error.message : null;
  }, [uid, recargar]);
  return { medidas, anadir };
}

export const useMedidas: (uid: string) => { medidas: Medida[]; anadir: (m: Medida) => Promise<string | null> } =
  modoDemo ? useMedidasLocal : useMedidasRemoto;

/* ---------- Entrenos ---------- */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useEntrenosLocal(_uid: string) {
  const [entrenos, set] = useLocal(ENTRENOS_KEY, VACIO_ENTRENOS);
  const anadir = useCallback(async (e: Entreno) => {
    set((prev) => [...prev, e]);
    return null as string | null;
  }, [set]);
  return { entrenos, anadir };
}

function useEntrenosRemoto(uid: string) {
  const cargar = useCallback(async (): Promise<Entreno[]> => {
    if (!uid) return [];
    const { data } = await db().from("entrenos")
      .select("fecha,rutina,hechos,total").eq("usuario_id", uid).order("fecha");
    return (data ?? []) as Entreno[];
  }, [uid]);
  const [entrenos, recargar] = useRemoto(cargar, VACIO_ENTRENOS);
  const anadir = useCallback(async (e: Entreno) => {
    const { error } = await db().from("entrenos").insert({ usuario_id: uid, ...e });
    if (!error) recargar();
    return error ? error.message : null;
  }, [uid, recargar]);
  return { entrenos, anadir };
}

export const useEntrenos: (uid: string) => { entrenos: Entreno[]; anadir: (e: Entreno) => Promise<string | null> } =
  modoDemo ? useEntrenosLocal : useEntrenosRemoto;

/* ---------- Nutrición del alumno ---------- */

export type NuevaComida = Omit<Comida, "id">;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useComidasLocal(_uid: string) {
  const [comidas, set] = useLocal(COMIDAS_KEY, VACIO_COMIDAS);
  const anadir = useCallback(async (c: NuevaComida) => {
    set((prev) => [...prev, { ...c, id: crypto.randomUUID() }]);
    return null as string | null;
  }, [set]);
  const borrar = useCallback(async (id: string) => {
    set((prev) => prev.filter((c) => c.id !== id));
    return null as string | null;
  }, [set]);
  return { comidas, anadir, borrar };
}

function useComidasRemoto(uid: string) {
  const cargar = useCallback(async (): Promise<Comida[]> => {
    if (!uid) return [];
    const desde = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const { data } = await db().from("comidas")
      .select("id,fecha,nombre,kcal,proteina_g,carbos_g,grasas_g")
      .eq("usuario_id", uid).gte("fecha", desde).order("id");
    return (data ?? []).map(aComida);
  }, [uid]);
  const [comidas, recargar] = useRemoto(cargar, VACIO_COMIDAS);
  const anadir = useCallback(async (c: NuevaComida) => {
    const { error } = await db().from("comidas").insert({
      usuario_id: uid, fecha: c.fecha, nombre: c.nombre, kcal: c.kcal,
      proteina_g: c.proteina, carbos_g: c.carbos, grasas_g: c.grasas,
    });
    if (!error) recargar();
    return error ? error.message : null;
  }, [uid, recargar]);
  const borrar = useCallback(async (id: string) => {
    const { error } = await db().from("comidas").delete().eq("id", id).eq("usuario_id", uid);
    if (!error) recargar();
    return error ? error.message : null;
  }, [uid, recargar]);
  return { comidas, anadir, borrar };
}

type FilaComida = {
  id: number | string; fecha: string; nombre: string; kcal: number;
  proteina_g: number | string; carbos_g: number | string; grasas_g: number | string;
};

function aComida(c: FilaComida): Comida {
  return {
    id: String(c.id), fecha: c.fecha, nombre: c.nombre, kcal: Number(c.kcal),
    proteina: Number(c.proteina_g), carbos: Number(c.carbos_g), grasas: Number(c.grasas_g),
  };
}

type ApiComidas = {
  comidas: Comida[];
  anadir: (c: NuevaComida) => Promise<string | null>;
  borrar: (id: string) => Promise<string | null>;
};
export const useComidas: (uid: string) => ApiComidas = modoDemo ? useComidasLocal : useComidasRemoto;

function useAguaLocal(_uid: string, fecha: string) {
  const [mapa, set] = useLocal(AGUA_KEY, VACIO_AGUA);
  const fijar = useCallback((n: number) => { set((prev) => ({ ...prev, [fecha]: n })); }, [set, fecha]);
  return { vasos: mapa[fecha] ?? 0, fijar };
}

function useAguaRemoto(uid: string, fecha: string) {
  const cargar = useCallback(async (): Promise<number> => {
    if (!uid || !fecha) return 0;
    const { data } = await db().from("agua").select("vasos").eq("usuario_id", uid).eq("fecha", fecha).maybeSingle();
    return data ? Number(data.vasos) : 0;
  }, [uid, fecha]);
  const [vasos, recargar] = useRemoto(cargar, 0);
  const fijar = useCallback((n: number) => {
    db().from("agua").upsert({ usuario_id: uid, fecha, vasos: n }, { onConflict: "usuario_id,fecha" })
      .then(() => recargar());
  }, [uid, fecha, recargar]);
  return { vasos, fijar };
}

export const useAgua: (uid: string, fecha: string) => { vasos: number; fijar: (n: number) => void } =
  modoDemo ? useAguaLocal : useAguaRemoto;

type FilaObjetivo = {
  kcal: number; proteina_g: number; carbos_g: number; grasas_g: number;
  agua_vasos: number; notas: string | null;
};

function aObjetivo(o: FilaObjetivo): ObjetivoNutricion {
  return {
    kcal: Number(o.kcal), proteina: Number(o.proteina_g), carbos: Number(o.carbos_g),
    grasas: Number(o.grasas_g), agua: Number(o.agua_vasos), notas: o.notas ?? "",
  };
}

/** Objetivo fijado por el entrenador para este alumno, o null si no tiene. */
function useObjetivoLocal(uid: string) {
  const [mapa] = useLocal(NUTRI_KEY, VACIO_NUTRI);
  return mapa[uid] ?? null;
}

function useObjetivoRemoto(uid: string) {
  const cargar = useCallback(async (): Promise<ObjetivoNutricion | null> => {
    if (!uid) return null;
    const { data } = await db().from("nutricion_objetivos")
      .select("kcal,proteina_g,carbos_g,grasas_g,agua_vasos,notas").eq("alumno_id", uid).maybeSingle();
    return data ? aObjetivo(data as FilaObjetivo) : null;
  }, [uid]);
  return useRemoto<ObjetivoNutricion | null>(cargar, null)[0];
}

export const useObjetivoNutricion: (uid: string) => ObjetivoNutricion | null =
  modoDemo ? useObjetivoLocal : useObjetivoRemoto;

/* ---------- Planes del alumno (rutinas asignadas por el entrenador) ---------- */

type FilaPlan = {
  id: number | string;
  alumno_id: string;
  nombre: string;
  fecha_inicio: string;
  plan_semanas: { semana: number; rutinas: SemanaPlan["rutinas"] }[] | null;
};

function aPlan(p: FilaPlan): Plan {
  return {
    id: String(p.id),
    alumno_id: p.alumno_id,
    nombre: p.nombre,
    fecha_inicio: p.fecha_inicio,
    semanas: [...(p.plan_semanas ?? [])].sort((a, b) => a.semana - b.semana),
  };
}

function usePlanesAlumnoLocal(uid: string) {
  const [planes] = useLocal(PLANES_KEY, VACIO_PLANES);
  return useMemo(() => planes.filter((p) => p.alumno_id === uid), [planes, uid]);
}

function usePlanesAlumnoRemoto(uid: string) {
  const cargar = useCallback(async (): Promise<Plan[]> => {
    if (!uid) return [];
    const { data } = await db().from("planes")
      .select("id,alumno_id,nombre,fecha_inicio,plan_semanas(semana,rutinas)")
      .eq("alumno_id", uid);
    return ((data ?? []) as unknown as FilaPlan[]).map(aPlan).filter((p) => p.semanas.length > 0);
  }, [uid]);
  return useRemoto(cargar, VACIO_PLANES)[0];
}

export const usePlanesAlumno: (uid: string) => Plan[] =
  modoDemo ? usePlanesAlumnoLocal : usePlanesAlumnoRemoto;

/* ---------- Cartera del entrenador ---------- */

export type NuevoPlan = {
  alumno_id: string;
  nombre: string;
  fecha_inicio: string;
  semanas: SemanaPlan[];
};

export type Cartera = {
  alumnos: Alumno[];
  planes: Plan[];
  /** Objetivo de nutrición fijado para cada alumno (por id). */
  objetivos: Record<string, ObjetivoNutricion>;
  asignar: (p: NuevoPlan) => Promise<string | null>;
  asignarNutricion: (alumnoId: string, o: ObjetivoNutricion) => Promise<string | null>;
  /** Excepciones de premium por alumno (bloqueado o cortesía). */
  excepciones: Record<string, PremiumModo>;
  /** null deja al alumno en automático (según sus pagos). */
  fijarExcepcion: (alumnoId: string, modo: PremiumModo | null) => Promise<string | null>;
};

const SIN_ALUMNOS: Alumno[] = [];

function muestra(hoy: string): Alumno[] {
  if (!hoy) return [];
  const d = (n: number) => sumarDias(hoy, -n);
  const e = (n: number, rutina: string): Entreno => ({ fecha: d(n), rutina, hechos: 4, total: 4 });
  const c = (n: number, kcal: number, p: number): Comida => ({
    id: `m-${n}-${kcal}`, fecha: d(n), nombre: "Total del día", kcal, proteina: p,
    carbos: Math.round((kcal - p * 4) * 0.5 / 4), grasas: Math.round((kcal - p * 4) * 0.3 / 9),
  });
  return [
    {
      id: "ejemplo-lucia", nombre: "Lucía Ramos (ejemplo)", objetivo: "Perder grasa", permiso: true, ejemplo: true,
      medidas: [
        { fecha: d(42), peso_kg: 71.2 }, { fecha: d(28), peso_kg: 70.9 },
        { fecha: d(14), peso_kg: 70.8 }, { fecha: d(10), peso_kg: 70.8 },
      ],
      entrenos: [e(30, "Pierna"), e(16, "Empuje · pecho y hombro"), e(9, "Pierna")],
      comidas: [c(3, 1450, 80), c(2, 1520, 85), c(1, 1480, 78)],
    },
    {
      id: "ejemplo-andres", nombre: "Andrés Soto (ejemplo)", objetivo: "Correr más", permiso: true, ejemplo: true,
      medidas: [
        { fecha: d(40), peso_kg: 84.0 }, { fecha: d(26), peso_kg: 83.6 }, { fecha: d(12), peso_kg: 83.7 }, { fecha: d(5), peso_kg: 83.6 },
      ],
      entrenos: [e(20, "Pierna"), e(12, "Tirón · espalda y bíceps"), e(5, "Pierna")],
      comidas: [c(4, 2250, 110), c(3, 2310, 120)],
    },
    {
      id: "ejemplo-ivan", nombre: "Iván Cano (ejemplo)", objetivo: "Ganar músculo", permiso: true, ejemplo: true,
      medidas: [
        { fecha: d(42), peso_kg: 76.0 }, { fecha: d(28), peso_kg: 76.9 }, { fecha: d(14), peso_kg: 77.6 }, { fecha: d(1), peso_kg: 78.4 },
      ],
      entrenos: [e(6, "Empuje · pecho y hombro"), e(4, "Tirón · espalda y bíceps"), e(2, "Pierna"), e(0, "Empuje · pecho y hombro")],
      comidas: [c(2, 2800, 150), c(1, 2750, 155), c(0, 1900, 100)],
    },
  ];
}

function useCarteraLocal(yo: Usuario | null): Cartera {
  const hoy = useToday();
  const [medidas] = useLocal(MEDIDAS_KEY, VACIO_MEDIDAS);
  const [entrenos] = useLocal(ENTRENOS_KEY, VACIO_ENTRENOS);
  const [planes, setPlanes] = useLocal(PLANES_KEY, VACIO_PLANES);
  const [comidas] = useLocal(COMIDAS_KEY, VACIO_COMIDAS);
  const [objetivos, setObjetivos] = useLocal(NUTRI_KEY, VACIO_NUTRI);
  const [excepciones, setExcepciones] = useLocal(PREMIUM_EXC_KEY, VACIO_EXC);

  const alumnos = useMemo<Alumno[]>(() => {
    if (!yo) return SIN_ALUMNOS;
    const mio: Alumno = {
      id: yo.id, nombre: `${yo.nombre} (tú, cuenta demo)`, objetivo: yo.objetivo,
      permiso: true, medidas, entrenos, comidas,
    };
    return [mio, ...muestra(hoy)];
  }, [yo, hoy, medidas, entrenos, comidas]);

  const asignar = useCallback(async (p: NuevoPlan) => {
    setPlanes((prev) => [...prev, { id: crypto.randomUUID(), ...p }]);
    return null as string | null;
  }, [setPlanes]);

  const asignarNutricion = useCallback(async (alumnoId: string, o: ObjetivoNutricion) => {
    setObjetivos((prev) => ({ ...prev, [alumnoId]: o }));
    return null as string | null;
  }, [setObjetivos]);

  const fijarExcepcion = useCallback(async (alumnoId: string, modo: PremiumModo | null) => {
    setExcepciones((prev) => {
      const sig = { ...prev };
      if (modo) sig[alumnoId] = modo; else delete sig[alumnoId];
      return sig;
    });
    return null as string | null;
  }, [setExcepciones]);

  return { alumnos, planes, objetivos, asignar, asignarNutricion, excepciones, fijarExcepcion };
}

function useCarteraRemota(yo: Usuario | null): Cartera {
  const coach = yo?.id ?? "";
  const cargar = useCallback(async (): Promise<{
    alumnos: Alumno[]; planes: Plan[]; objetivos: Record<string, ObjetivoNutricion>;
    excepciones: Record<string, PremiumModo>;
  }> => {
    if (!coach) return { alumnos: [], planes: [], objetivos: {}, excepciones: {} };
    // Sin filtrar por lista de alumnos: las reglas de privacidad (RLS) ya limitan cada
    // consulta a los alumnos de esta entrenadora. Se pagina de 1.000 en 1.000 y se
    // acota la historia para que funcione con cualquier número de alumnos.
    const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
    const [us, cons, med, ent, pla, com, obj, exc] = await Promise.all([
      traerTodo<{ id: string; nombre: string; objetivo: string | null }>((a, b) =>
        db().from("usuarios").select("id,nombre,objetivo").eq("entrenador_id", coach).order("nombre").order("id").range(a, b)),
      traerTodo<{ usuario_id: string; comparte_con_entrenador: boolean }>((a, b) =>
        db().from("consentimientos").select("usuario_id,comparte_con_entrenador").order("usuario_id").range(a, b)),
      traerTodo<{ usuario_id: string; fecha: string; peso_kg: number | string; grasa_pct: number | string | null; cintura_cm: number | string | null }>((a, b) =>
        db().from("medidas").select("usuario_id,fecha,peso_kg,grasa_pct,cintura_cm").gte("fecha", hace(180)).order("id").range(a, b)),
      traerTodo<Entreno & { usuario_id: string }>((a, b) =>
        db().from("entrenos").select("usuario_id,fecha,rutina,hechos,total").gte("fecha", hace(90)).order("id").range(a, b)),
      traerTodo<FilaPlan>((a, b) =>
        db().from("planes").select("id,alumno_id,nombre,fecha_inicio,plan_semanas(semana,rutinas)").eq("entrenador_id", coach).order("id").range(a, b)),
      traerTodo<FilaComida & { usuario_id: string }>((a, b) =>
        db().from("comidas").select("id,usuario_id,fecha,nombre,kcal,proteina_g,carbos_g,grasas_g").gte("fecha", hace(14)).order("id").range(a, b)),
      traerTodo<FilaObjetivo & { alumno_id: string }>((a, b) =>
        db().from("nutricion_objetivos").select("alumno_id,kcal,proteina_g,carbos_g,grasas_g,agua_vasos,notas").eq("entrenador_id", coach).order("alumno_id").range(a, b)),
      traerTodo<{ alumno_id: string; modo: PremiumModo }>((a, b) =>
        db().from("premium_excepciones").select("alumno_id,modo").eq("entrenador_id", coach).order("alumno_id").range(a, b)),
    ]);

    const agrupar = <T,>(filas: T[], clave: (f: T) => string) => {
      const m = new Map<string, T[]>();
      for (const f of filas) {
        const k = clave(f);
        const lista = m.get(k);
        if (lista) lista.push(f); else m.set(k, [f]);
      }
      return m;
    };
    const conPermiso = new Set(cons.filter((c) => c.comparte_con_entrenador).map((c) => c.usuario_id));
    const medPor = agrupar(med, (m) => m.usuario_id);
    const entPor = agrupar(ent, (e) => e.usuario_id);
    const comPor = agrupar(com, (c) => c.usuario_id);

    const alumnos: Alumno[] = us.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      objetivo: u.objetivo ?? "",
      permiso: conPermiso.has(u.id),
      medidas: (medPor.get(u.id) ?? []).map((m) => ({
        fecha: m.fecha,
        peso_kg: Number(m.peso_kg),
        grasa_pct: m.grasa_pct == null ? undefined : Number(m.grasa_pct),
        cintura_cm: m.cintura_cm == null ? undefined : Number(m.cintura_cm),
      })),
      entrenos: (entPor.get(u.id) ?? []).map((e) => ({ fecha: e.fecha, rutina: e.rutina, hechos: e.hechos, total: e.total })),
      comidas: (comPor.get(u.id) ?? []).map(aComida),
    }));
    const objetivos: Record<string, ObjetivoNutricion> = {};
    for (const o of obj) objetivos[o.alumno_id] = aObjetivo(o);
    const excepciones: Record<string, PremiumModo> = {};
    for (const x of exc) excepciones[x.alumno_id] = x.modo;
    return { alumnos, planes: pla.map(aPlan), objetivos, excepciones };
  }, [coach]);
  const [datos, recargar] = useRemoto(cargar, { alumnos: SIN_ALUMNOS, planes: VACIO_PLANES, objetivos: VACIO_NUTRI, excepciones: VACIO_EXC });

  const asignar = useCallback(async (p: NuevoPlan) => {
    const { data: plan, error } = await db().from("planes")
      .insert({ entrenador_id: coach, alumno_id: p.alumno_id, nombre: p.nombre, fecha_inicio: p.fecha_inicio })
      .select("id").single();
    if (error || !plan) return error?.message ?? "No se pudo crear el plan.";
    const { error: e2 } = await db().from("plan_semanas").insert(
      p.semanas.map((s) => ({ plan_id: plan.id, semana: s.semana, rutinas: s.rutinas })),
    );
    if (e2) return e2.message;
    recargar();
    return null;
  }, [coach, recargar]);

  const asignarNutricion = useCallback(async (alumnoId: string, o: ObjetivoNutricion) => {
    const { error } = await db().from("nutricion_objetivos").upsert({
      alumno_id: alumnoId, entrenador_id: coach, kcal: o.kcal, proteina_g: o.proteina,
      carbos_g: o.carbos, grasas_g: o.grasas, agua_vasos: o.agua, notas: o.notas,
      actualizado: new Date().toISOString(),
    }, { onConflict: "alumno_id" });
    if (!error) recargar();
    return error ? error.message : null;
  }, [coach, recargar]);

  const fijarExcepcion = useCallback(async (alumnoId: string, modo: PremiumModo | null) => {
    const { error } = modo
      ? await db().from("premium_excepciones").upsert(
          { alumno_id: alumnoId, entrenador_id: coach, modo, actualizado: new Date().toISOString() },
          { onConflict: "alumno_id" },
        )
      : await db().from("premium_excepciones").delete().eq("alumno_id", alumnoId);
    if (!error) recargar();
    return error ? error.message : null;
  }, [coach, recargar]);

  return {
    alumnos: datos.alumnos, planes: datos.planes, objetivos: datos.objetivos, asignar, asignarNutricion,
    excepciones: datos.excepciones, fijarExcepcion,
  };
}

export const useCartera: (yo: Usuario | null) => Cartera =
  modoDemo ? useCarteraLocal : useCarteraRemota;

/* ---------- Pagos ---------- */

const SIN_CONFIG: PagoConfig | null = null;

type ApiConfig = {
  config: PagoConfig | null;
  guardar: (c: PagoConfig) => Promise<string | null>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function usePagoConfigLocal(_yo: Usuario | null): ApiConfig {
  const [config, set] = useLocal<PagoConfig | null>(PAGO_CONFIG_KEY, SIN_CONFIG);
  const guardar = useCallback(async (c: PagoConfig) => { set(c); return null as string | null; }, [set]);
  return { config, guardar };
}

/** Cobro de la entrenadora (ella lo edita; sus alumnos lo ven gracias a las reglas de privacidad). */
function usePagoConfigRemoto(yo: Usuario | null): ApiConfig {
  const uid = yo?.id ?? "";
  const cargar = useCallback(async (): Promise<PagoConfig | null> => {
    if (!uid) return null;
    const { data } = await db().from("pago_config")
      .select("moneda,precio,instrucciones,enlace_tarjeta,qr_imagen,dias_gracia").maybeSingle();
    return data
      ? {
          moneda: data.moneda, precio: Number(data.precio), instrucciones: data.instrucciones ?? "",
          enlace: data.enlace_tarjeta ?? "", qr: data.qr_imagen ?? "",
          gracia: Number(data.dias_gracia ?? GRACIA_POR_DEFECTO),
        }
      : null;
  }, [uid]);
  const [config, recargar] = useRemoto<PagoConfig | null>(cargar, SIN_CONFIG);
  const guardar = useCallback(async (c: PagoConfig) => {
    const { error } = await db().from("pago_config").upsert({
      entrenador_id: uid, moneda: c.moneda, precio: c.precio, instrucciones: c.instrucciones,
      enlace_tarjeta: c.enlace || null, qr_imagen: c.qr || null, dias_gracia: c.gracia,
      actualizado: new Date().toISOString(),
    }, { onConflict: "entrenador_id" });
    if (!error) recargar();
    return error ? error.message : null;
  }, [uid, recargar]);
  return { config, guardar };
}

export const usePagoConfig: (yo: Usuario | null) => ApiConfig =
  modoDemo ? usePagoConfigLocal : usePagoConfigRemoto;

export type NuevoPago = {
  alumno_id: string;
  monto: number;
  moneda: string;
  metodo: Metodo;
  referencia: string;
  comprobante?: string;
  /** Solo la entrenadora: registrar un cobro ya confirmado (efectivo, transferencia). */
  confirmado?: { vence: string };
};

type ApiPagos = {
  pagos: Pago[];
  registrar: (p: NuevoPago) => Promise<string | null>;
  resolver: (id: string, estado: "confirmado" | "rechazado", vence?: string) => Promise<string | null>;
};

function pagosDeMuestra(hoy: string): Pago[] {
  if (!hoy) return [];
  return [
    { id: "ejemplo-p1", alumno_id: "ejemplo-lucia", monto: 30, moneda: "USD", metodo: "qr", referencia: "OP-884102", estado: "pendiente", creado: sumarDias(hoy, -1) },
    { id: "ejemplo-p2", alumno_id: "ejemplo-ivan", monto: 30, moneda: "USD", metodo: "tarjeta", referencia: "", estado: "confirmado", vence: sumarDias(hoy, 12), creado: sumarDias(hoy, -18) },
    { id: "ejemplo-p3", alumno_id: "ejemplo-andres", monto: 30, moneda: "USD", metodo: "transferencia", referencia: "TR-5521", estado: "confirmado", vence: sumarDias(hoy, -4), creado: sumarDias(hoy, -34) },
  ];
}

function usePagosLocal(yo: Usuario | null): ApiPagos {
  const hoy = useToday();
  const [guardados, set] = useLocal(PAGOS_KEY, VACIO_PAGOS);
  const pagos = useMemo(() => {
    const ids = new Set(guardados.map((p) => p.id));
    const muestra = yo?.rol === "entrenador" ? pagosDeMuestra(hoy).filter((m) => !ids.has(m.id)) : [];
    return [...guardados, ...muestra].sort((a, b) => b.creado.localeCompare(a.creado));
  }, [guardados, hoy, yo?.rol]);

  const registrar = useCallback(async (p: NuevoPago) => {
    const nuevo: Pago = {
      id: crypto.randomUUID(), alumno_id: p.alumno_id, monto: p.monto, moneda: p.moneda, metodo: p.metodo,
      referencia: p.referencia, comprobante: p.comprobante,
      estado: p.confirmado ? "confirmado" : "pendiente", vence: p.confirmado?.vence,
      creado: new Date().toISOString(),
    };
    set((prev) => [...prev, nuevo]);
    return null as string | null;
  }, [set]);

  const resolver = useCallback(async (id: string, estado: "confirmado" | "rechazado", vence?: string) => {
    const actual = pagos.find((p) => p.id === id);
    if (!actual) return "No se encontró el pago.";
    const nuevo: Pago = { ...actual, estado, vence: estado === "confirmado" ? vence : undefined };
    set((prev) => (prev.some((p) => p.id === id) ? prev.map((p) => (p.id === id ? nuevo : p)) : [...prev, nuevo]));
    return null as string | null;
  }, [pagos, set]);

  return { pagos, registrar, resolver };
}

type FilaPago = {
  id: number | string; alumno_id: string; monto: number | string; moneda: string; metodo: Metodo;
  referencia: string | null; comprobante: string | null; estado: Pago["estado"]; vence: string | null; creado: string;
};

function aPago(p: FilaPago): Pago {
  return {
    id: String(p.id), alumno_id: p.alumno_id, monto: Number(p.monto), moneda: p.moneda, metodo: p.metodo,
    referencia: p.referencia ?? "", comprobante: p.comprobante ?? undefined, estado: p.estado,
    vence: p.vence ?? undefined, creado: p.creado,
  };
}

function usePagosRemoto(yo: Usuario | null): ApiPagos {
  const uid = yo?.id ?? "";
  const cargar = useCallback(async (): Promise<Pago[]> => {
    if (!uid) return [];
    // Las reglas de privacidad ya limitan: el alumno ve los suyos y la entrenadora los de sus alumnos.
    const filas = await traerTodo<FilaPago>((a, b) =>
      db().from("pagos")
        .select("id,alumno_id,monto,moneda,metodo,referencia,comprobante,estado,vence,creado")
        .order("creado", { ascending: false }).order("id").range(a, b));
    return filas.map(aPago);
  }, [uid]);
  const [pagos, recargar] = useRemoto(cargar, VACIO_PAGOS);

  const registrar = useCallback(async (p: NuevoPago) => {
    const esCoach = yo?.rol === "entrenador";
    const entrenador = esCoach ? uid : yo?.entrenadorId;
    if (!entrenador) return "Primero vincúlate con tu entrenador/a desde tu Panel.";
    const { error } = await db().from("pagos").insert({
      alumno_id: p.alumno_id, entrenador_id: entrenador, monto: p.monto, moneda: p.moneda, metodo: p.metodo,
      referencia: p.referencia, comprobante: p.comprobante ?? null,
      estado: p.confirmado ? "confirmado" : "pendiente", vence: p.confirmado?.vence ?? null,
    });
    if (!error) recargar();
    return error ? error.message : null;
  }, [uid, yo?.rol, yo?.entrenadorId, recargar]);

  const resolver = useCallback(async (id: string, estado: "confirmado" | "rechazado", vence?: string) => {
    const { error } = await db().from("pagos")
      .update({ estado, vence: estado === "confirmado" ? vence ?? null : null }).eq("id", id);
    if (!error) recargar();
    return error ? error.message : null;
  }, [recargar]);

  return { pagos, registrar, resolver };
}

export const usePagos: (yo: Usuario | null) => ApiPagos = modoDemo ? usePagosLocal : usePagosRemoto;

/* ---------- Premium del alumno ---------- */

const SIN_EXC: PremiumModo | null = null;

function useExcepcionLocal(yo: Usuario | null) {
  const [mapa] = useLocal(PREMIUM_EXC_KEY, VACIO_EXC);
  return (yo ? mapa[yo.id] : undefined) ?? SIN_EXC;
}

function useExcepcionRemota(yo: Usuario | null) {
  const uid = yo?.id ?? "";
  const cargar = useCallback(async (): Promise<PremiumModo | null> => {
    if (!uid) return null;
    const { data } = await db().from("premium_excepciones").select("modo").eq("alumno_id", uid).maybeSingle();
    return (data?.modo as PremiumModo | undefined) ?? null;
  }, [uid]);
  return useRemoto<PremiumModo | null>(cargar, SIN_EXC)[0];
}

const useExcepcion: (yo: Usuario | null) => PremiumModo | null = modoDemo ? useExcepcionLocal : useExcepcionRemota;

/** ¿Tiene este alumno el seguimiento personalizado activo? Misma regla que la base de datos. */
export function usePremium(yo: Usuario | null): EstadoPremium {
  const hoy = useToday();
  const { config } = usePagoConfig(yo);
  const { pagos } = usePagos(yo);
  const excepcion = useExcepcion(yo);
  return useMemo(
    () => estadoPremium({
      pagos: pagos.filter((p) => p.alumno_id === yo?.id),
      cobra: yo?.rol === "atleta" && config !== null,
      gracia: config?.gracia ?? GRACIA_POR_DEFECTO,
      excepcion,
      hoy,
    }),
    [pagos, config, excepcion, hoy, yo?.id, yo?.rol],
  );
}
