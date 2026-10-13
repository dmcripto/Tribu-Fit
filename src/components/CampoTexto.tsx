"use client";

import { useRef, useState } from "react";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> & {
  /** Valor controlado (opcional). Sin él, el campo guarda su propio texto. */
  valor?: string;
  inicial?: string;
  onCambio?: (v: string) => void;
};

/** Campo de texto con una X para borrar todo de un toque. */
export default function CampoTexto({
  valor, inicial = "", onCambio, className = "", ...resto
}: Props) {
  const [propio, setPropio] = useState(inicial);
  const ref = useRef<HTMLInputElement>(null);
  const texto = valor ?? propio;

  function cambiar(v: string) {
    setPropio(v);
    onCambio?.(v);
  }

  return (
    <div className="relative">
      <input
        {...resto}
        ref={ref}
        className={`campo ${texto ? "pr-10" : ""} ${className}`}
        value={texto}
        onChange={(e) => cambiar(e.target.value)}
      />
      {texto && !resto.disabled && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Borrar"
          onClick={() => {
            cambiar("");
            ref.current?.focus();
          }}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500 hover:text-orange-600"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </button>
      )}
    </div>
  );
}
