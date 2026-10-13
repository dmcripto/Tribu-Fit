// Copia el APK compilado a public/ y escribe src/lib/apk.json (versión, tamaño y huellas).
// Uso: node scripts/publicar-apk.mjs [ruta/al.apk] [SHA256_del_certificado]
import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const origen = process.argv[2] ?? `android/build/${readdirSync("android/build").find((f) => f.endsWith(".apk"))}`;
const cert = (process.argv[3] ?? process.env.CERT_SHA256 ?? "").replace(/[: ]/g, "").toUpperCase();
const version = /tribu-fit-(.+)\.apk$/.exec(origen)?.[1] ?? "1.0.0";
const datos = readFileSync(origen);
copyFileSync(origen, "public/tribu-fit.apk");
writeFileSync("src/lib/apk.json", JSON.stringify({
  version,
  bytes: datos.length,
  sha256: createHash("sha256").update(datos).digest("hex").toUpperCase(),
  certSha256: cert,
  archivo: "/tribu-fit.apk",
}, null, 2) + "\n");
console.log(`Publicado ${origen} (${datos.length} bytes)`);
