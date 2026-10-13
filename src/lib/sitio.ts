/** Dirección pública de la web. Se puede cambiar con NEXT_PUBLIC_SITE_URL (por ejemplo, un dominio propio). */
export const SITIO = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://tribu-fit.vercel.app").replace(/\/+$/, "");

/**
 * Dirección corta que llevan los códigos QR (también los impresos en remeras): /app redirige a la página de
 * descarga. Así, si algún día cambia esa página, el QR impreso sigue funcionando.
 */
export const URL_QR = `${SITIO}/app`;
