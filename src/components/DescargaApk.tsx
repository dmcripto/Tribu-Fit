import Link from "next/link";
import Icono from "@/components/Iconos";
import QrDescarga from "@/components/QrDescarga";
import { APK, tamano } from "@/lib/apk";

/** Tarjeta de descarga de la app Android. `completa` añade la huella para verificar el archivo. */
export default function DescargaApk({ enlaceDetalle = false }: { enlaceDetalle?: boolean }) {
  return (
    <section id="descargar" className="relative flex flex-col gap-6 overflow-hidden rounded-3xl border border-orange-500/40 bg-gradient-to-br from-orange-500/15 via-[var(--superficie)] to-amber-400/10 p-6 shadow-lg shadow-orange-900/10 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3">
      <h2 className="titulo !text-3xl">Descarga la app</h2>
      <p className="text-zinc-600 dark:text-zinc-400">
        Llévate Tribu Fit en el celular: entra directo a tu panel, rutinas y nutrición.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <a href={APK.archivo} download="tribu-fit.apk" className="btn-primary">
          <Icono nombre="descarga" className="size-5" /> Descargar para Android (APK)
        </a>
        <span className="text-xs text-zinc-500">Versión {APK.version} · {tamano(APK.bytes)}</span>
      </div>
      {enlaceDetalle && (
        <Link href="/descargar" className="text-sm font-bold underline">
          Cómo instalarla paso a paso
        </Link>
      )}
      </div>
      {/* En la computadora se escanea con el celular; en el celular basta el botón. */}
      <div className="hidden md:block"><QrDescarga /></div>
    </section>
  );
}
