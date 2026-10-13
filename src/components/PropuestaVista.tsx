import type { ContenidoRutinas, Propuesta } from "@/lib/types";

/** Agrupa semanas consecutivas con las mismas rutinas: "Semanas 1-3", "Semana 4". */
function agruparSemanas(c: ContenidoRutinas) {
  const grupos: { desde: number; hasta: number; rutinas: ContenidoRutinas["semanas"][number]["rutinas"] }[] = [];
  for (const s of c.semanas) {
    const ultimo = grupos.at(-1);
    if (ultimo && JSON.stringify(ultimo.rutinas) === JSON.stringify(s.rutinas)) ultimo.hasta = s.semana;
    else grupos.push({ desde: s.semana, hasta: s.semana, rutinas: s.rutinas });
  }
  return grupos;
}

/** Contenido completo de una propuesta, para revisarla antes de aprobar. */
export default function PropuestaVista({ propuesta }: { propuesta: Propuesta }) {
  if (propuesta.tipo === "nutricion") {
    const c = propuesta.contenido;
    return (
      <div className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          {[["Calorías", `${c.kcal} kcal`], ["Proteína", `${c.proteina} g`], ["Carbohidratos", `${c.carbos} g`], ["Grasas", `${c.grasas} g`], ["Agua", `${c.agua} vasos`]].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
              <dt className="font-mono text-xs uppercase text-zinc-500">{k}</dt>
              <dd className="font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="etiqueta">Notas que verá el alumno</p>
          <p className="whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">{c.notas}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {agruparSemanas(propuesta.contenido).map((g) => (
        <div key={g.desde} className="flex flex-col gap-2">
          <p className="etiqueta">{g.desde === g.hasta ? `Semana ${g.desde}` : `Semanas ${g.desde} a ${g.hasta}`}</p>
          <ul className="flex flex-col gap-2">
            {g.rutinas.map((r) => (
              <li key={r.nombre} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="font-bold">{r.nombre}</p>
                <p className="mb-1 text-xs text-zinc-500">{r.detalle}</p>
                <ul className="text-sm text-zinc-700 dark:text-zinc-300">
                  {r.ejercicios.map((e) => (
                    <li key={e.nombre} className="flex justify-between gap-3 border-t border-zinc-100 py-1 dark:border-zinc-900">
                      <span>{e.nombre}</span>
                      <span className="shrink-0 font-mono text-xs text-zinc-500">{e.series}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
