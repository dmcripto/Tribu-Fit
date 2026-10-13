"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback } from "react";
import { useRemoto } from "./repo";
import { modoDemo, supabase } from "./supabase";
import type { Usuario } from "./types";

const db = () => supabase as SupabaseClient;

async function llamar(ruta: string, metodo: "POST" | "DELETE", cuerpo?: unknown): Promise<{ error?: string; [k: string]: unknown }> {
  if (!supabase) return { error: "El cobro automático necesita Supabase." };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Tu sesión venció. Vuelve a iniciar sesión." };
  try {
    const r = await fetch(ruta, {
      method: metodo,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) return { ...j, error: j.error ?? "No se pudo completar la operación." };
    return j;
  } catch {
    return { error: "No hay conexión. Inténtalo de nuevo." };
  }
}

export type EstadoMp = { cargado: boolean; conectado: boolean; apodo: string };
const INICIAL: EstadoMp = { cargado: false, conectado: false, apodo: "" };
const NADA: EstadoMp = { cargado: true, conectado: false, apodo: "" };

/** ¿Está conectado Mercado Pago? La entrenadora ve su cuenta; el alumno, si su entrenadora cobra así. */
function useMpEstadoRemoto(yo: Usuario | null) {
  const uid = yo?.id ?? "";
  const rol = yo?.rol;
  const cargar = useCallback(async (): Promise<EstadoMp> => {
    if (!uid) return NADA;
    if (rol === "entrenador") {
      const { data } = await db().rpc("mp_estado");
      const f = (data as { conectado: boolean; apodo: string }[] | null)?.[0];
      return { cargado: true, conectado: !!f?.conectado, apodo: f?.apodo ?? "" };
    }
    const { data } = await db().rpc("mp_disponible");
    return { cargado: true, conectado: data === true, apodo: "" };
  }, [uid, rol]);
  return useRemoto(cargar, INICIAL);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useMpEstadoLocal(_yo: Usuario | null) {
  return [NADA, () => {}] as const;
}

export const useMpEstado: (yo: Usuario | null) => readonly [EstadoMp, () => void] = modoDemo ? useMpEstadoLocal : useMpEstadoRemoto;

export const conectarMp = (token: string) => llamar("/api/mp/conectar", "POST", { token }) as Promise<{ error?: string; apodo?: string }>;
export const desconectarMp = () => llamar("/api/mp/conectar", "DELETE");
export const iniciarPagoMp = () => llamar("/api/mp/pagar", "POST") as Promise<{ error?: string; url?: string }>;
