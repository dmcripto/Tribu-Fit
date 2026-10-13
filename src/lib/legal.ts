/** Versión de los términos y la política. Súbela cuando cambien los textos. */
export const VERSION_LEGAL = "2026-10";
export const FECHA_LEGAL = "13 de octubre de 2026";

/**
 * Datos del responsable. Se configuran en Vercel (Settings, Environment Variables):
 *   NEXT_PUBLIC_RESPONSABLE     nombre o razón social
 *   NEXT_PUBLIC_CONTACTO_EMAIL  correo para consultas y derechos de datos
 */
export const RESPONSABLE = process.env.NEXT_PUBLIC_RESPONSABLE || "el titular de Tribu Fit";
export const CONTACTO = process.env.NEXT_PUBLIC_CONTACTO_EMAIL || "";
