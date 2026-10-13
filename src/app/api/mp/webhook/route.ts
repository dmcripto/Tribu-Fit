import { admin, entorno } from "@/lib/servidor/entorno";
import { ErrorMp, idDeAviso, procesarNotificacion } from "@/lib/servidor/mp";

async function atender(req: Request) {
  try {
    const url = new URL(req.url);
    const cuerpo = req.method === "POST" ? await req.json().catch(() => null) : null;
    const id = idDeAviso(url, cuerpo);
    const coach = url.searchParams.get("c") ?? "";
    if (!id) return Response.json({ ok: true, ignorado: "no es un pago" });
    const r = await procesarNotificacion(entorno(req, admin()), coach, id);
    return Response.json({ ok: true, ...r });
  } catch (e) {
    // Un error nuestro o de Mercado Pago devuelve 5xx para que Mercado Pago reintente el aviso.
    console.error("mp/webhook", e instanceof Error ? e.message : e);
    return Response.json({ ok: false }, { status: e instanceof ErrorMp && e.estado < 500 ? e.estado : 500 });
  }
}

export const POST = atender;
export const GET = atender;
