// Paso 1: calcula el código QR (corrección de errores H = 30 %) y escribe los SVG vectoriales.
// Uso: node scripts/qr/matriz.mjs [url]   ·   Luego: python3 scripts/qr/remera.py
import QRCode from "qrcode";
import { mkdirSync, writeFileSync } from "node:fs";

const url = process.argv[2] ?? "https://tribu-fit.vercel.app/app";
const q = QRCode.create(url, { errorCorrectionLevel: "H" });
const n = q.modules.size, datos = Array.from(q.modules.data);
const margen = 4; // zona de silencio mínima del estándar
mkdirSync("marketing/qr", { recursive: true });
writeFileSync("marketing/qr/matriz.json", JSON.stringify({ url, n, datos }));

function svg(color) {
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (datos[y * n + x]) d += `M${x + margen} ${y + margen}h1v1h-1z`;
  const t = n + margen * 2;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${t * 10}mm" height="${t * 10}mm" shape-rendering="crispEdges"><title>${url}</title><path fill="${color}" d="${d}"/></svg>\n`;
}
writeFileSync("marketing/qr/qr-tribufit-negro.svg", svg("#000000"));
writeFileSync("marketing/qr/qr-tribufit-blanco.svg", svg("#ffffff"));
console.log(`QR de ${url}: ${n}x${n} módulos`);
