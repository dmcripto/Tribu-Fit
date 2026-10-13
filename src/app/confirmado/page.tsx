"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { completarDesdeSesion, rutaInicial } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Fase = "comprobando" | "error";

/** Destino del enlace del correo de confirmación: termina el alta y entra a la app. */
export default function Confirmado() {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("comprobando");
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const cliente = supabase;
    let vivo = true;
    let terminado = false;

    async function terminar() {
      if (terminado) return;
      terminado = true;
      const res = await completarDesdeSesion();
      if (!vivo) return;
      if (res.error) {
        setMensaje(res.error);
        setFase("error");
        return;
      }
      router.replace(rutaInicial());
    }

    // La sesión llega en el enlace; puede tardar un instante en detectarse.
    const { data: sub } = cliente.auth.onAuthStateChange((_evento, sesion) => {
      if (sesion) void terminar();
    });
    cliente.auth.getSession().then(({ data }) => {
      if (data.session) void terminar();
    });
    const limite = setTimeout(() => {
      if (vivo && !terminado) {
        setMensaje("El enlace no es válido o ya venció.");
        setFase("error");
      }
    }, 6000);
    return () => { vivo = false; clearTimeout(limite); sub.subscription.unsubscribe(); };
  }, [router]);

  const sinConexion = !supabase;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8 sm:px-5">
      <Link href="/" aria-label="Tribu Fit, inicio" className="self-start">
        <Image src="/logo.png" alt="Tribu Fit" width={64} height={64} />
      </Link>
      <h1 className="titulo">Confirmando tu correo</h1>

      {!sinConexion && fase === "comprobando" && (
        <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">Un momento, estamos preparando tu cuenta...</p>
      )}

      {(sinConexion || fase === "error") && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-zinc-700 dark:text-zinc-300">
            {sinConexion ? "En el modo demo no hay correos que confirmar." : mensaje}{" "}
            Si ya confirmaste tu correo, inicia sesión con tu contraseña.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">Iniciar sesión</Link>
            <Link href="/olvide" className="btn-ghost">Recuperar contraseña</Link>
          </div>
        </div>
      )}
    </main>
  );
}
