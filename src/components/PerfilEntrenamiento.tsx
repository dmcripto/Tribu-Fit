"use client";

import { useState } from "react";
import Desplegable from "@/components/Desplegable";
import { usePerfil } from "@/lib/repo";
import type { Lugar, PerfilFitness, Sexo, Usuario } from "@/lib/types";

/** El alumno completa estos datos para que el sistema pueda proponer un plan a su medida. */
export default function PerfilEntrenamiento({ usuario }: { usuario: Usuario }) {
  const { perfil, guardar } = usePerfil(usuario);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => {
      const v = String(f.get(k) ?? "").replace(",", ".").trim();
      return v === "" ? null : Number(v);
    };
    const edad = num("edad");
    const altura = num("altura");
    if (edad !== null && !(Number.isInteger(edad) && edad >= 10 && edad <= 100)) return setMsg({ ok: false, texto: "Escribe tu edad en años, entre 10 y 100." });
    if (altura !== null && !(altura >= 100 && altura <= 250)) return setMsg({ ok: false, texto: "Escribe tu altura en centímetros, por ejemplo 165." });
    const lesiones = String(f.get("lesiones") ?? "").trim();
    const restricciones = String(f.get("restricciones") ?? "").trim();
    if (lesiones.length > 600 || restricciones.length > 600) return setMsg({ ok: false, texto: "Los textos son demasiado largos. Resúmelos a menos de 600 caracteres." });
    const nuevo: PerfilFitness = {
      edad, altura_cm: altura === null ? null : Math.round(altura), sexo: String(f.get("sexo")) as Sexo,
      dias_semana: Number(f.get("dias")), lugar: String(f.get("lugar")) as Lugar, lesiones, restricciones,
    };
    setEnviando(true);
    const fallo = await guardar(nuevo);
    setEnviando(false);
    setMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: "Perfil guardado. Tu entrenador/a lo usará para prepararte un plan a tu medida." });
  }

  return (
    <>
    {msg?.ok && (
      <p role="status" className="rounded-md border border-green-700 px-3 py-2 text-sm text-green-700 dark:text-green-400">{msg.texto}</p>
    )}
    <Desplegable
      titulo="Mi perfil de entrenamiento"
      detalle={perfil ? "Puedes actualizarlo cuando quieras" : "Complétalo para recibir un plan hecho para ti"}
      abierto={!perfil}
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Con estos datos el sistema prepara una propuesta de rutinas y de nutrición. <b>La revisa tu entrenador/a antes de que la veas</b>, y solo la ve si le diste permiso en Cuenta.
      </p>
      {/* key: el formulario se rellena cuando el perfil termina de cargar */}
      <form key={perfil ? "cargado" : "vacio"} onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="etiqueta" htmlFor="pf-edad">Edad</label>
            <input className="campo" id="pf-edad" name="edad" inputMode="numeric" defaultValue={perfil?.edad ?? ""} placeholder="30" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="pf-sexo">Sexo (para calcular calorías)</label>
            <select className="campo" id="pf-sexo" name="sexo" defaultValue={perfil?.sexo ?? "no_dice"}>
              <option value="mujer">Mujer</option>
              <option value="hombre">Hombre</option>
              <option value="no_dice">Prefiero no decirlo</option>
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="pf-altura">Altura (cm)</label>
            <input className="campo" id="pf-altura" name="altura" inputMode="numeric" defaultValue={perfil?.altura_cm ?? ""} placeholder="165" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="pf-dias">Días que puedes entrenar por semana</label>
            <select className="campo" id="pf-dias" name="dias" defaultValue={String(perfil?.dias_semana ?? 3)}>
              {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} días</option>)}
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="pf-lugar">Dónde entrenas</label>
            <select className="campo" id="pf-lugar" name="lugar" defaultValue={perfil?.lugar ?? "gimnasio"}>
              <option value="gimnasio">En gimnasio</option>
              <option value="casa">En casa, con poco o ningún equipo</option>
            </select>
          </div>
        </div>
        <div>
          <label className="etiqueta" htmlFor="pf-lesiones">Molestias o lesiones (opcional)</label>
          <textarea className="campo min-h-20" id="pf-lesiones" name="lesiones" defaultValue={perfil?.lesiones ?? ""} placeholder="Por ejemplo: dolor en la rodilla derecha al bajar escaleras" maxLength={600} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="pf-rest">Alimentos que no comes o alergias (opcional)</label>
          <textarea className="campo min-h-20" id="pf-rest" name="restricciones" defaultValue={perfil?.restricciones ?? ""} placeholder="Por ejemplo: intolerancia a la lactosa, soy vegetariana" maxLength={600} />
        </div>
        {msg && !msg.ok && <p role="alert" className="text-sm text-red-600">{msg.texto}</p>}
        <div><button className="btn-primary" disabled={enviando}>{enviando ? "Guardando..." : "Guardar perfil"}</button></div>
      </form>
    </Desplegable>
    </>
  );
}
