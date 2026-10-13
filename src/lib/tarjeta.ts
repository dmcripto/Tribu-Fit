import { SITIO } from "./sitio";

/** Enlace que abre el registro con el código de la entrenadora ya escrito. */
export const enlaceInvitacion = (codigo: string) => `${SITIO}/registro?codigo=${encodeURIComponent(codigo)}`;

/** Un código de invitación válido: letras y números, 4 a 12 caracteres. */
export const codigoValido = (c: string) => /^[A-Za-z0-9]{4,12}$/.test(c);

const NARANJA = "#ea580c";
const NARANJA_CLARO = "#ff8a28";

function cargarLogo(): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => mal(new Error("No se pudo cargar el logo."));
    i.src = "/logo.png";
  });
}

function circular(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, d: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, x, y, d, d);
  ctx.restore();
}

/**
 * Tarjeta personal de la entrenadora (90 × 50 mm a 300 dpi): frente arriba y dorso abajo, en una sola imagen PNG.
 * El QR abre el registro con su código ya escrito.
 */
export async function crearTarjeta(nombre: string, codigo: string): Promise<Blob> {
  const [{ default: QRCode }, logo] = await Promise.all([import("qrcode"), cargarLogo()]);
  const familia = getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
  try { await Promise.all([document.fonts.load(`900 40px ${familia}`), document.fonts.load(`600 40px ${familia}`)]); } catch { /* se usa la fuente de reemplazo */ }

  const w = 1063, h = 591, sep = 40;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h * 2 + sep;
  const c = cv.getContext("2d");
  if (!c) throw new Error("Tu navegador no pudo dibujar la tarjeta.");

  // Frente
  c.fillStyle = "#120d0a";
  c.fillRect(0, 0, w, h);
  const g1 = c.createRadialGradient(w * 0.95, 0, 0, w * 0.95, 0, w * 0.6);
  g1.addColorStop(0, "rgba(234,88,12,0.55)");
  g1.addColorStop(1, "rgba(234,88,12,0)");
  c.fillStyle = g1;
  c.fillRect(0, 0, w, h);
  circular(c, logo, 60, 60, 200);
  c.fillStyle = "#fff";
  c.textBaseline = "alphabetic";
  let tam = 78;
  const nom = nombre.trim().toUpperCase().slice(0, 40) || "TU NOMBRE";
  c.font = `900 ${tam}px ${familia}`;
  while (c.measureText(nom).width > w - 120 && tam > 30) { tam -= 4; c.font = `900 ${tam}px ${familia}`; }
  c.fillText(nom, 60, 370);
  c.fillStyle = NARANJA_CLARO;
  c.font = `700 38px ${familia}`;
  c.fillText("ENTRENADORA PERSONAL", 60, 430);
  c.fillStyle = "#e1d7cd";
  c.font = `600 30px ${familia}`;
  c.fillText(`Entrená en tribu · ${SITIO.replace("https://", "")}`, 60, h - 55);

  // Dorso
  const oy = h + sep;
  c.fillStyle = "#fff";
  c.fillRect(0, oy, w, h);
  c.fillStyle = NARANJA;
  c.fillRect(0, oy, 18, h);
  c.fillStyle = "#111";
  c.font = `900 56px ${familia}`;
  c.fillText("UNITE A MI TRIBU", 70, oy + 160);
  c.fillStyle = "#5a5a5a";
  c.font = `600 36px ${familia}`;
  c.fillText("Escaneá el código, descargá", 70, oy + 235);
  c.fillText("la app y usá mi código:", 70, oy + 282);
  c.strokeStyle = NARANJA;
  c.lineWidth = 8;
  c.beginPath();
  c.roundRect(70, oy + 330, 490, 130, 26);
  c.stroke();
  c.fillStyle = NARANJA;
  c.textAlign = "center";
  c.font = `900 84px ${familia}`;
  c.fillText(codigo.toUpperCase().split("").join(" "), 315, oy + 424);
  c.textAlign = "left";
  c.fillStyle = "#6e6e6e";
  c.font = `600 30px ${familia}`;
  c.fillText(SITIO.replace("https://", ""), 70, oy + h - 45);

  // QR del registro con el código
  const q = QRCode.create(enlaceInvitacion(codigo.toUpperCase()), { errorCorrectionLevel: "M" });
  const n = q.modules.size, lado = 430, mod = Math.floor(lado / (n + 4));
  const total = mod * (n + 4);
  const qx = w - total - 50, qy = oy + 80;
  c.fillStyle = "#fff";
  c.fillRect(qx, qy, total, total);
  c.fillStyle = "#111";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.modules.get(x, y)) c.fillRect(qx + (x + 2) * mod, qy + (y + 2) * mod, mod, mod);

  return new Promise((ok, mal) => cv.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo crear la imagen."))), "image/png"));
}

export function descargarBlob(nombre: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
