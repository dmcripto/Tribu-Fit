import { siguienteVencimiento } from "../datos";
import type { Pago } from "../types";

/** Lo que la lógica necesita de la base de datos y del exterior. Se inyecta para poder probarla. */
export type Datos = {
  usuario(id: string): Promise<{ id: string; rol: "atleta" | "entrenador"; entrenador_id: string | null } | null>;
  config(entrenadorId: string): Promise<{ moneda: string; precio: number } | null>;
  cuenta(entrenadorId: string): Promise<{ token_cifrado: string } | null>;
  guardarCuenta(entrenadorId: string, c: { token_cifrado: string; mp_user_id: string; apodo: string }): Promise<void>;
  borrarCuenta(entrenadorId: string): Promise<void>;
  /** Pagos confirmados del alumno (para calcular el nuevo vencimiento). */
  pagosConfirmados(alumnoId: string): Promise<{ vence: string | null }[]>;
  pagoPorMp(mpId: string): Promise<{ id: string; estado: "pendiente" | "confirmado" | "rechazado"; alumno_id: string; entrenador_id: string } | null>;
  insertarPago(p: {
    alumno_id: string; entrenador_id: string; monto: number; moneda: string; referencia: string;
    mp_payment_id: string; vence: string;
  }): Promise<void>;
  actualizarPago(id: string, parche: { estado: "confirmado" | "rechazado"; vence?: string }): Promise<void>;
};

export type Entorno = {
  fetch: typeof fetch;
  datos: Datos;
  cifrar(t: string): string;
  descifrar(t: string): string;
  /** Fecha de hoy en Argentina (AAAA-MM-DD). */
  hoy(): string;
  /** Dirección pública de la web, sin barra final. */
  baseUrl: string;
  mpApi?: string;
};

export class ErrorMp extends Error {
  estado: number;
  constructor(mensaje: string, estado = 400) {
    super(mensaje);
    this.estado = estado;
  }
}

const API = "https://api.mercadopago.com";
const TOKEN_OK = /^(APP_USR|TEST)-[A-Za-z0-9_-]{20,200}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function mp(env: Entorno, token: string, ruta: string, init?: RequestInit) {
  let r: Response;
  try {
    r = await env.fetch(`${env.mpApi ?? API}${ruta}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ErrorMp("No pudimos comunicarnos con Mercado Pago. Prueba de nuevo en un momento.", 502);
  }
  let cuerpo: unknown = null;
  try { cuerpo = await r.json(); } catch { /* sin cuerpo */ }
  return { ok: r.ok, estado: r.status, cuerpo: cuerpo as Record<string, unknown> | null };
}

/** La entrenadora conecta su cuenta pegando su Access Token de producción. */
export async function conectar(env: Entorno, usuarioId: string, token: string) {
  const u = await env.datos.usuario(usuarioId);
  if (!u || u.rol !== "entrenador") throw new ErrorMp("Solo las entrenadoras pueden conectar Mercado Pago.", 403);
  const t = token.trim();
  if (!TOKEN_OK.test(t)) throw new ErrorMp("Ese no parece un Access Token de Mercado Pago. Empieza con APP_USR-.");
  const r = await mp(env, t, "/users/me");
  if (!r.ok || !r.cuerpo || r.cuerpo.id === undefined) throw new ErrorMp("Mercado Pago no aceptó esa credencial. Revisa que sea el Access Token de producción.");
  const apodo = String(r.cuerpo.nickname ?? r.cuerpo.email ?? "").slice(0, 80);
  await env.datos.guardarCuenta(usuarioId, { token_cifrado: env.cifrar(t), mp_user_id: String(r.cuerpo.id), apodo });
  return { apodo };
}

export async function desconectar(env: Entorno, usuarioId: string) {
  const u = await env.datos.usuario(usuarioId);
  if (!u || u.rol !== "entrenador") throw new ErrorMp("Solo las entrenadoras pueden desconectar Mercado Pago.", 403);
  await env.datos.borrarCuenta(usuarioId);
}

/** El alumno quiere pagar su cuota: se crea la preferencia en la cuenta de su entrenadora. */
export async function crearPago(env: Entorno, alumnoId: string) {
  const alumno = await env.datos.usuario(alumnoId);
  if (!alumno || alumno.rol !== "atleta" || !alumno.entrenador_id) throw new ErrorMp("Primero vincúlate con tu entrenador/a.", 403);
  const coach = alumno.entrenador_id;
  const [config, cuenta] = await Promise.all([env.datos.config(coach), env.datos.cuenta(coach)]);
  if (!config || !(config.precio > 0)) throw new ErrorMp("Tu entrenador/a aún no configuró la cuota.", 409);
  if (!cuenta) throw new ErrorMp("Tu entrenador/a no tiene Mercado Pago conectado.", 409);
  const token = env.descifrar(cuenta.token_cifrado);
  const base = env.baseUrl;
  const r = await mp(env, token, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [{ id: "cuota", title: "Cuota mensual Tribu Fit", quantity: 1, unit_price: config.precio, currency_id: config.moneda }],
      external_reference: `tf:${alumno.id}`,
      notification_url: `${base}/api/mp/webhook?c=${coach}`,
      back_urls: { success: `${base}/pagos?mp=ok`, pending: `${base}/pagos?mp=pendiente`, failure: `${base}/pagos?mp=error` },
      auto_return: "approved",
      statement_descriptor: "TRIBUFIT",
    }),
  });
  const url = r.cuerpo && (token.startsWith("TEST-") ? r.cuerpo.sandbox_init_point : r.cuerpo.init_point);
  if (!r.ok || typeof url !== "string" || !url.startsWith("https://")) {
    throw new ErrorMp("Mercado Pago no pudo crear el pago. Avisa a tu entrenador/a para que revise su conexión.", 502);
  }
  return { url };
}

export type Resultado =
  | { estado: "confirmado" | "ya_confirmado" | "rechazado" }
  | { estado: "ignorado"; motivo: string };

const MALOS = new Set(["refunded", "charged_back", "cancelled", "rejected"]);

/** Aviso de Mercado Pago: se consulta el pago directamente a Mercado Pago antes de creerle a nadie. */
export async function procesarNotificacion(env: Entorno, entrenadorId: string, pagoId: string): Promise<Resultado> {
  const ign = (motivo: string): Resultado => ({ estado: "ignorado", motivo });
  if (!UUID.test(entrenadorId) || !/^\d{1,20}$/.test(pagoId)) return ign("datos inválidos");
  const cuenta = await env.datos.cuenta(entrenadorId);
  if (!cuenta) return ign("entrenadora sin Mercado Pago");
  const r = await mp(env, env.descifrar(cuenta.token_cifrado), `/v1/payments/${pagoId}`);
  if (r.estado === 404 || r.estado === 400) return ign("pago no encontrado en esa cuenta");
  if (!r.ok || !r.cuerpo) throw new ErrorMp("Mercado Pago no respondió.", 502); // error nuestro/de ellos: que reintenten
  const p = r.cuerpo;
  if (String(p.id) !== pagoId) return ign("id distinto");
  const ref = /^tf:(.+)$/.exec(String(p.external_reference ?? ""));
  if (!ref || !UUID.test(ref[1])) return ign("sin referencia de Tribu Fit");
  const alumno = await env.datos.usuario(ref[1]);
  if (!alumno || alumno.rol !== "atleta" || alumno.entrenador_id !== entrenadorId) return ign("el alumno no es de esta entrenadora");
  const status = String(p.status);
  const existente = await env.datos.pagoPorMp(pagoId);
  if (existente && (existente.alumno_id !== alumno.id || existente.entrenador_id !== entrenadorId)) return ign("pago ya asociado a otro alumno");

  if (MALOS.has(status)) {
    if (existente && existente.estado !== "rechazado") {
      await env.datos.actualizarPago(existente.id, { estado: "rechazado" });
      return { estado: "rechazado" };
    }
    return ign(`estado ${status}`);
  }
  if (status !== "approved") return ign(`estado ${status}`);
  if (existente?.estado === "confirmado") return { estado: "ya_confirmado" };

  const config = await env.datos.config(entrenadorId);
  const monto = Number(p.transaction_amount);
  if (!config || !(monto > 0) || monto + 0.005 < config.precio || String(p.currency_id) !== config.moneda) return ign("el monto o la moneda no coinciden con la cuota");

  const previos = (await env.datos.pagosConfirmados(alumno.id)).map((x) => ({ estado: "confirmado", vence: x.vence ?? undefined }) as Pago);
  const vence = siguienteVencimiento(previos, env.hoy());
  if (existente) await env.datos.actualizarPago(existente.id, { estado: "confirmado", vence });
  else await env.datos.insertarPago({
    alumno_id: alumno.id, entrenador_id: entrenadorId, monto, moneda: config.moneda, referencia: `MP ${pagoId}`, mp_payment_id: pagoId, vence,
  });
  return { estado: "confirmado" };
}

/** Saca el id del pago de los distintos formatos de aviso de Mercado Pago. */
export function idDeAviso(url: URL, cuerpo: unknown): string | null {
  const b = (cuerpo && typeof cuerpo === "object" ? cuerpo : {}) as { type?: unknown; topic?: unknown; data?: { id?: unknown }; id?: unknown; resource?: unknown };
  const tipo = String(url.searchParams.get("type") ?? url.searchParams.get("topic") ?? b.type ?? b.topic ?? "");
  if (tipo !== "payment") return null;
  const id = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? b.data?.id ?? b.id ?? (typeof b.resource === "string" ? b.resource.split("/").pop() : undefined);
  return id === undefined || id === null ? null : String(id);
}
