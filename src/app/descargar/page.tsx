import Image from "next/image";
import Link from "next/link";
import DescargaApk from "@/components/DescargaApk";
import InstalarApp from "@/components/InstalarApp";
import { APK } from "@/lib/apk";

export const metadata = { title: "Descargar la app · Tribu Fit" };

const pasos = [
  "Toca «Descargar para Android (APK)». Si el navegador avisa que el archivo puede ser dañino, elige «Descargar de todos modos»: es normal con apps fuera de Google Play.",
  "Abre el archivo descargado (en la notificación o en la carpeta Descargas).",
  "Si Android lo pide, activa «Permitir de esta fuente» para tu navegador y vuelve atrás.",
  "Toca «Instalar». Si aparece Play Protect, elige «Instalar de todos modos».",
  "Abre Tribu Fit e inicia sesión con tu cuenta de siempre.",
];

export default function Descargar() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-10">
      <header className="flex items-center justify-between">
        <Link href="/"><Image src="/logo.png" alt="Tribu Fit" width={56} height={56} className="size-14" /></Link>
        <Link href="/login" className="text-sm font-bold">Iniciar sesión</Link>
      </header>
      <h1 className="text-4xl font-black uppercase">Tribu Fit en tu celular</h1>

      <DescargaApk />

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-black uppercase">Instalar en Android</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-zinc-700 dark:text-zinc-300">
          {pasos.map((p) => <li key={p}>{p}</li>)}
        </ol>
        <p className="text-sm text-zinc-500">Requiere Android 8.0 o superior.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-black uppercase">iPhone o instalar desde el navegador</h2>
        <InstalarApp />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          También puedes usar Tribu Fit desde el navegador sin instalar nada.
        </p>
      </section>

      <details className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <summary className="cursor-pointer font-bold">Verificar que el archivo es original</summary>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Huella SHA-256 del archivo:</p>
        <code className="break-all text-xs">{APK.sha256}</code>
        {APK.certSha256 && (
          <>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Huella SHA-256 del certificado de firma:</p>
            <code className="break-all text-xs">{APK.certSha256}</code>
          </>
        )}
      </details>
    </main>
  );
}
