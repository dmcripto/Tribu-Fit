import Link from "next/link";
import { APK, tamano } from "@/lib/apk";

/** Tarjeta de descarga de la app Android. `completa` añade la huella para verificar el archivo. */
export default function DescargaApk({ enlaceDetalle = false }: { enlaceDetalle?: boolean }) {
  return (
    <section id="descargar" className="flex flex-col gap-3 rounded-xl border-2 border-orange-600 p-5">
      <h2 className="text-2xl font-black uppercase">Descarga la app</h2>
      <p className="text-zinc-600 dark:text-zinc-400">
        Llévate Tribu Fit en el celular: entra directo a tu panel, rutinas y nutrición.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <a href={APK.archivo} download="tribu-fit.apk" className="btn-primary">
          Descargar para Android (APK)
        </a>
        <span className="text-xs text-zinc-500">Versión {APK.version} · {tamano(APK.bytes)}</span>
      </div>
      {enlaceDetalle && (
        <Link href="/descargar" className="text-sm font-bold underline">
          Cómo instalarla paso a paso
        </Link>
      )}
    </section>
  );
}
