const TONOS = {
  ok: "border-green-700 text-green-700 dark:border-green-400 dark:text-green-400",
  aviso: "border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-400",
  mal: "border-red-600 text-red-600",
  neutro: "border-zinc-400 text-zinc-500",
} as const;

/** Etiqueta pequeña de estado. */
export default function Chip({ tono, children }: { tono: keyof typeof TONOS; children: React.ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold ${TONOS[tono]}`}>
      {children}
    </span>
  );
}
