import Image from "next/image";

const tribus = [
  { nombre: "Hierro", texto: "Fuerza e hipertrofia con progresión semanal." },
  { nombre: "Fondo", texto: "Running y resistencia, de 5K a media maratón." },
  { nombre: "Casa", texto: "Entrenos de 30 minutos sin equipo." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-5 py-10">
      <header className="flex items-center justify-between">
        <Image
          src="/logo.png"
          alt="Tribu Fit"
          width={179}
          height={53}
          className="rounded-lg bg-black px-2 py-1"
          priority
        />
        <a
          href="#tribus"
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-bold text-white"
        >
          Unirme a la tribu
        </a>
      </header>

      <section className="flex flex-col gap-5">
        <h1 className="text-6xl font-black uppercase leading-none sm:text-8xl">
          Entrena en <span className="text-orange-600">tribu</span>
        </h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Rutinas, retos y seguimiento de tus números con gente que te empuja a
          llegar. Tu entrenador ve tu progreso y ajusta tu plan cada semana.
        </p>
      </section>

      <section id="tribus" className="grid gap-4 sm:grid-cols-3">
        {tribus.map((t) => (
          <article
            key={t.nombre}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h2 className="text-2xl font-black uppercase">{t.nombre}</h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">{t.texto}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
