import Image from "next/image";
import Link from "next/link";
import { FECHA_LEGAL } from "@/lib/legal";

export function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="subtitulo">{titulo}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}

/** Marco común de las páginas legales: legible y sin menú de la app. */
export default function PaginaLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-5">
      <Link href="/" aria-label="Tribu Fit, inicio" className="self-start">
        <Image src="/logo.png" alt="Tribu Fit" width={44} height={44} />
      </Link>
      <div>
        <h1 className="titulo">{titulo}</h1>
        <p className="mt-2 text-sm text-zinc-500">Última actualización: {FECHA_LEGAL}</p>
      </div>
      {children}
      <nav aria-label="Documentos legales" className="flex flex-wrap gap-4 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
        <Link href="/terminos" className="font-bold text-orange-600">Términos de uso</Link>
        <Link href="/privacidad" className="font-bold text-orange-600">Política de privacidad</Link>
        <Link href="/" className="text-zinc-500 underline">Volver al inicio</Link>
      </nav>
    </main>
  );
}
