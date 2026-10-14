/** Sección que se abre y se cierra, para no mostrar todo a la vez. */
export default function Desplegable({
  titulo, detalle, abierto = false, children,
}: { titulo: string; detalle?: string; abierto?: boolean; children: React.ReactNode }) {
  return (
    <details open={abierto} className="tarjeta group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span>
          <span className="subtitulo block">{titulo}</span>
          {detalle && <span className="text-sm text-zinc-500">{detalle}</span>}
        </span>
        <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden="true">
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </summary>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </details>
  );
}

/** Opción plegable liviana (sin tarjeta), para listas de formas de pago dentro de otra sección. */
export function Opcion({ titulo, abierta = false, children }: { titulo: string; abierta?: boolean; children: React.ReactNode }) {
  return (
    <details open={abierta} className="group w-full rounded-xl border border-[var(--borde)] p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black">
        {titulo}
        <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden="true">
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </summary>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </details>
  );
}
