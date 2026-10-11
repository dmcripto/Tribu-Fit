"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Rol, Usuario } from "./types";

export const USER_KEY = "tf_user";
const CUENTA_DEMO_KEY = "tf_demo_cuenta";

export type Registro = {
  nombre: string;
  email: string;
  password: string;
  objetivo: string;
  nivel: string;
  rol: Rol;
  codigoEntrenador: string;
  datosSalud: boolean;
  comparteTribu: boolean;
  comparteEntrenador: boolean;
};

export type Resultado = { error?: string; aviso?: string };

function guardar(u: Usuario) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  window.dispatchEvent(new Event("storage"));
}

function codigoAleatorio() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(b, (x) => letras[x % letras.length]).join("");
}

/** Crea la fila de perfil la primera vez que el usuario inicia sesión. */
async function asegurarPerfil(
  db: SupabaseClient,
  user: User,
): Promise<{ usuario?: Usuario; error?: string }> {
  const cols = "id,nombre,rol,objetivo,nivel,codigo_invitacion,entrenador_id";
  let { data: fila } = await db.from("usuarios").select(cols).eq("id", user.id).maybeSingle();

  if (!fila) {
    const m = user.user_metadata as Record<string, string | boolean | undefined>;
    const rol: Rol = m.rol === "entrenador" ? "entrenador" : "atleta";
    const e1 = await db.from("usuarios").insert({
      id: user.id,
      nombre: (m.nombre as string) || (user.email ?? "").split("@")[0],
      rol,
      objetivo: (m.objetivo as string) || null,
      nivel: ((m.nivel as string) || "").toLowerCase() || null,
      codigo_invitacion: rol === "entrenador" ? codigoAleatorio() : null,
    });
    if (e1.error) return { error: e1.error.message };
    const e2 = await db.from("consentimientos").insert({
      usuario_id: user.id,
      datos_salud: m.datos_salud === true,
      comparte_con_tribu: m.comparte_tribu === true,
      comparte_con_entrenador: m.comparte_entrenador === true,
    });
    if (e2.error) return { error: e2.error.message };
    if (m.codigo_entrenador) {
      await db.rpc("vincular_entrenador", { p_codigo: m.codigo_entrenador });
    }
    ({ data: fila } = await db.from("usuarios").select(cols).eq("id", user.id).maybeSingle());
  }
  if (!fila) return { error: "No se pudo cargar tu perfil." };
  return {
    usuario: {
      id: fila.id,
      nombre: fila.nombre,
      email: user.email ?? "",
      objetivo: fila.objetivo ?? "",
      nivel: fila.nivel ?? "",
      rol: fila.rol,
      codigo: fila.codigo_invitacion ?? undefined,
      entrenadorId: fila.entrenador_id,
    },
  };
}

export async function registrar(r: Registro): Promise<Resultado> {
  if (!supabase) {
    const u: Usuario = {
      id: crypto.randomUUID(),
      nombre: r.nombre,
      email: r.email,
      objetivo: r.objetivo,
      nivel: r.nivel,
      rol: r.rol,
      codigo: r.rol === "entrenador" ? codigoAleatorio() : undefined,
    };
    // La cuenta de demo se conserva al salir para poder volver a entrar.
    localStorage.setItem(CUENTA_DEMO_KEY, JSON.stringify({ u, password: r.password }));
    guardar(u);
    return {};
  }
  const { data, error } = await supabase.auth.signUp({
    email: r.email,
    password: r.password,
    options: {
      data: {
        nombre: r.nombre,
        objetivo: r.objetivo,
        nivel: r.nivel,
        rol: r.rol,
        codigo_entrenador: r.codigoEntrenador,
        datos_salud: r.datosSalud,
        comparte_tribu: r.comparteTribu,
        comparte_entrenador: r.comparteEntrenador,
      },
    },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "No se pudo crear la cuenta. Inténtalo de nuevo." };
  if (!data.session) {
    return { aviso: "Te hemos enviado un correo. Confírmalo y luego inicia sesión." };
  }
  const p = await asegurarPerfil(supabase, data.user);
  if (p.error || !p.usuario) return { error: p.error };
  guardar(p.usuario);
  return {};
}

export async function entrar(email: string, password: string): Promise<Resultado> {
  if (!supabase) {
    const raw = localStorage.getItem(CUENTA_DEMO_KEY);
    if (!raw) return { error: "No hay ninguna cuenta de demo. Crea una en Registro." };
    const { u, password: clave } = JSON.parse(raw) as { u: Usuario; password: string };
    if (u.email.toLowerCase() !== email.toLowerCase() || clave !== password)
      return { error: "Correo o contraseña incorrectos." };
    guardar(u);
    return {};
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  const p = await asegurarPerfil(supabase, data.user);
  if (p.error || !p.usuario) return { error: p.error };
  guardar(p.usuario);
  return {};
}

/** Vincula al alumno con su entrenador/a mediante el código de invitación. */
export async function vincularEntrenador(codigo: string): Promise<string | null> {
  if (!supabase) return "El vínculo con entrenador necesita Supabase.";
  const { data, error } = await supabase.rpc("vincular_entrenador", { p_codigo: codigo });
  if (error) return error.message;
  if (!data) return "Ese código no existe. Pídele el correcto a tu entrenador/a.";
  const raw = localStorage.getItem(USER_KEY);
  if (raw) {
    const u = JSON.parse(raw) as Usuario;
    const { data: fila } = await supabase
      .from("usuarios").select("entrenador_id").eq("id", u.id).maybeSingle();
    guardar({ ...u, entrenadorId: fila?.entrenador_id ?? null });
  }
  return null;
}

export async function salir() {
  if (supabase) await supabase.auth.signOut();
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("storage"));
}
