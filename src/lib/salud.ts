/** Condiciones de salud que afectan lo que se puede comer. El alumno las declara; la entrenadora las ve. */
export type Condicion =
  | "diabetes" | "hipertension" | "celiaquia" | "intolerancia_lactosa" | "alergia_frutos_secos"
  | "alergia_huevo" | "colesterol_alto" | "embarazo_lactancia";

export const CONDICIONES: { id: Condicion; texto: string }[] = [
  { id: "diabetes", texto: "Diabetes" },
  { id: "hipertension", texto: "Hipertensión" },
  { id: "celiaquia", texto: "Celiaquía" },
  { id: "intolerancia_lactosa", texto: "Intolerancia a la lactosa" },
  { id: "alergia_frutos_secos", texto: "Alergia a frutos secos" },
  { id: "alergia_huevo", texto: "Alergia al huevo" },
  { id: "colesterol_alto", texto: "Colesterol alto" },
  { id: "embarazo_lactancia", texto: "Embarazo / lactancia" },
];

export type Salud = { condiciones: Condicion[]; detalle: string };
export const SALUD_VACIA: Salud = { condiciones: [], detalle: "" };
export const SALUD_KEY = "tf_salud";

const IDS = new Set<string>(CONDICIONES.map((c) => c.id));

/** Deja solo condiciones conocidas y sin repetir (la base de datos guarda texto libre). */
export function limpiarCondiciones(c: unknown): Condicion[] {
  if (!Array.isArray(c)) return [];
  return [...new Set(c.filter((x): x is Condicion => typeof x === "string" && IDS.has(x)))];
}

export const nombreCondicion = (id: string) => CONDICIONES.find((c) => c.id === id)?.texto ?? id;
export const textoCondiciones = (c: Condicion[]) => c.map(nombreCondicion).join(", ");
