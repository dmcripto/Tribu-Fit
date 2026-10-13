/** Iconos de trazo simple. Heredan el color del texto (currentColor). */
const D: Record<string, string> = {
  inicio: "M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6",
  rutinas: "M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11",
  nutricion: "M12 8c-2.2-2.2-7-1.2-7 4.2C5 17 8 21 10.5 21c.8 0 1-.4 1.5-.4s.7.4 1.5.4c2.500 0 5.500-4 5.500-8.800 0-5.400-4.800-6.400-7-4.200zM12 8c0-2.500 1-4.500 3.500-5",
  progreso: "M3 3v18h18M7 15l4-4 3 3 5-6",
  chat: "M21 12a8 8 0 01-11.600 7.100L4 20l1-4.600A8 8 0 1121 12z",
  mas: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  alumnos: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-3.500 3-6 7-6s7 2.500 7 6M17 11a3 3 0 100-6M18 15c2.500.5 4 2.300 4 5",
  propuestas: "M12 3l1.900 5.100L19 10l-5.100 1.900L12 17l-1.900-5.100L5 10l5.100-1.900zM19 16l.8 2.200L22 19l-2.200.8L19 22l-.8-2.200L16 19l2.200-.8z",
  campana: "M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8zM10 20a2 2 0 004 0",
  fuego: "M12 3c.5 4 5 5.500 5 10.500a5 5 0 01-10 0c0-2 1-3.500 2.500-4.500.2 1.800 1 2.800 2 3C11 9 10.500 6 12 3z",
  rayo: "M13 2L4 14h7l-1 8 9-12h-7z",
  peso: "M5 4h14l2 6H3zM7 10v1a5 5 0 0010 0v-1M12 4v2",
  grasa: "M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z",
  trofeo: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3",
  camara: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.500 3.500 0 100-7 3.500 3.500 0 000 7z",
  libro: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 012-2h13",
  tarjeta: "M3 6h18v12H3zM3 10h18M7 15h3",
  usuario: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.500-6 8-6s8 2 8 6",
  descarga: "M12 3v12M7 11l5 5 5-5M4 20h16",
  flecha: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.500l4.500 4.500L19 7",
  corazon: "M12 20s-8-5-8-11a4.500 4.500 0 018-2.700A4.500 4.500 0 0120 9c0 6-8 11-8 11z",
  salir: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9",
};

export type NombreIcono = keyof typeof D;

export default function Icono({ nombre, className = "size-6", relleno = false }: { nombre: NombreIcono; className?: string; relleno?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill={relleno ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={D[nombre]} />
    </svg>
  );
}
