"use client";

import { supabase } from "./supabase";
import type { Usuario } from "./types";

export const USER_KEY = "tf_user";
const CUENTA_DEMO_KEY = "tf_demo_cuenta";

export type Registro = {
  nombre: string;
  email: string;
  password: string;
  objetivo: string;
  nivel: string;
  datosSalud: boolean;
  comparteTribu: boolean;
  comparteEntrenador: boolean;
};

function guardar(u: Usuario) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  window.dispatchEvent(new Event("storage"));
}

export async function registrar(r: Registro): Promise<string | null> {
  if (!supabase) {
    const u: Usuario = {
      id: crypto.randomUUID(),
      nombre: r.nombre,
      email: r.email,
      objetivo: r.objetivo,
      nivel: r.nivel,
    };
    // La cuenta de demo se conserva al salir para poder volver a entrar.
    localStorage.setItem(CUENTA_DEMO_KEY, JSON.stringify({ u, password: r.password }));
    guardar(u);
    return null;
  }
  const { data, error } = await supabase.auth.signUp({
    email: r.email,
    password: r.password,
    options: { data: { nombre: r.nombre } },
  });
  if (error) return error.message;
  if (!data.user) return "No se pudo crear la cuenta. Inténtalo de nuevo.";
  // Con confirmación de correo activada no hay sesión todavía: el perfil se
  // completa en el primer inicio de sesión.
  if (data.session) {
    const { error: e1 } = await supabase.from("usuarios").insert({
      id: data.user.id,
      nombre: r.nombre,
      objetivo: r.objetivo,
      nivel: r.nivel.toLowerCase(),
    });
    if (e1) return e1.message;
    const { error: e2 } = await supabase.from("consentimientos").insert({
      usuario_id: data.user.id,
      datos_salud: r.datosSalud,
      comparte_con_tribu: r.comparteTribu,
      comparte_con_entrenador: r.comparteEntrenador,
    });
    if (e2) return e2.message;
  }
  guardar({
    id: data.user.id,
    nombre: r.nombre,
    email: r.email,
    objetivo: r.objetivo,
    nivel: r.nivel,
  });
  return null;
}

export async function entrar(
  email: string,
  password: string,
): Promise<string | null> {
  if (!supabase) {
    const raw = localStorage.getItem(CUENTA_DEMO_KEY);
    if (!raw) return "No hay ninguna cuenta de demo. Crea una en Registro.";
    const { u, password: clave } = JSON.parse(raw) as { u: Usuario; password: string };
    if (u.email.toLowerCase() !== email.toLowerCase() || clave !== password)
      return "Correo o contraseña incorrectos.";
    guardar(u);
    return null;
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return error.message;
  const meta = data.user.user_metadata as { nombre?: string };
  guardar({
    id: data.user.id,
    nombre: meta.nombre ?? email.split("@")[0],
    email,
    objetivo: "",
    nivel: "",
  });
  return null;
}

export async function salir() {
  if (supabase) await supabase.auth.signOut();
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("storage"));
}
