"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo } from "react";
import { ENTRENOS_KEY, VACIO_ENTRENOS, sumarDias } from "./datos";
import { muestra, useRemoto } from "./repo";
import { useLocal, useToday } from "./store";
import { modoDemo, supabase } from "./supabase";
import type { Aviso, FilaRanking, FotoProgreso, Marca, Mensaje, Reto, Usuario } from "./types";

const db = () => supabase as SupabaseClient;

export const MENSAJES_KEY = "tf_mensajes";
export const AVISOS_KEY = "tf_avisos";
export const FOTOS_KEY = "tf_fotos";
export const MARCAS_KEY = "tf_marcas";
export const RETOS_KEY = "tf_retos";
export const LEIDOS_KEY = "tf_recordatorios_leidos";
export const COACH_DEMO = "demo-entrenador";

const VACIO_MENSAJES: Mensaje[] = [];
const VACIO_AVISOS: Aviso[] = [];
const VACIO_FOTOS: FotoProgreso[] = [];
const VACIO_MARCAS: Marca[] = [];
const VACIO_RETOS: Reto[] = [];
const VACIO_LEIDOS: string[] = [];

/** Refresca una carga remota cada `ms` mientras la pestaña está visible. */
function useRefresco(recargar: () => void, ms: number) {
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") recargar();
    }, ms);
    return () => clearInterval(t);
  }, [recargar, ms]);
}

/* ---------- Chat ---------- */

/** Avisa a la barra de navegación de que cambió el número de mensajes sin leer. */
const avisarChat = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("tf-chat"));
};

export type ApiChat = {
  mensajes: Mensaje[];
  enviar: (texto: string, contexto?: string) => Promise<string | null>;
  marcarLeidos: () => Promise<void>;
};

/** Conversación entre el alumno `alumnoId` y su entrenador/a. */
function useChatLocal(yo: Usuario | null, alumnoId: string): ApiChat {
  const [todos, set] = useLocal(MENSAJES_KEY, VACIO_MENSAJES);
  const esCoach = yo?.rol === "entrenador";
  const mensajes = useMemo(
    () => todos.filter((m) => m.alumno_id === alumnoId).sort((a, b) => a.creado.localeCompare(b.creado)),
    [todos, alumnoId],
  );
  const enviar = useCallback(async (texto: string, contexto?: string) => {
    const t = texto.trim();
    if (!t) return "Escribe un mensaje.";
    set((prev) => [...prev, {
      id: crypto.randomUUID(), alumno_id: alumnoId, entrenador_id: COACH_DEMO, de_entrenador: esCoach,
      texto: t.slice(0, 2000), contexto, leido: false, creado: new Date().toISOString(),
    }]);
    return null as string | null;
  }, [set, alumnoId, esCoach]);
  const marcarLeidos = useCallback(async () => {
    set((prev) => (prev.some((m) => m.alumno_id === alumnoId && m.de_entrenador !== esCoach && !m.leido)
      ? prev.map((m) => (m.alumno_id === alumnoId && m.de_entrenador !== esCoach ? { ...m, leido: true } : m))
      : prev));
  }, [set, alumnoId, esCoach]);
  return { mensajes, enviar, marcarLeidos };
}

type FilaMensaje = {
  id: number; alumno_id: string; entrenador_id: string; de_entrenador: boolean;
  texto: string; contexto: string | null; leido: boolean; creado: string;
};
const aMensaje = (f: FilaMensaje): Mensaje => ({
  id: String(f.id), alumno_id: f.alumno_id, entrenador_id: f.entrenador_id, de_entrenador: f.de_entrenador,
  texto: f.texto, contexto: f.contexto ?? undefined, leido: f.leido, creado: f.creado,
});

function useChatRemoto(yo: Usuario | null, alumnoId: string): ApiChat {
  const esCoach = yo?.rol === "entrenador";
  const yoId = yo?.id ?? "";
  const coachId = esCoach ? yoId : yo?.entrenadorId ?? "";
  const cargar = useCallback(async (): Promise<Mensaje[]> => {
    if (!yoId || !alumnoId || !coachId) return [];
    const { data } = await db().from("mensajes")
      .select("id,alumno_id,entrenador_id,de_entrenador,texto,contexto,leido,creado")
      .eq("alumno_id", alumnoId).eq("entrenador_id", coachId).order("creado", { ascending: false }).limit(200);
    return ((data ?? []) as FilaMensaje[]).map(aMensaje).reverse();
  }, [yoId, alumnoId, coachId]);
  const [mensajes, recargar] = useRemoto(cargar, VACIO_MENSAJES);
  useRefresco(recargar, 8000);
  const enviar = useCallback(async (texto: string, contexto?: string) => {
    const t = texto.trim();
    if (!t) return "Escribe un mensaje.";
    if (!coachId) return "Aún no tienes entrenador/a vinculado/a.";
    const { error } = await db().from("mensajes").insert({
      alumno_id: alumnoId, entrenador_id: coachId, de_entrenador: esCoach, texto: t.slice(0, 2000), contexto: contexto ?? null,
    });
    if (!error) { recargar(); avisarChat(); }
    return error ? (/mensajes/i.test(error.message) ? "Falta activar el chat en la base de datos (migración 007)." : error.message) : null;
  }, [alumnoId, coachId, esCoach, recargar]);
  const marcarLeidos = useCallback(async () => {
    if (!coachId || !alumnoId) return;
    const q = db().from("mensajes").update({ leido: true })
      .eq("alumno_id", alumnoId).eq("entrenador_id", coachId).eq("leido", false).eq("de_entrenador", !esCoach);
    const { error } = await q;
    if (!error) { recargar(); avisarChat(); }
  }, [alumnoId, coachId, esCoach, recargar]);
  return { mensajes, enviar, marcarLeidos };
}

export const useChat: (yo: Usuario | null, alumnoId: string) => ApiChat = modoDemo ? useChatLocal : useChatRemoto;

export type Hilo = { alumno_id: string; ultimo: Mensaje; noLeidos: number };

/** Resumen de conversaciones (para la lista del entrenador y la insignia de mensajes sin leer). */
function useHilosLocal(yo: Usuario | null): Hilo[] {
  const [todos] = useLocal(MENSAJES_KEY, VACIO_MENSAJES);
  const esCoach = yo?.rol === "entrenador";
  return useMemo(() => resumirHilos(todos, esCoach), [todos, esCoach]);
}
function resumirHilos(msgs: Mensaje[], esCoach: boolean): Hilo[] {
  const m = new Map<string, Hilo>();
  for (const x of [...msgs].sort((a, b) => a.creado.localeCompare(b.creado))) {
    const h = m.get(x.alumno_id) ?? { alumno_id: x.alumno_id, ultimo: x, noLeidos: 0 };
    h.ultimo = x;
    if (!x.leido && x.de_entrenador !== esCoach) h.noLeidos++;
    m.set(x.alumno_id, h);
  }
  return [...m.values()].sort((a, b) => b.ultimo.creado.localeCompare(a.ultimo.creado));
}
function useHilosRemoto(yo: Usuario | null): Hilo[] {
  const esCoach = yo?.rol === "entrenador";
  const yoId = yo?.id ?? "";
  const cargar = useCallback(async (): Promise<Mensaje[]> => {
    if (!yoId) return [];
    const q = db().from("mensajes").select("id,alumno_id,entrenador_id,de_entrenador,texto,contexto,leido,creado");
    const { data } = await (esCoach ? q.eq("entrenador_id", yoId) : q.eq("alumno_id", yoId))
      .order("creado", { ascending: false }).limit(1000);
    return ((data ?? []) as FilaMensaje[]).map(aMensaje);
  }, [yoId, esCoach]);
  const [msgs, recargar] = useRemoto(cargar, VACIO_MENSAJES);
  useRefresco(recargar, 15000);
  useEffect(() => {
    window.addEventListener("tf-chat", recargar);
    return () => window.removeEventListener("tf-chat", recargar);
  }, [recargar]);
  return useMemo(() => resumirHilos(msgs, esCoach), [msgs, esCoach]);
}
export const useHilos: (yo: Usuario | null) => Hilo[] = modoDemo ? useHilosLocal : useHilosRemoto;

/* ---------- Avisos ---------- */

export type ApiAvisos = {
  avisos: Aviso[];
  noLeidos: number;
  marcarLeido: (id: string) => Promise<void>;
  marcarTodos: () => Promise<void>;
};

function useAvisosLocal(): ApiAvisos {
  const [avisos, set] = useLocal(AVISOS_KEY, VACIO_AVISOS);
  const marcarLeido = useCallback(async (id: string) => set((p) => p.map((a) => (a.id === id ? { ...a, leido: true } : a))), [set]);
  const marcarTodos = useCallback(async () => set((p) => p.map((a) => ({ ...a, leido: true }))), [set]);
  return { avisos, noLeidos: avisos.filter((a) => !a.leido).length, marcarLeido, marcarTodos };
}

type FilaAviso = { id: number; tipo: Aviso["tipo"]; titulo: string; texto: string; enlace: string | null; leido: boolean; creado: string };

function useAvisosRemoto(yo: Usuario | null): ApiAvisos {
  const yoId = yo?.id ?? "";
  const cargar = useCallback(async (): Promise<Aviso[]> => {
    if (!yoId) return [];
    const { data } = await db().from("avisos").select("id,tipo,titulo,texto,enlace,leido,creado")
      .eq("usuario_id", yoId).order("creado", { ascending: false }).limit(60);
    return ((data ?? []) as FilaAviso[]).map((f) => ({
      id: String(f.id), tipo: f.tipo, titulo: f.titulo, texto: f.texto, enlace: f.enlace ?? undefined, leido: f.leido, creado: f.creado,
    }));
  }, [yoId]);
  const [avisos, recargar] = useRemoto(cargar, VACIO_AVISOS);
  useRefresco(recargar, 30000);
  // La campana del menú y la página de avisos son dos copias: se avisan entre sí.
  useEffect(() => {
    window.addEventListener("tf-avisos", recargar);
    return () => window.removeEventListener("tf-avisos", recargar);
  }, [recargar]);
  const marcarLeido = useCallback(async (id: string) => {
    await db().from("avisos").update({ leido: true }).eq("id", Number(id));
    window.dispatchEvent(new Event("tf-avisos"));
  }, []);
  const marcarTodos = useCallback(async () => {
    await db().from("avisos").update({ leido: true }).eq("usuario_id", yoId).eq("leido", false);
    window.dispatchEvent(new Event("tf-avisos"));
  }, [yoId]);
  return { avisos, noLeidos: avisos.filter((a) => !a.leido).length, marcarLeido, marcarTodos };
}
export const useAvisos: (yo: Usuario | null) => ApiAvisos = modoDemo ? useAvisosLocal : useAvisosRemoto;

/** Recordatorios calculados en el dispositivo; se marcan como vistos por día. */
export function useRecordatoriosLeidos() {
  const [leidos, set] = useLocal(LEIDOS_KEY, VACIO_LEIDOS);
  const marcar = useCallback((id: string) => set((p) => (p.includes(id) ? p : [...p.slice(-200), id])), [set]);
  return { leidos, marcar };
}

/* ---------- Fotos de progreso ---------- */

export type ApiFotos = {
  fotos: FotoProgreso[];
  anadir: (f: { fecha: string; nota: string; imagen: string }) => Promise<string | null>;
  borrar: (id: string) => Promise<void>;
};

/** En el modo demo los alumnos de ejemplo no tienen fotos ni marcas propias. */
const esEjemplo = (uid: string) => uid.startsWith("ejemplo-");

function useFotosLocal(uid: string): ApiFotos {
  const [guardadas, set] = useLocal(FOTOS_KEY, VACIO_FOTOS);
  const fotos = esEjemplo(uid) ? VACIO_FOTOS : guardadas;
  const anadir = useCallback(async (f: { fecha: string; nota: string; imagen: string }) => {
    try {
      set((p) => [...p, { id: crypto.randomUUID(), ...f }]);
      return null as string | null;
    } catch {
      return "No se pudo guardar la foto.";
    }
  }, [set]);
  const borrar = useCallback(async (id: string) => set((p) => p.filter((x) => x.id !== id)), [set]);
  return { fotos: useMemo(() => [...fotos].sort((a, b) => b.fecha.localeCompare(a.fecha)), [fotos]), anadir, borrar };
}
function useFotosRemoto(uid: string): ApiFotos {
  const cargar = useCallback(async (): Promise<FotoProgreso[]> => {
    if (!uid) return [];
    const { data } = await db().from("fotos_progreso").select("id,fecha,nota,imagen")
      .eq("usuario_id", uid).order("fecha", { ascending: false }).order("id", { ascending: false }).limit(60);
    return (data ?? []).map((f) => ({ id: String(f.id), fecha: f.fecha, nota: f.nota, imagen: f.imagen }));
  }, [uid]);
  const [fotos, recargar] = useRemoto(cargar, VACIO_FOTOS);
  const anadir = useCallback(async (f: { fecha: string; nota: string; imagen: string }) => {
    const { error } = await db().from("fotos_progreso").insert({ usuario_id: uid, ...f });
    if (!error) recargar();
    return error ? (/fotos_progreso/i.test(error.message) ? "Falta activar las fotos en la base de datos (migración 007)." : error.message) : null;
  }, [uid, recargar]);
  const borrar = useCallback(async (id: string) => {
    await db().from("fotos_progreso").delete().eq("id", Number(id)).eq("usuario_id", uid);
    recargar();
  }, [uid, recargar]);
  return { fotos, anadir, borrar };
}
export const useFotos: (uid: string) => ApiFotos = modoDemo ? useFotosLocal : useFotosRemoto;

/* ---------- Marcas por ejercicio ---------- */

export type ApiMarcas = {
  marcas: Marca[];
  anadir: (m: Omit<Marca, "id">) => Promise<string | null>;
  borrar: (id: string) => Promise<void>;
};

function useMarcasLocal(uid: string): ApiMarcas {
  const [guardadas, set] = useLocal(MARCAS_KEY, VACIO_MARCAS);
  const marcas = esEjemplo(uid) ? VACIO_MARCAS : guardadas;
  const anadir = useCallback(async (m: Omit<Marca, "id">) => {
    set((p) => [...p, { id: crypto.randomUUID(), ...m }]);
    return null as string | null;
  }, [set]);
  const borrar = useCallback(async (id: string) => set((p) => p.filter((x) => x.id !== id)), [set]);
  return { marcas, anadir, borrar };
}
function useMarcasRemoto(uid: string): ApiMarcas {
  const cargar = useCallback(async (): Promise<Marca[]> => {
    if (!uid) return [];
    const { data } = await db().from("marcas").select("id,fecha,ejercicio,peso_kg,reps")
      .eq("usuario_id", uid).order("fecha", { ascending: false }).order("id", { ascending: false }).limit(500);
    return (data ?? []).map((m) => ({ id: String(m.id), fecha: m.fecha, ejercicio: m.ejercicio, peso_kg: Number(m.peso_kg), reps: m.reps }));
  }, [uid]);
  const [marcas, recargar] = useRemoto(cargar, VACIO_MARCAS);
  const anadir = useCallback(async (m: Omit<Marca, "id">) => {
    const { error } = await db().from("marcas").insert({ usuario_id: uid, ...m });
    if (!error) recargar();
    return error ? (/marcas/i.test(error.message) ? "Falta activar las marcas en la base de datos (migración 007)." : error.message) : null;
  }, [uid, recargar]);
  const borrar = useCallback(async (id: string) => {
    await db().from("marcas").delete().eq("id", Number(id)).eq("usuario_id", uid);
    recargar();
  }, [uid, recargar]);
  return { marcas, anadir, borrar };
}
export const useMarcas: (uid: string) => ApiMarcas = modoDemo ? useMarcasLocal : useMarcasRemoto;

/* ---------- Retos ---------- */

export type ApiRetos = {
  retos: Reto[];
  crear: (r: Omit<Reto, "id">) => Promise<string | null>;
  borrar: (id: string) => Promise<void>;
};

function useRetosLocal(): ApiRetos {
  const [retos, set] = useLocal(RETOS_KEY, VACIO_RETOS);
  const crear = useCallback(async (r: Omit<Reto, "id">) => {
    set((p) => [...p, { id: crypto.randomUUID(), ...r }]);
    return null as string | null;
  }, [set]);
  const borrar = useCallback(async (id: string) => set((p) => p.filter((x) => x.id !== id)), [set]);
  return { retos, crear, borrar };
}
function useRetosRemoto(yo: Usuario | null): ApiRetos {
  const yoId = yo?.id ?? "";
  const cargar = useCallback(async (): Promise<Reto[]> => {
    if (!yoId) return [];
    const { data } = await db().from("retos").select("id,titulo,descripcion,meta_entrenos,desde,hasta")
      .order("hasta", { ascending: false }).limit(50);
    return (data ?? []).map((r) => ({ id: String(r.id), titulo: r.titulo, descripcion: r.descripcion, meta_entrenos: r.meta_entrenos, desde: r.desde, hasta: r.hasta }));
  }, [yoId]);
  const [retos, recargar] = useRemoto(cargar, VACIO_RETOS);
  const crear = useCallback(async (r: Omit<Reto, "id">) => {
    const { error } = await db().from("retos").insert({ entrenador_id: yoId, ...r });
    if (!error) recargar();
    return error ? (/retos/i.test(error.message) ? "Faltan los retos en la base de datos (migración 007)." : error.message) : null;
  }, [yoId, recargar]);
  const borrar = useCallback(async (id: string) => {
    await db().from("retos").delete().eq("id", Number(id)).eq("entrenador_id", yoId);
    recargar();
  }, [yoId, recargar]);
  return { retos, crear, borrar };
}
export const useRetos: (yo: Usuario | null) => ApiRetos = modoDemo ? useRetosLocal : useRetosRemoto;

/* ---------- Ranking ---------- */

function useRankingLocal(yo: Usuario | null): FilaRanking[] {
  const hoy = useToday();
  const [entrenos] = useLocal(ENTRENOS_KEY, VACIO_ENTRENOS);
  return useMemo(() => {
    if (!yo || !hoy) return [];
    const desde = sumarDias(hoy, -30);
    const cuenta = (es: { fecha: string }[]) => es.filter((e) => e.fecha > desde && e.fecha <= hoy).length;
    const filas: FilaRanking[] = [
      { usuario_id: yo.id, nombre: yo.nombre, entrenos: cuenta(entrenos), es_yo: true },
      ...muestra(hoy).map((a) => ({ usuario_id: a.id, nombre: a.nombre, entrenos: cuenta(a.entrenos), es_yo: false })),
    ];
    return filas.sort((a, b) => b.entrenos - a.entrenos || a.nombre.localeCompare(b.nombre));
  }, [yo, hoy, entrenos]);
}
function useRankingRemoto(yo: Usuario | null): FilaRanking[] {
  const yoId = yo?.id ?? "";
  const cargar = useCallback(async (): Promise<FilaRanking[]> => {
    if (!yoId) return [];
    const { data } = await db().rpc("ranking_tribu");
    return ((data ?? []) as { usuario_id: string; nombre: string; entrenos: number | string; es_yo: boolean }[])
      .map((f) => ({ usuario_id: f.usuario_id, nombre: f.nombre, entrenos: Number(f.entrenos), es_yo: f.es_yo }));
  }, [yoId]);
  const [filas] = useRemoto(cargar, [] as FilaRanking[]);
  return filas;
}
export const useRanking: (yo: Usuario | null) => FilaRanking[] = modoDemo ? useRankingLocal : useRankingRemoto;
