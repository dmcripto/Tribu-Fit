"use client";

import { useEffect } from "react";
import { rutaInicial, USER_KEY } from "@/lib/auth";

/** Entrada de la app instalada: si ya hay sesión va al panel que corresponde, si no al login. */
export default function Ir() {
  useEffect(() => {
    let hayUsuario = false;
    try {
      hayUsuario = !!localStorage.getItem(USER_KEY) && localStorage.getItem(USER_KEY) !== "null";
    } catch {}
    window.location.replace(hayUsuario ? rutaInicial() : "/login");
  }, []);
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-sm text-zinc-500">Abriendo Tribu Fit…</p>
    </main>
  );
}
