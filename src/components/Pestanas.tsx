"use client";

type Item = { id: string; texto: string; aviso?: number };

/** Pestañas simples: una sola sección visible a la vez. El contenido lo pinta quien la usa. */
export default function Pestanas({
  items, activa, onCambia, etiqueta,
}: { items: Item[]; activa: string; onCambia: (id: string) => void; etiqueta: string }) {
  return (
    <div role="tablist" aria-label={etiqueta} className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
      {items.map((it) => {
        const on = it.id === activa;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onCambia(it.id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${
              on ? "border-orange-600 text-orange-600" : "border-transparent text-zinc-500 hover:text-foreground"
            }`}
          >
            {it.texto}
            {it.aviso ? (
              <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs text-white">{it.aviso}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
