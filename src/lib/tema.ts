"use client";

import { useCallback, useEffect } from "react";
import { useLocal } from "./store";

export type Tema = "auto" | "claro" | "oscuro";
export const TEMA_KEY = "tf_tema";

/** Aplica el tema al documento. `auto` sigue el modo del teléfono. */
export function aplicarTema(t: Tema) {
  const oscuro = t === "oscuro" || (t === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", oscuro);
}

export function useTema() {
  const [tema, set] = useLocal<Tema>(TEMA_KEY, "auto");
  useEffect(() => {
    aplicarTema(tema);
    if (tema !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const f = () => aplicarTema("auto");
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [tema]);
  const cambiar = useCallback((t: Tema) => set(t), [set]);
  return [tema, cambiar] as const;
}
