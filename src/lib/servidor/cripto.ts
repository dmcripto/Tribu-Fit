import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Clave de 32 bytes derivada de MP_ENCRYPTION_KEY (cualquier texto largo y secreto). */
export function claveDeEntorno(secreto = process.env.MP_ENCRYPTION_KEY): Buffer {
  if (!secreto || secreto.length < 32) throw new Error("Falta MP_ENCRYPTION_KEY (mínimo 32 caracteres) en el servidor.");
  return createHash("sha256").update(secreto).digest();
}

/** Cifra con AES-256-GCM. Formato: v1.iv.etiqueta.datos (base64url). */
export function cifrar(texto: string, clave: Buffer = claveDeEntorno()): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", clave, iv);
  const datos = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), datos.toString("base64url")].join(".");
}

export function descifrar(token: string, clave: Buffer = claveDeEntorno()): string {
  const [v, iv, tag, datos] = token.split(".");
  if (v !== "v1" || !iv || !tag || !datos) throw new Error("Formato cifrado no válido.");
  const d = createDecipheriv("aes-256-gcm", clave, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(datos, "base64url")), d.final()]).toString("utf8");
}
