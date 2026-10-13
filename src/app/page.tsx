import Image from "next/image";
import Link from "next/link";
import DescargaApk from "@/components/DescargaApk";
import Icono, { type NombreIcono } from "@/components/Iconos";
import RedirigirAuth from "@/components/RedirigirAuth";

const tribus = [
  { nombre: "Hierro", emoji: "🏋️", texto: "Fuerza e hipertrofia con progresión semanal.", color: "from-orange-500 to-red-600" },
  { nombre: "Fondo", emoji: "🏃", texto: "Running y resistencia, de 5K a media maratón.", color: "from-amber-400 to-orange-500" },
  { nombre: "Casa", emoji: "🏠", texto: "Entrenos de 30 minutos sin equipo.", color: "from-rose-500 to-orange-500" },
];

const funciones: { icono: NombreIcono; titulo: string; texto: string }[] = [
  { icono: "propuestas", titulo: "Planes a tu medida", texto: "Rutinas y nutrición armadas con tus datos y revisadas por tu entrenador/a." },
  { icono: "nutricion", titulo: "Nutrición y recetas", texto: "Tus macros del día y recetas que encajan con lo que te falta." },
  { icono: "progreso", titulo: "Tu progreso a la vista", texto: "Peso, marcas, fotos de antes y después, y tu racha." },
  { icono: "chat", titulo: "Chat con tu entrenador/a", texto: "Dudas, ajustes y ánimo, sin salir de la app." },
  { icono: "trofeo", titulo: "Retos y ranking", texto: "Suma insignias y compite sano con tu tribu." },
  { icono: "tarjeta", titulo: "Pagos simples", texto: "Mercado Pago, QR o transferencia. Tu cuota siempre clara." },
];

const pasos = [
  { n: "1", titulo: "Crea tu cuenta", texto: "Con el código de tu entrenador/a te vinculas en un minuto." },
  { n: "2", titulo: "Cuéntanos de ti", texto: "Objetivo, nivel, días y lesiones. Así el plan es realmente tuyo." },
  { n: "3", titulo: "Entrena y registra", texto: "Marca tus ejercicios, anota tu peso y mira cómo avanzas." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 py-6 sm:px-5 sm:py-8">
      <RedirigirAuth />
      <header className="flex items-center justify-between gap-3">
        <Image src="/logo.png" alt="Tribu Fit" width={56} height={56} className="size-14 rounded-full ring-2 ring-orange-500/60 ring-offset-2 ring-offset-[var(--background)]" priority />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-bold">Iniciar sesión</Link>
          <Link href="/registro" className="btn-primary">Unirme a la tribu</Link>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-3xl bg-[#120d0a] px-6 py-12 text-white shadow-2xl shadow-orange-900/20 sm:px-12 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-orange-600/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 size-72 rounded-full bg-amber-500/25 blur-3xl" />
        <div className="relative flex flex-col gap-6">
          <span className="w-fit rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-orange-300">
            Fitness · seguimiento personal
          </span>
          <h1 className="text-6xl font-black uppercase leading-[0.9] tracking-tight sm:text-8xl">
            Entrena<br />en <span className="acento">tribu</span>
          </h1>
          <p className="max-w-xl text-lg text-zinc-300">
            Rutinas, nutrición y seguimiento de tus números con gente que te empuja a llegar. Tu entrenador/a ve tu progreso y ajusta tu plan cada semana.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/registro" className="btn-primary !px-6 !py-3.5 text-base">
              Empezar gratis <Icono nombre="flecha" className="size-5" />
            </Link>
            <Link href="/descargar" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3.5 text-base font-bold text-white transition hover:bg-white/10">
              <Icono nombre="descarga" className="size-5" /> Descargar la app
            </Link>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-300">
            {["Sin límite de alumnos", "Funciona en el celular", "Tus datos son tuyos"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Icono nombre="check" className="size-4 text-orange-400" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="tribus" className="grid gap-4 sm:grid-cols-3">
        {tribus.map((t) => (
          <article key={t.nombre} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.color} p-5 text-white shadow-lg shadow-orange-900/10 transition hover:-translate-y-1`}>
            <span aria-hidden="true" className="absolute -right-2 -top-3 text-7xl opacity-25">{t.emoji}</span>
            <h2 className="relative text-3xl font-black uppercase">{t.nombre}</h2>
            <p className="relative mt-2 text-white/90">{t.texto}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="que-incluye">
        <h2 id="que-incluye" className="titulo">Todo en un solo lugar</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funciones.map((f) => (
            <li key={f.titulo} className="tarjeta flex flex-col gap-3 hover:-translate-y-1 hover:border-orange-500 hover:shadow-md">
              <span className="icono-caja"><Icono nombre={f.icono} /></span>
              <h3 className="text-lg font-black">{f.titulo}</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{f.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="como-funciona">
        <h2 id="como-funciona" className="titulo">Cómo funciona</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {pasos.map((p) => (
            <li key={p.n} className="tarjeta relative overflow-hidden">
              <span aria-hidden="true" className="acento absolute -right-1 -top-4 text-8xl font-black opacity-30">{p.n}</span>
              <h3 className="relative text-lg font-black">{p.titulo}</h3>
              <p className="relative mt-1 text-sm text-zinc-600 dark:text-zinc-400">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <DescargaApk enlaceDetalle />

      <footer className="flex flex-wrap gap-4 border-t border-[var(--borde)] pt-4 text-sm text-zinc-500">
        <Link href="/terminos" className="underline">Términos de uso</Link>
        <Link href="/privacidad" className="underline">Política de privacidad</Link>
      </footer>
    </main>
  );
}
