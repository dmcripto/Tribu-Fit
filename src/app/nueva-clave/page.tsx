"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import CampoClave from "@/components/CampoClave";
import { cambiarClave } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Fase = "comprobando" | "lista" | "invalida" | "hecho";

export default function NuevaClave() {
  const [fase, setFase] = useState<Fase>("comprobando");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const cliente = supabase;
    let vivo = true;
    // El enlace del correo inicia una sesión temporal de recuperación.
    const { data: sub } = cliente.auth.onAuthStateChange((evento, sesion) => {
      if (vivo && sesion && (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN")) setFase("lista");
    });
    cliente.auth.getSession().then(({ data }) => {
      if (vivo) setFase((f) => (data.session ? "lista" : f === "comprobando" ? "invalida" : f));
    });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nueva = String(f.get("nueva") ?? "");
    if (nueva.length < 8) return setError("La contraseña necesita 8 caracteres o más.");
    if (nueva !== String(f.get("repetir") ?? "")) return setError("Las dos contraseñas no coinciden.");
    setError(null);
    setEnviando(true);
    const fallo = await cambiarClave(nueva);
    setEnviando(false);
    if (fallo) return setError(fallo);
    // Se cierra la sesión temporal: para entrar hay que iniciar sesión con la clave nueva.
    await supabase?.auth.signOut();
    setFase("hecho");
  }

  const efectiva: Fase = !supabase ? "invalida" : fase;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8 sm:px-5">
      <Link href="/" aria-label="Tribu Fit, inicio" className="self-start">
        <Image src="/logo.png" alt="Tribu Fit" width={64} height={64} />
      </Link>
      <h1 className="titulo">Nueva contraseña</h1>

      {efectiva === "comprobando" && <p className="text-sm text-zinc-500">Comprobando tu enlace...</p>}

      {efectiva === "invalida" && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-zinc-700 dark:text-zinc-300">
            Este enlace no es válido o ya venció. Pide uno nuevo para cambiar tu contraseña.
          </p>
          <Link href="/olvide" className="btn-primary">Pedir un enlace nuevo</Link>
        </div>
      )}

      {efectiva === "lista" && (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <div>
            <label className="etiqueta" htmlFor="nueva">Contraseña nueva</label>
            <CampoClave id="nueva" name="nueva" autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="repetir">Repite la contraseña</label>
            <CampoClave id="repetir" name="repetir" autoComplete="new-password" />
          </div>
          {error && <p role="alert" className="rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button className="btn-primary" disabled={enviando}>{enviando ? "Guardando..." : "Guardar contraseña"}</button>
        </form>
      )}

      {efectiva === "hecho" && (
        <div className="flex flex-col items-start gap-3">
          <p role="status" className="text-sm text-green-700 dark:text-green-400">Listo. Tu contraseña se cambió.</p>
          <Link href="/login" className="btn-primary">Iniciar sesión</Link>
        </div>
      )}
    </main>
  );
}
