import QRCode from "qrcode";
import { URL_QR } from "@/lib/sitio";

/** Código QR que lleva a la descarga de la app. Se genera al compilar, sin servicios externos. */
export default async function QrDescarga({ className = "size-44" }: { className?: string }) {
  const svg = await QRCode.toString(URL_QR, { type: "svg", errorCorrectionLevel: "Q", margin: 2, color: { dark: "#111111", light: "#ffffff" } });
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        role="img"
        aria-label={`Código QR que abre ${URL_QR}`}
        className={`${className} overflow-hidden rounded-2xl border border-[var(--borde)] bg-white p-1 shadow-md [&>svg]:size-full`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="max-w-52 text-xs text-zinc-500">Apunta la cámara de tu celular al código para abrir la descarga.</p>
    </div>
  );
}
