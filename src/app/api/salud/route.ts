import { connection } from "next/server";
import { admin } from "@/lib/servidor/entorno";

/**
 * Revisión rápida de la configuración: abre /api/salud en el navegador y debe mostrar todo en true.
 * Solo devuelve sí/no (nunca valores ni claves ni mensajes de error).
 */
export async function GET() {
  await connection(); // siempre se calcula en el momento, nunca se guarda de antes
  const variables = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    mp_encryption_key_32_o_mas_caracteres: (process.env.MP_ENCRYPTION_KEY?.length ?? 0) >= 32,
  };
  const base: Record<string, boolean> = {};
  if (variables.supabase_url && variables.supabase_service_role_key) {
    try {
      const db = admin();
      const revisar: [string, string, string][] = [
        ["usuarios", "usuarios", "id"],
        ["chat_y_avisos_007", "mensajes", "id"],
        ["mercado_pago_008", "mp_cuentas", "entrenador_id"],
        ["cuentas_bancarias_008", "cuentas_bancarias", "id"],
        ["tipo_de_foto_010", "fotos_progreso", "tipo"],
        ["foto_de_perfil_011", "usuarios", "avatar"],
        ["salud_y_alimentacion_012", "condiciones_salud", "alumno_id"],
        ["pesos_por_serie_012", "marcas", "serie"],
      ];
      await Promise.all(revisar.map(async ([nombre, tabla, columna]) => {
        const { error } = await db.from(tabla).select(columna).limit(1);
        base[nombre] = !error;
      }));
    } catch {
      base.conexion = false;
    }
  }
  const todo = Object.values(variables).every(Boolean) && Object.keys(base).length > 0 && Object.values(base).every(Boolean);
  return Response.json({ ok: todo, variables, base }, { headers: { "cache-control": "no-store" } });
}
