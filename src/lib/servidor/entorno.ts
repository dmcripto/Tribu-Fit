import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cifrar, descifrar } from "./cripto";
import type { Datos, Entorno } from "./mp";

export function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Quién llama: valida el token de sesión que manda la app y devuelve el id de usuario. */
export async function usuarioDeLaPeticion(req: Request, db: SupabaseClient): Promise<string | null> {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const { data, error } = await db.auth.getUser(m[1]);
  return error || !data.user ? null : data.user.id;
}

const falla = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

export function datosSupabase(db: SupabaseClient): Datos {
  return {
    async usuario(id) {
      const { data, error } = await db.from("usuarios").select("id,rol,entrenador_id").eq("id", id).maybeSingle();
      falla(error);
      return data as never;
    },
    async config(coach) {
      const { data, error } = await db.from("pago_config").select("moneda,precio").eq("entrenador_id", coach).maybeSingle();
      falla(error);
      return data ? { moneda: data.moneda, precio: Number(data.precio) } : null;
    },
    async cuenta(coach) {
      const { data, error } = await db.from("mp_cuentas").select("token_cifrado").eq("entrenador_id", coach).maybeSingle();
      falla(error);
      return data;
    },
    async guardarCuenta(coach, c) {
      const { error } = await db.from("mp_cuentas").upsert({ entrenador_id: coach, ...c, conectado: new Date().toISOString() });
      falla(error);
    },
    async borrarCuenta(coach) {
      const { error } = await db.from("mp_cuentas").delete().eq("entrenador_id", coach);
      falla(error);
    },
    async pagosConfirmados(alumno) {
      const { data, error } = await db.from("pagos").select("vence").eq("alumno_id", alumno).eq("estado", "confirmado");
      falla(error);
      return (data ?? []) as { vence: string | null }[];
    },
    async pagoPorMp(mpId) {
      const { data, error } = await db.from("pagos").select("id,estado,alumno_id,entrenador_id").eq("mp_payment_id", mpId).maybeSingle();
      falla(error);
      return data ? { ...data, id: String(data.id) } as never : null;
    },
    async insertarPago(p) {
      const { error } = await db.from("pagos").insert({ ...p, metodo: "mercadopago", estado: "confirmado" });
      // Dos avisos del mismo pago a la vez: el segundo choca con el índice único y no es un error.
      if (error && error.code !== "23505") throw new Error(error.message);
    },
    async actualizarPago(id, parche) {
      const { error } = await db.from("pagos").update(parche).eq("id", Number(id));
      falla(error);
    },
  };
}

/** Dirección pública de la web: la configurada, o la de la petición. */
export function baseUrl(req: Request): string {
  const fija = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (fija) return fija;
  const u = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? u.host;
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function entorno(req: Request, db: SupabaseClient = admin()): Entorno {
  return {
    fetch,
    datos: datosSupabase(db),
    cifrar: (t) => cifrar(t),
    descifrar: (t) => descifrar(t),
    // Fecha de Argentina (UTC-3), para que la cuota venza a medianoche de allá.
    hoy: () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10),
    baseUrl: baseUrl(req),
    mpApi: process.env.MP_API_BASE || undefined,
  };
}
