"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { VERSION_LEGAL } from "./legal";
import type { Rol, Usuario } from "./types";

export const USER_KEY = "tf_user";
export const AVISO_KEY = "tf_aviso";
const CUENTA_DEMO_KEY = "tf_demo_cuenta";

export type Registro = {
  nombre: string;
  email: string;
  password: string;
  objetivo: string;
  nivel: string;
  rol: Rol;
  codigoEntrenador: string;
  terminos: boolean;
  datosSalud: boolean;
  comparteTribu: boolean;
  comparteEntrenador: boolean;
};

export type Resultado = { error?: string; aviso?: string };

/** Mensajes de Supabase en español y con la acción a seguir. */
export function traducir(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Correo o contraseña incorrectos. Si aún no tienes cuenta, créala en Registro.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Ese correo ya tiene cuenta. Inicia sesión.";
  if (m.includes("email not confirmed"))
    return "Falta confirmar tu correo. Abre el mensaje que te enviamos y pulsa el enlace.";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Se han hecho demasiados intentos o registros seguidos. Espera unos minutos y vuelve a probar.";
  if (m.includes("password should be"))
    return "La contraseña necesita 8 caracteres o más.";
  if (m.includes("invalid email") || m.includes("unable to validate email"))
    return "Ese correo no es válido.";
  return msg;
}

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
): Promise<{ usuario?: Usuario; error?: string; avisoCodigo?: string }> {
  const cols = "id,nombre,rol,objetivo,nivel,codigo_invitacion,entrenador_id";
  let avisoCodigo: string | undefined;
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
    const permisos = {
      usuario_id: user.id,
      datos_salud: m.datos_salud === true,
      comparte_con_tribu: m.comparte_tribu === true,
      comparte_con_entrenador: m.comparte_entrenador === true,
    };
    const aceptacion = m.terminos_version
      ? { terminos_version: String(m.terminos_version), terminos_fecha: new Date().toISOString() }
      : {};
    let e2 = await db.from("consentimientos").insert({ ...permisos, ...aceptacion });
    // Si aún no se ejecutó la migración 005, la columna de términos no existe: se guarda sin ella.
    if (e2.error && /terminos/i.test(e2.error.message)) e2 = await db.from("consentimientos").insert(permisos);
    if (e2.error) return { error: e2.error.message };
    if (m.codigo_entrenador) {
      const r = await db.rpc("vincular_entrenador", { p_codigo: m.codigo_entrenador });
      if (r.error) {
        avisoCodigo = `Tu cuenta está creada, pero no se pudo usar el código: ${traducir(r.error.message)} Vincúlate desde tu Panel.`;
      } else if (!r.data) {
        avisoCodigo = `Tu cuenta está creada, pero el código "${m.codigo_entrenador}" no existe. Revisa con tu entrenador/a que esté bien escrito y vincúlate desde este Panel.`;
      }
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
    avisoCodigo,
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
      // El enlace del correo de confirmación vuelve a esta web, no a localhost.
      emailRedirectTo: `${window.location.origin}/confirmado`,
      data: {
        nombre: r.nombre,
        objetivo: r.objetivo,
        nivel: r.nivel,
        rol: r.rol,
        codigo_entrenador: r.codigoEntrenador,
        terminos_version: r.terminos ? VERSION_LEGAL : "",
        datos_salud: r.datosSalud,
        comparte_tribu: r.comparteTribu,
        comparte_entrenador: r.comparteEntrenador,
      },
    },
  });
  if (error) return { error: traducir(error.message) };
  if (!data.user) return { error: "No se pudo crear la cuenta. Inténtalo de nuevo." };
  if (!data.session) {
    return { aviso: "Te hemos enviado un correo. Confírmalo y luego inicia sesión." };
  }
  const p = await asegurarPerfil(supabase, data.user);
  if (p.error || !p.usuario) return { error: p.error };
  guardar(p.usuario);
  if (p.avisoCodigo) localStorage.setItem(AVISO_KEY, JSON.stringify(p.avisoCodigo));
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
  if (error) return { error: traducir(error.message) };
  const p = await asegurarPerfil(supabase, data.user);
  if (p.error || !p.usuario) return { error: p.error };
  guardar(p.usuario);
  if (p.avisoCodigo) localStorage.setItem(AVISO_KEY, JSON.stringify(p.avisoCodigo));
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

/* ---------- Recuperar contraseña ---------- */

/** Envía el enlace para elegir una contraseña nueva. Responde igual exista o no la cuenta. */
export async function pedirRecuperacion(email: string): Promise<Resultado> {
  if (!supabase) {
    return { aviso: "En el modo demo no se envían correos. Crea una cuenta nueva para probar." };
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/nueva-clave`,
  });
  if (error) return { error: traducir(error.message) };
  return { aviso: "Si ese correo tiene cuenta, te hemos enviado un enlace para elegir una contraseña nueva. Revisa también la carpeta de spam." };
}

/** Cambia la contraseña de la sesión actual (desde el enlace del correo o desde Cuenta). */
export async function cambiarClave(nueva: string): Promise<string | null> {
  if (!supabase) return "El modo demo no tiene contraseñas reales.";
  const { error } = await supabase.auth.updateUser({ password: nueva });
  return error ? traducir(error.message) : null;
}

/**
 * Termina de iniciar sesión cuando ya hay una sesión de Supabase, por ejemplo al pulsar el
 * enlace de confirmación del correo: crea el perfil si hace falta y deja la cuenta lista.
 */
export async function completarDesdeSesion(): Promise<Resultado> {
  if (!supabase) return { error: "Sin conexión con la base de datos." };
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return { error: "El enlace no es válido o ya venció." };
  const p = await asegurarPerfil(supabase, user);
  if (p.error || !p.usuario) return { error: p.error };
  guardar(p.usuario);
  if (p.avisoCodigo) localStorage.setItem(AVISO_KEY, JSON.stringify(p.avisoCodigo));
  return {};
}
