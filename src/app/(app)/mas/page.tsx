"use client";

import Link from "next/link";
import { useUsuario } from "@/components/AppShell";

type Item = { href: string; titulo: string; texto: string };

const ALUMNO: Item[] = [
  { href: "/chat", titulo: "Chat", texto: "Habla con tu entrenador/a y pregunta tus dudas." },
  { href: "/avisos", titulo: "Avisos", texto: "Recordatorios y novedades." },
  { href: "/retos", titulo: "Retos y ranking", texto: "Retos, insignias y la tabla de la tribu." },
  { href: "/recetas", titulo: "Recetas", texto: "Ideas que encajan con tus macros de hoy." },
  { href: "/ejercicios", titulo: "Ejercicios", texto: "Técnica paso a paso y errores comunes." },
  { href: "/pagos", titulo: "Pagos", texto: "Tu cuota y tu seguimiento personalizado." },
  { href: "/cuenta", titulo: "Cuenta", texto: "Contraseña, privacidad y tema." },
];
const ENTRENADOR: Item[] = [
  { href: "/avisos", titulo: "Avisos", texto: "Pagos por confirmar y propuestas por revisar." },
  { href: "/retos", titulo: "Retos y ranking", texto: "Crea retos y mira quién los cumple." },
  { href: "/ejercicios", titulo: "Ejercicios", texto: "Biblioteca para consultar o compartir." },
  { href: "/pagos", titulo: "Pagos", texto: "Cobros y confirmaciones." },
  { href: "/panel", titulo: "Inicio", texto: "Tu resumen." },
  { href: "/cuenta", titulo: "Cuenta", texto: "Contraseña, privacidad y tema." },
];

export default function Mas() {
  const yo = useUsuario();
  const items = yo?.rol === "entrenador" ? ENTRENADOR : ALUMNO;
  return (
    <main className="flex flex-col gap-5">
      <h1 className="titulo">Más</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="tarjeta block h-full hover:border-orange-600">
              <span className="block text-lg font-black">{i.titulo}</span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{i.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
