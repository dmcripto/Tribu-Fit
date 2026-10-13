"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CampoClave from "@/components/CampoClave";
import CampoTexto from "@/components/CampoTexto";
import { entrar } from "@/lib/auth";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!email || !password) return setError("Escribe tu correo y tu contraseña.");
    setError(null);
    setEnviando(true);
    const res = await entrar(email, password);
    setEnviando(false);
    if (res.error) return setError(res.error);
    router.push("/panel");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-10">
      <Link href="/" aria-label="Tribu Fit, inicio">
        <Image src="/logo.png" alt="Tribu Fit" width={64} height={64} />
      </Link>
      <h1 className="titulo">Iniciar sesión</h1>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <div>
          <label className="etiqueta" htmlFor="email">Correo</label>
          <CampoTexto id="email" name="email" type="email" autoComplete="email" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="password">Contraseña</label>
          <CampoClave id="password" name="password" autoComplete="current-password" />
        </div>
        {error && (
          <p role="alert" className="rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button className="btn-primary" disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
        <Link href="/olvide" className="text-sm font-bold text-orange-600">¿Olvidaste tu contraseña?</Link>
        <p className="text-sm text-zinc-500">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-bold text-orange-600">Crear cuenta</Link>
        </p>
      </form>
    </main>
  );
}
