"use client";

import { useTema } from "@/lib/tema";

/** Mantiene el tema (claro/oscuro/automático) aplicado en toda la app. */
export default function AplicarTema() {
  useTema();
  return null;
}
