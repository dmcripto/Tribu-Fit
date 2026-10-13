"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { salir, USER_KEY } from "@/lib/auth";
import { modoDemo } from "@/lib/supabase";
import { usePropuestasPendientes } from "@/lib/repo";
import { useLocal } from "@/lib/store";
import type { Usuario } from "@/lib/types";

const enlacesAtleta = [
  { href: "/panel", texto: "Inicio" },
  { href: "/rutinas", texto: "Rutinas" },
  { href: "/nutricion", texto: "Nutrición" },
  { href: "/medidas", texto: "Medidas" },
  { href: "/pagos", texto: "Pagos" },
];
const enlacesEntrenador = [
  { href: "/entrenador", texto: "Alumnos" },
  { href: "/propuestas", texto: "Propuestas" },
  { href: "/pagos", texto: "Pagos" },
  { href: "/panel", texto: "Inicio" },
];

export function useUsuario() {
  return useLocal<Usuario | null>(USER_KEY, null)[0];
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const usuario = useUsuario();
  const ruta = usePathname();
  const router = useRouter();
  const enlaces = usuario?.rol === "entrenador" ? enlacesEntrenador : enlacesAtleta;
  const pendientes = usePropuestasPendientes(usuario);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 md:pb-8">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" aria-label="Tribu Fit, inicio" className="shrink-0">
          <Image src="/logo.png" alt="Tribu Fit" width={44} height={44} />
        </Link>

        {usuario && (
          // En el móvil la barra va abajo, al alcance del pulgar. En pantallas grandes, arriba.
          <nav
            aria-label="Principal"
            className="fixed inset-x-0 bottom-0 z-20 flex border-t border-zinc-200 bg-background pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 md:static md:z-auto md:gap-1 md:border-0 md:bg-transparent md:pb-0"
          >
            {enlaces.map((e) => {
              const activo = ruta === e.href;
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex flex-1 items-center justify-center border-t-2 px-1 py-3.5 text-xs font-bold md:flex-none md:rounded-md md:border-t-0 md:px-3 md:py-2 md:text-sm ${
                    activo
                      ? "border-orange-600 text-orange-600 md:bg-orange-600 md:text-white"
                      : "border-transparent text-zinc-500 hover:text-orange-600"
                  }`}
                >
                  {e.texto}
                  {e.href === "/propuestas" && pendientes > 0 && (
                    <span aria-label={`${pendientes} pendientes`} className="ml-1.5 rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] leading-none text-white">{pendientes}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {usuario && (
          <div className="flex shrink-0 items-center gap-4 text-sm text-zinc-500">
            <Link href="/cuenta" aria-current={ruta === "/cuenta" ? "page" : undefined} className={ruta === "/cuenta" ? "font-bold text-orange-600" : "underline"}>
              Cuenta
            </Link>
            <button
              type="button"
              onClick={async () => {
                await salir();
                router.push("/");
              }}
              className="underline"
            >
              Salir
            </button>
          </div>
        )}
      </header>

      {modoDemo && (
        <p className="rounded-md border border-orange-600/40 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
          Modo demo: los datos se guardan solo en este navegador.
        </p>
      )}

      {usuario ? (
        children
      ) : (
        <div className="flex flex-col items-start gap-4 py-10">
          <h1 className="titulo">Entra para continuar</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Necesitas una cuenta para ver tu panel, tus rutinas y tus medidas.
          </p>
          <div className="flex gap-3">
            <Link href="/registro" className="btn-primary">Crear cuenta</Link>
            <Link href="/login" className="btn-ghost">Iniciar sesión</Link>
          </div>
        </div>
      )}
    </div>
  );
}
