"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { salir, USER_KEY } from "./auth";
import { supabase } from "./supabase";
import type { Usuario } from "./types";

export type Permisos = { tribu: boolean; entrenador: boolean };

/** Lee los permisos de compartir. Solo existen con Supabase. */
export async function leerPermisos(uid: string): Promise<Permisos | null> {
  if (!supabase || !uid) return null;
  const { data } = await supabase.from("consentimientos")
    .select("comparte_con_tribu,comparte_con_entrenador").eq("usuario_id", uid).maybeSingle();
  return data ? { tribu: !!data.comparte_con_tribu, entrenador: !!data.comparte_con_entrenador } : null;
}

export async function guardarPermisos(uid: string, p: Permisos): Promise<string | null> {
  if (!supabase) return "Los permisos necesitan Supabase.";
  const { error } = await supabase.from("consentimientos")
    .update({ comparte_con_tribu: p.tribu, comparte_con_entrenador: p.entrenador, actualizado: new Date().toISOString() })
    .eq("usuario_id", uid);
  return error ? error.message : null;
}

/** Todo lo que Tribu Fit guarda de la persona, para que pueda llevárselo. */
export async function exportarDatos(usuario: Usuario): Promise<Record<string, unknown>> {
  const base = { exportado: new Date().toISOString(), cuenta: { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, objetivo: usuario.objetivo, nivel: usuario.nivel } };
  if (!supabase) {
    // Modo demo: todo vive en el navegador. La contraseña de demo no se exporta.
    const datos: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("tf_") || k === "tf_demo_cuenta" || k === USER_KEY) continue;
      try { datos[k.slice(3)] = JSON.parse(localStorage.getItem(k) ?? "null"); } catch { /* se omite */ }
    }
    return { ...base, datos };
  }
  const db = supabase as SupabaseClient;
  const uid = usuario.id;
  const pedir = async (tabla: string, columna: string) => {
    const filas: unknown[] = [];
    for (let desde = 0; ; desde += 1000) {
      const { data } = await db.from(tabla).select("*").eq(columna, uid).range(desde, desde + 999);
      filas.push(...(data ?? []));
      if (!data || data.length < 1000) return filas;
    }
  };
  const colMensajes = usuario.rol === "entrenador" ? "entrenador_id" : "alumno_id";
  const [perfil, permisos, perfilEntrenamiento, medidas, entrenos, comidas, agua, pagos, planes, objetivo, cobro, mensajes, avisos, fotos, marcas, retos] = await Promise.all([
    pedir("usuarios", "id"), pedir("consentimientos", "usuario_id"), pedir("perfiles_fitness", "alumno_id"), pedir("medidas", "usuario_id"),
    pedir("entrenos", "usuario_id"), pedir("comidas", "usuario_id"), pedir("agua", "usuario_id"),
    pedir("pagos", "alumno_id"), pedir("planes", "alumno_id"), pedir("nutricion_objetivos", "alumno_id"),
    usuario.rol === "entrenador" ? pedir("pago_config", "entrenador_id") : Promise.resolve([]),
    pedir("mensajes", colMensajes).catch(() => []), pedir("avisos", "usuario_id").catch(() => []),
    pedir("fotos_progreso", "usuario_id").catch(() => []), pedir("marcas", "usuario_id").catch(() => []),
    usuario.rol === "entrenador" ? pedir("retos", "entrenador_id").catch(() => []) : Promise.resolve([]),
  ]);
  return { ...base, datos: { perfil, permisos, perfil_entrenamiento: perfilEntrenamiento, medidas, entrenos, comidas, agua, pagos, planes, objetivo_nutricion: objetivo, cobro, mensajes, avisos, fotos_progreso: fotos, marcas, retos } };
}

/** Descarga un objeto como archivo JSON. */
export function descargarJson(nombre: string, datos: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Borra la cuenta y todos sus datos de forma definitiva. */
export async function eliminarCuenta(): Promise<string | null> {
  if (supabase) {
    const { error } = await supabase.rpc("eliminar_mi_cuenta");
    if (error) {
      return /eliminar_mi_cuenta/i.test(error.message)
        ? "Falta activar el borrado de cuentas en la base de datos (migración 005)."
        : error.message;
    }
  }
  await salir();
  // También se limpia lo que quede guardado en este navegador.
  const claves: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("tf_")) claves.push(k);
  }
  claves.forEach((k) => localStorage.removeItem(k));
  return null;
}
