const MAX_ENTRADA = 8 * 1024 * 1024;
const PERMITIDOS = ["image/png", "image/jpeg", "image/webp"];

/**
 * Reduce una imagen a un data URL ligero (máx. `lado` px). Rechaza lo que no sea
 * PNG, JPG o WebP. Devuelve el error como texto para mostrarlo al usuario.
 */
export async function imagenADataUrl(
  archivo: File,
  { lado = 640, tipo = "image/jpeg" }: { lado?: number; tipo?: "image/jpeg" | "image/png" } = {},
): Promise<{ url?: string; error?: string }> {
  if (!PERMITIDOS.includes(archivo.type)) return { error: "Sube una imagen PNG, JPG o WebP." };
  if (archivo.size > MAX_ENTRADA) return { error: "La imagen pesa demasiado. Elige una de menos de 8 MB." };
  try {
    const bmp = await createImageBitmap(archivo);
    const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * escala));
    canvas.height = Math.max(1, Math.round(bmp.height * escala));
    const ctx = canvas.getContext("2d");
    if (!ctx) return { error: "Tu navegador no pudo procesar la imagen." };
    if (tipo === "image/jpeg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL(tipo, 0.82);
    if (url.length > 550_000) return { error: "La imagen sigue siendo muy pesada. Prueba con una más pequeña." };
    return { url };
  } catch {
    return { error: "No se pudo leer la imagen." };
  }
}
