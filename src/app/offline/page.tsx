export const metadata = { title: "Sin conexión · Tribu Fit" };

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-3xl font-black uppercase">Sin conexión</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        No hay internet en este momento. Revisa tu conexión y vuelve a intentarlo.
      </p>
      <a href="/ir" className="btn-primary">Reintentar</a>
    </main>
  );
}
