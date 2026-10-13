"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import Icono, { type NombreIcono } from "@/components/Iconos";
import { useAvisos, useHilos } from "@/lib/comunidad";
import { salir, USER_KEY } from "@/lib/auth";
import { modoDemo } from "@/lib/supabase";
import { usePropuestasPendientes } from "@/lib/repo";
import { useLocal } from "@/lib/store";
import type { Usuario } from "@/lib/types";

type Enlace = { href: string; texto: string; icono: NombreIcono };
const enlacesAtleta: Enlace[] = [
  { href: "/panel", texto: "Inicio", icono: "inicio" },
  { href: "/rutinas", texto: "Rutinas", icono: "rutinas" },
  { href: "/nutricion", texto: "Nutrición", icono: "nutricion" },
  { href: "/medidas", texto: "Progreso", icono: "progreso" },
  { href: "/chat", texto: "Chat", icono: "chat" },
  { href: "/mas", texto: "Más", icono: "mas" },
];
const enlacesEntrenador: Enlace[] = [
  { href: "/entrenador", texto: "Alumnos", icono: "alumnos" },
  { href: "/propuestas", texto: "Propuestas", icono: "propuestas" },
  { href: "/chat", texto: "Chat", icono: "chat" },
  { href: "/mas", texto: "Más", icono: "mas" },
];

/** Páginas que cuelgan de «Más»: mantienen esa pestaña marcada. */
const DE_MAS = ["/avisos", "/retos", "/recetas", "/ejercicios", "/pagos", "/cuenta", "/panel"];

export function useUsuario() {
  return useLocal<Usuario | null>(USER_KEY, null)[0];
}

/** ¿El gesto empezó en un campo de texto o en una zona con scroll horizontal (p. ej. un gráfico)? */
function gestoPropio(el: EventTarget | null): boolean {
  for (let n = el as HTMLElement | null; n && n !== document.body; n = n.parentElement) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable) return true;
    if (n.scrollWidth > n.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowX)) return true;
  }
  return false;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const usuario = useUsuario();
  const ruta = usePathname();
  const router = useRouter();
  const enlaces = usuario?.rol === "entrenador" ? enlacesEntrenador : enlacesAtleta;
  const pendientes = usePropuestasPendientes(usuario);
  const { avisos, noLeidos: avisosSinLeer } = useAvisos(usuario);
  const hilos = useHilos(usuario);
  const mensajesSinLeer = hilos.reduce((n, h) => n + h.noLeidos, 0);
  const visto = useRef<Set<string> | null>(null);

  // Notificación del sistema cuando llega un aviso nuevo (si la persona la activó en Cuenta).
  useEffect(() => {
    const ids = new Set(avisos.map((a) => a.id));
    if (visto.current && typeof Notification !== "undefined" && Notification.permission === "granted") {
      for (const a of avisos) {
        if (!visto.current.has(a.id) && !a.leido) {
          try { new Notification(a.titulo, { body: a.texto, icon: "/icons/icon-192.png", tag: `tf-${a.id}` }); } catch { /* sin soporte */ }
        }
      }
    }
    if (avisos.length > 0 || visto.current) visto.current = ids;
  }, [avisos]);
  const toque = useRef<{ x: number; y: number } | null>(null);

  // Deslizar con el dedo a izquierda/derecha cambia de pestaña (como en una app nativa).
  const alTocar = (e: React.TouchEvent) => {
    const t = e.touches[0];
    toque.current = e.touches.length === 1 && t && !gestoPropio(e.target) ? { x: t.clientX, y: t.clientY } : null;
  };
  const alSoltar = (e: React.TouchEvent) => {
    const ini = toque.current;
    toque.current = null;
    const t = e.changedTouches[0];
    if (!ini || !t || !usuario) return;
    const dx = t.clientX - ini.x;
    const dy = t.clientY - ini.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    const i = enlaces.findIndex((l) => l.href === ruta);
    const destino = enlaces[i + (dx < 0 ? 1 : -1)];
    if (i >= 0 && destino) router.push(destino.href);
  };

  return (
    <div
      onTouchStart={alTocar}
      onTouchEnd={alSoltar}
      onTouchCancel={() => { toque.current = null; }}
      className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 md:pb-8"
    >
      <header className="flex items-center justify-between gap-3">
        <Link href="/" aria-label="Tribu Fit, inicio" className="shrink-0 rounded-full ring-2 ring-orange-500/60 ring-offset-2 ring-offset-[var(--background)]">
          <Image src="/logo.png" alt="Tribu Fit" width={44} height={44} className="rounded-full" />
        </Link>

        {usuario && (
          // En el móvil la barra va abajo, al alcance del pulgar. En pantallas grandes, arriba.
          <nav
            aria-label="Principal"
            className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--borde)] bg-[var(--superficie)]/85 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:static md:z-auto md:gap-1 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
          >
            {enlaces.map((e) => {
              const activo = ruta === e.href || (e.href === "/mas" && DE_MAS.includes(ruta) && !enlaces.some((x) => x.href === ruta));
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  aria-current={activo ? "page" : undefined}
                  className={`group relative flex flex-1 flex-col items-center justify-center gap-0.5 px-0.5 pb-2 pt-2.5 text-[11px] font-bold transition md:flex-none md:flex-row md:gap-2 md:rounded-xl md:px-4 md:py-2 md:text-sm ${
                    activo
                      ? "text-orange-600 md:bg-gradient-to-r md:from-orange-500 md:to-red-600 md:text-white md:shadow-md md:shadow-orange-600/30"
                      : "text-zinc-500 hover:text-orange-600"
                  }`}
                >
                  <span className={`relative flex h-7 w-12 items-center justify-center rounded-full transition md:h-auto md:w-auto ${activo ? "bg-orange-500/15 md:bg-transparent" : "group-active:scale-90"}`}>
                    <Icono nombre={e.icono} className="size-[22px] md:size-5" />
                    {e.href === "/propuestas" && pendientes > 0 && (
                      <span aria-label={`${pendientes} pendientes`} className="absolute -right-0.5 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] leading-none text-white">{pendientes}</span>
                    )}
                    {e.href === "/chat" && mensajesSinLeer > 0 && (
                      <span aria-label={`${mensajesSinLeer} mensajes sin leer`} className="absolute -right-0.5 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] leading-none text-white">{mensajesSinLeer}</span>
                    )}
                  </span>
                  <span>{e.texto}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {usuario && (
          <div className="flex shrink-0 items-center gap-2 text-sm text-zinc-500">
            <Link href="/avisos" aria-label={avisosSinLeer > 0 ? `Avisos, ${avisosSinLeer} sin leer` : "Avisos"} aria-current={ruta === "/avisos" ? "page" : undefined}
              className="relative flex size-10 items-center justify-center rounded-full border border-[var(--borde)] bg-[var(--superficie)] hover:border-orange-500">
              <Icono nombre="campana" className="size-5" />
              {avisosSinLeer > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] leading-4 text-white">{avisosSinLeer}</span>}
            </Link>
            <Link href="/cuenta" aria-label="Cuenta" aria-current={ruta === "/cuenta" ? "page" : undefined}
              className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-base font-black text-white shadow-md shadow-orange-600/30">
              <span aria-hidden="true">{usuario.nombre.trim().charAt(0).toUpperCase() || "?"}</span>
              <span className="sr-only">Cuenta</span>
            </Link>
            <button
              type="button"
              aria-label="Salir"
              onClick={async () => {
                await salir();
                router.push("/");
              }}
              className="flex size-10 items-center justify-center rounded-full border border-[var(--borde)] bg-[var(--superficie)] hover:border-orange-500"
            >
              <Icono nombre="salir" className="size-5" />
              <span className="sr-only">Salir</span>
            </button>
          </div>
        )}
      </header>

      {modoDemo && (
        <p className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300">
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
