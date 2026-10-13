"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import CampoTexto from "@/components/CampoTexto";
import { pedirRecuperacion } from "@/lib/auth";

export default function Olvide() {
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/\S+@\S+\.\S+/.test(email)) return setError("Escribe un correo válido.");
    setError(null);
    setAviso(null);
    setEnviando(true);
    const res = await pedirRecuperacion(email);
    setEnviando(false);
    if (res.error) return setError(res.error);
    setAviso(res.aviso ?? null);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8 sm:px-5">
      <Link href="/" aria-label="Tribu Fit, inicio" className="self-start">
        <Image src="/logo.png" alt="Tribu Fit" width={64} height={64} />
      </Link>
      <div>
        <h1 className="titulo">Recupera tu contraseña</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Escribe tu correo y te enviaremos un enlace para elegir una contraseña nueva.
        </p>
      </div>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <div>
          <label className="etiqueta" htmlFor="email">Correo</label>
          <CampoTexto id="email" name="email" type="email" autoComplete="email" />
        </div>
        {error && <p role="alert" className="rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">{error}</p>}
        {aviso && <p role="status" className="rounded-md border border-green-700 px-3 py-2 text-sm text-green-700 dark:text-green-400">{aviso}</p>}
        <button className="btn-primary" disabled={enviando}>{enviando ? "Enviando..." : "Enviar enlace"}</button>
        <Link href="/login" className="text-sm font-bold text-orange-600">Volver a iniciar sesión</Link>
      </form>
    </main>
  );
}
