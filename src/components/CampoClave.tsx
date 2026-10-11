"use client";

import { useState } from "react";

type Props = {
  id: string;
  name: string;
  autoComplete: "new-password" | "current-password";
  placeholder?: string;
};

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export default function CampoClave({ id, name, autoComplete, placeholder }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        className="campo pr-24"
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute inset-y-0 right-0 px-3 text-sm font-bold text-orange-600"
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
