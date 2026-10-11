import type { Medida } from "@/lib/types";

export default function GraficoPeso({ datos }: { datos: Medida[] }) {
  if (datos.length < 2)
    return (
      <p className="text-sm text-zinc-500">
        Hacen falta al menos dos registros para ver la evolución.
      </p>
    );
  const W = 560, H = 200, L = 40, R = 16, T = 14, B = 26;
  const pesos = datos.map((d) => d.peso_kg);
  const min = Math.floor(Math.min(...pesos) - 1);
  const max = Math.ceil(Math.max(...pesos) + 1);
  const x = (i: number) => L + (i * (W - L - R)) / (datos.length - 1);
  const y = (v: number) => T + ((max - v) * (H - T - B)) / (max - min);
  const pts = datos.map((d, i) => `${x(i)},${y(d.peso_kg)}`).join(" ");
  const ult = datos[datos.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Peso de ${datos[0].peso_kg} a ${ult.peso_kg} kilos`}>
      {[min, (min + max) / 2, max].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} className="stroke-zinc-200 dark:stroke-zinc-800" />
          <text x={L - 6} y={y(g) + 4} textAnchor="end" className="fill-zinc-500 text-[11px]">{g}</text>
        </g>
      ))}
      <polygon points={`${x(0)},${y(min)} ${pts} ${x(datos.length - 1)},${y(min)}`} className="fill-orange-600/15" />
      <polyline points={pts} fill="none" className="stroke-orange-600" strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={x(datos.length - 1)} cy={y(ult.peso_kg)} r={5} className="fill-orange-600" />
      <text x={x(0)} y={H - 6} className="fill-zinc-500 text-[11px]">{datos[0].fecha}</text>
      <text x={W - R} y={H - 6} textAnchor="end" className="fill-zinc-500 text-[11px]">{ult.fecha}</text>
    </svg>
  );
}
