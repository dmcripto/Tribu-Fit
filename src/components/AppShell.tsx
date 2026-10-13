"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { salir, USER_KEY } from "@/lib/auth";
import { modoDemo } from "@/lib/supabase";
import { useLocal } from "@/lib/store";
import type { Usuario } from "@/lib/types";

const enlacesAtleta = [
  { href: "/panel", texto: "Panel" },
  { href: "/rutinas", texto: "Rutinas" },
  { href: "/nutricion", texto: "Nutrición" },
  { href: "/medidas", texto: "Medidas" },
];
const enlacesEntrenador = [
  { href: "/entrenador", texto: "Mis alumnos" },
  { href: "/panel", texto: "Panel" },
];

export function useUsuario() {
  return useLocal<Usuario | null>(USER_KEY, null)[0];
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const usuario = useUsuario();
  const ruta = usePathname();
  const router = useRouter();
  const enlaces = usuario?.rol === "entrenador" ? enlacesEntrenador : enlacesAtleta;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-5 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" aria-label="Tribu Fit, inicio">
          <Image src="/logo.png" alt="Tribu Fit" width={48} height={48} />
        </Link>
        <nav className="flex gap-1" aria-label="Principal">
          {enlaces.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              aria-current={ruta === e.href ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-bold ${
                ruta === e.href
                  ? "bg-orange-600 text-white"
                  : "text-zinc-600 hover:text-orange-600 dark:text-zinc-400"
              }`}
            >
              {e.texto}
            </Link>
          ))}
        </nav>
        {usuario && (
          <button
            type="button"
            onClick={async () => {
              await salir();
              router.push("/");
            }}
            className="text-sm text-zinc-500 underline"
          >
            Salir ({usuario.nombre})
          </button>
        )}
      </header>

      {modoDemo && (
        <p className="rounded-md border border-orange-600/40 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
          Modo demo: tus datos se guardan solo en este navegador.
        </p>
      )}

      {usuario ? (
        children
      ) : (
        <div className="flex flex-col items-start gap-4 py-10">
          <h1 className="text-4xl font-black uppercase">Entra para continuar</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Necesitas una cuenta para ver tu panel, tus rutinas y tus medidas.
          </p>
          <div className="flex gap-3">
            <Link href="/registro" className="btn-primary">
              Crear cuenta
            </Link>
            <Link href="/login" className="btn-ghost">
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
