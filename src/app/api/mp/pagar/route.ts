import { admin, entorno, usuarioDeLaPeticion } from "@/lib/servidor/entorno";
import { crearPago, ErrorMp } from "@/lib/servidor/mp";

const json = (cuerpo: unknown, estado = 200) => Response.json(cuerpo, { status: estado, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  try {
    const db = admin();
    const uid = await usuarioDeLaPeticion(req, db);
    if (!uid) return json({ error: "Inicia sesión de nuevo." }, 401);
    return json(await crearPago(entorno(req, db), uid));
  } catch (e) {
    if (e instanceof ErrorMp) return json({ error: e.message }, e.estado);
    console.error("mp/pagar", e instanceof Error ? e.message : e);
    return json({ error: "No pudimos iniciar el pago. Inténtalo de nuevo." }, 500);
  }
}
