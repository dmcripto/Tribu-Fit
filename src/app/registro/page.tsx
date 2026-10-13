"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CampoClave from "@/components/CampoClave";
import CampoTexto from "@/components/CampoTexto";
import { registrar } from "@/lib/auth";
import { modoDemo } from "@/lib/supabase";

const objetivos = ["Perder grasa", "Ganar músculo", "Correr más", "Estar activo"];

export default function Registro() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [rol, setRol] = useState<"atleta" | "entrenador">("atleta");

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nombre = String(f.get("nombre") ?? "").trim();
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!nombre) return setError("Escribe tu nombre.");
    if (!/\S+@\S+\.\S+/.test(email)) return setError("Escribe un correo válido.");
    if (password.length < 8)
      return setError("La contraseña necesita 8 caracteres o más.");
    if (!f.get("datosSalud"))
      return setError(
        "Necesitamos tu permiso para tratar datos de salud y calcular tu progreso.",
      );
    setError(null);
    setEnviando(true);
    const res = await registrar({
      nombre,
      email,
      password,
      rol,
      codigoEntrenador: String(f.get("codigoEntrenador") ?? "").trim().toUpperCase(),
      objetivo: String(f.get("objetivo")),
      nivel: String(f.get("nivel")),
      datosSalud: true,
      comparteTribu: f.get("comparteTribu") === "on",
      comparteEntrenador: f.get("comparteEntrenador") === "on",
    });
    setEnviando(false);
    if (res.error) return setError(res.error);
    if (res.aviso) return setAviso(res.aviso);
    router.push("/panel");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-10">
      <Link href="/" aria-label="Tribu Fit, inicio">
        <Image src="/logo.png" alt="Tribu Fit" width={64} height={64} />
      </Link>
      <h1 className="titulo">
        Crea tu cuenta
      </h1>
      {modoDemo && (
        <p className="text-sm text-zinc-500">
          Modo demo: la cuenta se guarda solo en este navegador.
        </p>
      )}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <fieldset>
          <legend className="etiqueta">Soy</legend>
          <div className="flex gap-2">
            {(["atleta", "entrenador"] as const).map((r) => (
              <label key={r} className="cursor-pointer">
                <input type="radio" name="rol" value={r} checked={rol === r} onChange={() => setRol(r)} className="peer sr-only" />
                <span className="inline-block rounded-full border-2 border-zinc-300 px-4 py-2 text-sm font-bold peer-checked:border-orange-600 peer-checked:bg-orange-600 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-orange-600 dark:border-zinc-700">
                  {r === "atleta" ? "Alumno/a" : "Entrenador/a"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="etiqueta" htmlFor="nombre">Nombre</label>
          <CampoTexto id="nombre" name="nombre" autoComplete="name" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="email">Correo</label>
          <CampoTexto id="email" name="email" type="email" autoComplete="email" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="password">Contraseña</label>
          <CampoClave id="password" name="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
        </div>
        {rol === "atleta" && (
          <div>
            <label className="etiqueta" htmlFor="codigoEntrenador">Código de tu entrenador/a (opcional)</label>
            <CampoTexto className="uppercase" id="codigoEntrenador" name="codigoEntrenador" placeholder="ABC123" autoComplete="off" />
          </div>
        )}
        <fieldset>
          <legend className="etiqueta">Objetivo</legend>
          <div className="flex flex-wrap gap-2">
            {objetivos.map((o, i) => (
              <label key={o} className="cursor-pointer">
                <input type="radio" name="objetivo" value={o} defaultChecked={i === 0} className="peer sr-only" />
                <span className="inline-block rounded-full border-2 border-zinc-300 px-4 py-2 text-sm font-bold peer-checked:border-orange-600 peer-checked:bg-orange-600 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-orange-600 dark:border-zinc-700">
                  {o}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="etiqueta" htmlFor="nivel">Nivel</label>
          <select className="campo" id="nivel" name="nivel" defaultValue="Intermedio">
            <option>Principiante</option>
            <option>Intermedio</option>
            <option>Avanzado</option>
          </select>
        </div>
        <label className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" name="datosSalud" className="mt-1 accent-orange-600" />
          Acepto el tratamiento de mis datos de salud para calcular mi progreso.
        </label>
        <label className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" name="comparteTribu" className="mt-1 accent-orange-600" />
          Mi tribu puede ver mi racha y mis puntos.
        </label>
        <label className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" name="comparteEntrenador" className="mt-1 accent-orange-600" />
          Mi entrenador puede ver mis medidas y entrenos.
        </label>
        {error && (
          <p role="alert" className="rounded-md border border-red-600 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {aviso && (
          <p role="status" className="rounded-md border border-green-700 px-3 py-2 text-sm text-green-700 dark:text-green-400">
            {aviso}
          </p>
        )}
        <button className="btn-primary" disabled={enviando}>
          {enviando ? "Creando cuenta..." : "Crear cuenta"}
        </button>
        <p className="text-sm text-zinc-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-bold text-orange-600">Iniciar sesión</Link>
        </p>
      </form>
    </main>
  );
}
