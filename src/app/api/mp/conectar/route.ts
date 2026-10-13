import { admin, entorno, usuarioDeLaPeticion } from "@/lib/servidor/entorno";
import { conectar, desconectar, ErrorMp } from "@/lib/servidor/mp";

const json = (cuerpo: unknown, estado = 200) => Response.json(cuerpo, { status: estado, headers: { "cache-control": "no-store" } });
const manejar = (e: unknown) => {
  if (e instanceof ErrorMp) return json({ error: e.message }, e.estado);
  console.error("mp/conectar", e instanceof Error ? e.message : e);
  return json({ error: "No pudimos completar la operación. Inténtalo de nuevo." }, 500);
};

export async function POST(req: Request) {
  try {
    const db = admin();
    const uid = await usuarioDeLaPeticion(req, db);
    if (!uid) return json({ error: "Inicia sesión de nuevo." }, 401);
    const cuerpo = (await req.json().catch(() => null)) as { token?: unknown } | null;
    if (typeof cuerpo?.token !== "string") return json({ error: "Falta la credencial." }, 400);
    return json(await conectar(entorno(req, db), uid, cuerpo.token));
  } catch (e) {
    return manejar(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const db = admin();
    const uid = await usuarioDeLaPeticion(req, db);
    if (!uid) return json({ error: "Inicia sesión de nuevo." }, 401);
    await desconectar(entorno(req, db), uid);
    return json({ ok: true });
  } catch (e) {
    return manejar(e);
  }
}
