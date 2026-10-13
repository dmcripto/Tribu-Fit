"use client";

import { useEffect } from "react";

/**
 * Si Supabase manda al usuario a la portada con una sesión en la dirección (#access_token),
 * lo lleva a la pantalla que corresponde conservando esa sesión.
 */
export default function RedirigirAuth() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token=")) return;
    const tipo = new URLSearchParams(hash.slice(1)).get("type");
    const destino = tipo === "recovery" ? "/nueva-clave" : "/confirmado";
    window.location.replace(`${destino}${hash}`);
  }, []);
  return null;
}
