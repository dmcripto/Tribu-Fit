"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect } from "react";
import { useRemoto } from "./repo";
import { useLocal } from "./store";
import { modoDemo, supabase } from "./supabase";
import type { Usuario } from "./types";

const db = () => supabase as SupabaseClient;
export const AVATAR_KEY = "tf_avatar";
const SIN: string | null = null;

/** Las copias que muestran la foto (menú, Cuenta…) se avisan entre sí cuando cambia. */
const avisar = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event("tf-avatar")); };
function useEscucharAvatar(recargar: () => void) {
  useEffect(() => {
    window.addEventListener("tf-avatar", recargar);
    return () => window.removeEventListener("tf-avatar", recargar);
  }, [recargar]);
}

export type ApiAvatar = { avatar: string | null; guardar: (url: string | null) => Promise<string | null> };

function useMiAvatarLocal(): ApiAvatar {
  const [avatar, set] = useLocal<string | null>(AVATAR_KEY, SIN);
  const guardar = useCallback(async (url: string | null) => { set(url); return null as string | null; }, [set]);
  return { avatar, guardar };
}

function useMiAvatarRemoto(yo: Usuario | null): ApiAvatar {
  const uid = yo?.id ?? "";
  const cargar = useCallback(async (): Promise<string | null> => {
    if (!uid) return null;
    // Si aún no se ejecutó la migración 011 la consulta falla y simplemente no hay foto.
    const { data, error } = await db().from("usuarios").select("avatar").eq("id", uid).maybeSingle();
    return error ? null : ((data as { avatar: string | null } | null)?.avatar ?? null);
  }, [uid]);
  const [avatar, recargar] = useRemoto(cargar, SIN);
  useEscucharAvatar(recargar);
  const guardar = useCallback(async (url: string | null) => {
    const { error } = await db().from("usuarios").update({ avatar: url }).eq("id", uid);
    if (error) return /avatar/i.test(error.message) ? "Falta activar la foto de perfil en la base de datos (migración 011)." : error.message;
    avisar();
    return null;
  }, [uid]);
  return { avatar, guardar };
}

/** La foto de perfil de la persona que usa la app. */
export const useMiAvatar: (yo: Usuario | null) => ApiAvatar = modoDemo ? useMiAvatarLocal : useMiAvatarRemoto;

const NADIE: Record<string, string> = {};

/** Fotos de perfil de los alumnos de la entrenadora (id → foto). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useAvataresLocal(_yo: Usuario | null): Record<string, string> {
  return NADIE;
}
function useAvataresRemoto(yo: Usuario | null): Record<string, string> {
  const uid = yo?.rol === "entrenador" ? yo.id : "";
  const cargar = useCallback(async (): Promise<Record<string, string>> => {
    if (!uid) return NADIE;
    const { data, error } = await db().from("usuarios").select("id,avatar").eq("entrenador_id", uid).not("avatar", "is", null).limit(2000);
    if (error) return NADIE;
    const m: Record<string, string> = {};
    for (const f of (data ?? []) as { id: string; avatar: string }[]) m[f.id] = f.avatar;
    return m;
  }, [uid]);
  const [m] = useRemoto(cargar, NADIE);
  return m;
}
export const useAvataresAlumnos: (yo: Usuario | null) => Record<string, string> = modoDemo ? useAvataresLocal : useAvataresRemoto;

export type PerfilEntrenador = { nombre: string; avatar: string | null };

/** Nombre y foto de la entrenadora de un alumno. */
function useEntrenadorLocal(): PerfilEntrenador | null { return null; }
function useEntrenadorRemoto(yo: Usuario | null): PerfilEntrenador | null {
  const uid = yo?.rol === "atleta" ? yo.id : "";
  const cargar = useCallback(async (): Promise<PerfilEntrenador | null> => {
    if (!uid) return null;
    const { data, error } = await db().rpc("mi_entrenador");
    const f = (data as { nombre: string; avatar: string | null }[] | null)?.[0];
    return error || !f ? null : { nombre: f.nombre, avatar: f.avatar };
  }, [uid]);
  const [p] = useRemoto(cargar, null as PerfilEntrenador | null);
  return p;
}
export const useEntrenadorPerfil: (yo: Usuario | null) => PerfilEntrenador | null = modoDemo ? useEntrenadorLocal : useEntrenadorRemoto;
