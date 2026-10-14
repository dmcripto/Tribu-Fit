import type { Condicion } from "./salud";
import type { ObjetivoNutricion } from "./types";

export type Momento = "desayuno" | "almuerzo" | "cena" | "snack";
export type Etiqueta = "vegetariana" | "vegana" | "sin_lactosa" | "sin_gluten" | "sin_frutos_secos" | "sin_huevo" | "sin_pescado";

export type Receta = {
  id: string;
  nombre: string;
  momento: Momento[];
  minutos: number;
  /** Macros de UNA porción base. */
  kcal: number;
  proteina: number;
  carbos: number;
  grasas: number;
  etiquetas: Etiqueta[];
  ingredientes: string[];
  pasos: string[];
};

const T = (...e: Etiqueta[]) => e;

export const RECETAS: Receta[] = [
  { id: "avena-proteica", nombre: "Avena proteica con fruta", momento: ["desayuno"], minutos: 8, kcal: 420, proteina: 28, carbos: 55, grasas: 9,
    etiquetas: T("vegetariana", "sin_frutos_secos", "sin_pescado"), ingredientes: ["50 g de avena", "250 ml de leche", "1 scoop de proteína o 150 g de yogur griego", "1 plátano", "Canela"],
    pasos: ["Cocina la avena con la leche 4-5 min.", "Mezcla la proteína o el yogur fuera del fuego.", "Sirve con el plátano en rodajas y canela."] },
  { id: "avena-vegana", nombre: "Avena con bebida de soja y frutos rojos", momento: ["desayuno", "snack"], minutos: 8, kcal: 380, proteina: 18, carbos: 55, grasas: 10,
    etiquetas: T("vegetariana", "vegana", "sin_lactosa", "sin_huevo", "sin_pescado"), ingredientes: ["50 g de avena", "250 ml de bebida de soja", "100 g de frutos rojos", "10 g de semillas de chía"],
    pasos: ["Cocina la avena con la bebida de soja.", "Añade frutos rojos y chía."] },
  { id: "tortilla-claras", nombre: "Tortilla de claras con espinaca y pan integral", momento: ["desayuno", "cena"], minutos: 10, kcal: 340, proteina: 32, carbos: 28, grasas: 10,
    etiquetas: T("vegetariana", "sin_lactosa", "sin_pescado", "sin_frutos_secos"), ingredientes: ["1 huevo + 4 claras", "Espinaca", "2 rebanadas de pan integral", "Aceite de oliva"],
    pasos: ["Saltea la espinaca 1 min.", "Vierte los huevos batidos y cuaja la tortilla.", "Sirve con el pan tostado."] },
  { id: "yogur-granola", nombre: "Yogur griego con granola y miel", momento: ["desayuno", "snack"], minutos: 3, kcal: 330, proteina: 24, carbos: 38, grasas: 9,
    etiquetas: T("vegetariana", "sin_huevo", "sin_pescado"), ingredientes: ["200 g de yogur griego natural", "30 g de granola", "1 cdta de miel", "Fruta al gusto"], pasos: ["Mezcla todo en un bol."] },
  { id: "tostadas-aguacate", nombre: "Tostadas de aguacate y huevo", momento: ["desayuno"], minutos: 10, kcal: 410, proteina: 20, carbos: 34, grasas: 22,
    etiquetas: T("vegetariana", "sin_lactosa", "sin_pescado", "sin_frutos_secos"), ingredientes: ["2 rebanadas de pan integral", "½ aguacate", "2 huevos", "Limón y sal"], pasos: ["Tuesta el pan.", "Machaca el aguacate con limón.", "Cocina los huevos a la plancha y monta."] },
  { id: "batido-recuperacion", nombre: "Batido de recuperación", momento: ["snack", "desayuno"], minutos: 3, kcal: 360, proteina: 30, carbos: 45, grasas: 6,
    etiquetas: T("vegetariana", "sin_huevo", "sin_pescado", "sin_frutos_secos"), ingredientes: ["1 scoop de proteína", "1 plátano", "250 ml de leche", "30 g de avena"], pasos: ["Licúa todo hasta que quede cremoso."] },
  { id: "pollo-arroz", nombre: "Pollo a la plancha con arroz y verduras", momento: ["almuerzo", "cena"], minutos: 25, kcal: 560, proteina: 48, carbos: 62, grasas: 12,
    etiquetas: T("sin_lactosa", "sin_gluten", "sin_huevo", "sin_pescado", "sin_frutos_secos"), ingredientes: ["150 g de pechuga de pollo", "80 g de arroz (en seco)", "Verduras al gusto", "1 cda de aceite de oliva"],
    pasos: ["Cuece el arroz.", "Dora el pollo sazonado 5-6 min por lado.", "Saltea las verduras y sirve todo junto."] },
  { id: "salmon-batata", nombre: "Salmón al horno con batata", momento: ["almuerzo", "cena"], minutos: 30, kcal: 600, proteina: 40, carbos: 48, grasas: 26,
    etiquetas: T("sin_lactosa", "sin_gluten", "sin_huevo", "sin_frutos_secos"), ingredientes: ["150 g de salmón", "250 g de batata", "Brócoli", "Aceite, limón, sal"], pasos: ["Hornea la batata en cubos 15 min a 200 °C.", "Añade el salmón y el brócoli 12 min más.", "Aliña con limón."] },
  { id: "lentejas", nombre: "Guiso de lentejas con verduras", momento: ["almuerzo", "cena"], minutos: 35, kcal: 480, proteina: 26, carbos: 70, grasas: 8,
    etiquetas: T("vegetariana", "vegana", "sin_lactosa", "sin_gluten", "sin_huevo", "sin_pescado", "sin_frutos_secos"), ingredientes: ["200 g de lentejas cocidas", "Zanahoria, cebolla y pimiento", "Ajo, pimentón, comino", "Aceite de oliva"], pasos: ["Sofríe las verduras.", "Añade las lentejas, especias y un poco de agua.", "Cocina 15 min."] },
  { id: "bowl-garbanzos", nombre: "Bowl de garbanzos, quinoa y verduras", momento: ["almuerzo", "cena"], minutos: 20, kcal: 520, proteina: 22, carbos: 72, grasas: 15,
    etiquetas: T("vegetariana", "vegana", "sin_lactosa", "sin_gluten", "sin_huevo", "sin_pescado", "sin_frutos_secos"), ingredientes: ["150 g de garbanzos cocidos", "60 g de quinoa (seca)", "Tomate, pepino, espinaca", "Tahini y limón"], pasos: ["Cuece la quinoa.", "Monta el bowl con las verduras y los garbanzos.", "Aliña con tahini y limón."] },
  { id: "tacos-pavo", nombre: "Tacos de pavo y frijoles", momento: ["almuerzo", "cena"], minutos: 20, kcal: 540, proteina: 42, carbos: 55, grasas: 16,
    etiquetas: T("sin_lactosa", "sin_huevo", "sin_pescado", "sin_frutos_secos"), ingredientes: ["150 g de pavo molido", "3 tortillas de maíz", "100 g de frijoles", "Lechuga, tomate, salsa"], pasos: ["Cocina el pavo con especias.", "Calienta las tortillas.", "Rellena con pavo, frijoles y verduras."] },
  { id: "atun-ensalada", nombre: "Ensalada de atún, huevo y patata", momento: ["almuerzo", "cena"], minutos: 15, kcal: 430, proteina: 38, carbos: 30, grasas: 18,
    etiquetas: T("sin_lactosa", "sin_gluten", "sin_frutos_secos"), ingredientes: ["1 lata de atún", "1 huevo cocido", "150 g de patata cocida", "Lechuga, tomate, aceitunas"], pasos: ["Mezcla todo en un bol.", "Aliña con aceite y limón."] },
  { id: "pasta-pollo", nombre: "Pasta integral con pollo y tomate", momento: ["almuerzo", "cena"], minutos: 20, kcal: 600, proteina: 44, carbos: 78, grasas: 12,
    etiquetas: T("sin_lactosa", "sin_huevo", "sin_pescado", "sin_frutos_secos"), ingredientes: ["80 g de pasta integral", "120 g de pollo en tiras", "Salsa de tomate natural", "Albahaca"], pasos: ["Cuece la pasta.", "Dora el pollo y añade el tomate.", "Mezcla con la pasta."] },
  { id: "tofu-salteado", nombre: "Tofu salteado con arroz y verduras", momento: ["almuerzo", "cena"], minutos: 20, kcal: 500, proteina: 28, carbos: 60, grasas: 16,
    etiquetas: T("vegetariana", "vegana", "sin_lactosa", "sin_huevo", "sin_pescado", "sin_frutos_secos"), ingredientes: ["150 g de tofu firme", "70 g de arroz (seco)", "Brócoli, zanahoria, pimiento", "Salsa de soja (o tamari)"], pasos: ["Dora el tofu en cubos.", "Saltea las verduras.", "Mezcla con el arroz y la salsa."] },
  { id: "ternera-verduras", nombre: "Ternera magra con verduras asadas y patata", momento: ["almuerzo", "cena"], minutos: 30, kcal: 580, proteina: 46, carbos: 45, grasas: 22,
    etiquetas: T("sin_lactosa", "sin_gluten", "sin_huevo", "sin_pescado", "sin_frutos_secos"), ingredientes: ["150 g de ternera magra", "200 g de patata", "Calabacín, cebolla, pimiento", "Aceite de oliva"], pasos: ["Hornea las verduras y la patata.", "Dora la ternera a la plancha.", "Sirve junto."] },
  { id: "crema-calabaza", nombre: "Crema de calabaza con huevo duro", momento: ["cena"], minutos: 25, kcal: 300, proteina: 16, carbos: 28, grasas: 14,
    etiquetas: T("vegetariana", "sin_lactosa", "sin_gluten", "sin_pescado", "sin_frutos_secos"), ingredientes: ["300 g de calabaza", "1 cebolla", "1 huevo cocido", "Caldo de verduras"], pasos: ["Cuece la calabaza y la cebolla en el caldo.", "Tritura y sirve con el huevo."] },
  { id: "merluza-verduras", nombre: "Merluza al horno con verduras", momento: ["cena"], minutos: 25, kcal: 330, proteina: 38, carbos: 20, grasas: 10,
    etiquetas: T("sin_lactosa", "sin_gluten", "sin_huevo", "sin_frutos_secos"), ingredientes: ["200 g de merluza", "Tomate, cebolla, calabacín", "Aceite, limón, perejil"], pasos: ["Coloca las verduras en una bandeja.", "Añade la merluza y hornea 15 min a 190 °C."] },
  { id: "wrap-pollo", nombre: "Wrap de pollo y hummus", momento: ["almuerzo", "cena"], minutos: 12, kcal: 470, proteina: 35, carbos: 44, grasas: 16,
    etiquetas: T("sin_lactosa", "sin_huevo", "sin_pescado"), ingredientes: ["1 tortilla de trigo grande", "120 g de pollo cocido", "2 cdas de hummus", "Lechuga y tomate"], pasos: ["Extiende el hummus en la tortilla.", "Añade pollo y verduras, enrolla."] },
  { id: "hummus-zanahoria", nombre: "Hummus con bastones de verdura", momento: ["snack"], minutos: 5, kcal: 190, proteina: 7, carbos: 20, grasas: 9,
    etiquetas: T("vegetariana", "vegana", "sin_lactosa", "sin_gluten", "sin_huevo", "sin_pescado", "sin_frutos_secos"), ingredientes: ["60 g de hummus", "Zanahoria y pepino en bastones"], pasos: ["Corta las verduras y acompaña con el hummus."] },
  { id: "requeson-fruta", nombre: "Requesón con fruta y nueces", momento: ["snack"], minutos: 3, kcal: 240, proteina: 22, carbos: 18, grasas: 9,
    etiquetas: T("vegetariana", "sin_huevo", "sin_pescado"), ingredientes: ["150 g de requesón", "1 manzana o pera", "10 g de nueces"], pasos: ["Sirve el requesón con la fruta troceada y las nueces."] },
  { id: "tostada-pavo", nombre: "Tostada integral con pavo y tomate", momento: ["snack", "desayuno"], minutos: 5, kcal: 250, proteina: 20, carbos: 28, grasas: 6,
    etiquetas: T("sin_lactosa", "sin_huevo", "sin_pescado", "sin_frutos_secos"), ingredientes: ["2 rebanadas de pan integral", "60 g de pechuga de pavo", "Tomate", "Aceite de oliva"], pasos: ["Tuesta el pan, añade tomate y pavo."] },
  { id: "huevos-cocidos", nombre: "Huevos cocidos con fruta", momento: ["snack"], minutos: 12, kcal: 230, proteina: 14, carbos: 22, grasas: 10,
    etiquetas: T("vegetariana", "sin_lactosa", "sin_gluten", "sin_pescado", "sin_frutos_secos"), ingredientes: ["2 huevos", "1 pieza de fruta"], pasos: ["Cuece los huevos 10 min.", "Come con la fruta."] },
  { id: "arroz-leche-fit", nombre: "Pudin de chía con bebida vegetal", momento: ["snack", "desayuno"], minutos: 5, kcal: 280, proteina: 11, carbos: 28, grasas: 14,
    etiquetas: T("vegetariana", "vegana", "sin_lactosa", "sin_gluten", "sin_huevo", "sin_pescado", "sin_frutos_secos"), ingredientes: ["30 g de chía", "200 ml de bebida de avena", "Fruta fresca"], pasos: ["Mezcla chía y bebida y deja reposar 4 h o toda la noche.", "Sirve con la fruta."] },
];

/** Etiquetas que una receta debe cumplir según la condición de salud declarada. */
const ETIQUETA_POR_CONDICION: Partial<Record<Condicion, Etiqueta>> = {
  celiaquia: "sin_gluten",
  intolerancia_lactosa: "sin_lactosa",
  alergia_frutos_secos: "sin_frutos_secos",
  alergia_huevo: "sin_huevo",
};

/** Recetas que no conviene sugerir con cada condición (azúcar añadida, mucha sal, grasa/colesterol, mercurio…). */
const EVITAR_POR_CONDICION: Partial<Record<Condicion, string[]>> = {
  diabetes: ["yogur-granola", "batido-recuperacion"],
  hipertension: ["atun-ensalada", "tostada-pavo", "tofu-salteado"],
  colesterol_alto: ["tostadas-aguacate", "huevos-cocidos", "ternera-verduras"],
  embarazo_lactancia: ["atun-ensalada"],
};
/** Con diabetes, además, se evitan las recetas con más de 70 g de carbohidratos por porción. */
const CARBOS_MAX_DIABETES = 70;

export const restriccionesDeSalud = (c: Condicion[]): Etiqueta[] =>
  [...new Set(c.map((x) => ETIQUETA_POR_CONDICION[x]).filter((e): e is Etiqueta => !!e))];

/** ¿Es una receta apta para quien declaró estas condiciones? */
export function aptaParaSalud(r: Receta, c: Condicion[]): boolean {
  if (!restriccionesDeSalud(c).every((e) => r.etiquetas.includes(e))) return false;
  if (c.includes("diabetes") && r.carbos > CARBOS_MAX_DIABETES) return false;
  return !c.some((x) => EVITAR_POR_CONDICION[x]?.includes(r.id));
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Convierte el texto libre de restricciones del perfil en etiquetas que la receta debe cumplir. */
export function restriccionesA(texto: string): Etiqueta[] {
  const t = sinTildes(texto);
  const r = new Set<Etiqueta>();
  if (/vegan/.test(t)) { r.add("vegana"); r.add("vegetariana"); }
  if (/vegetarian/.test(t)) r.add("vegetariana");
  if (/lactosa|lacteo|leche/.test(t)) r.add("sin_lactosa");
  if (/gluten|celiac|celiaquia/.test(t)) r.add("sin_gluten");
  if (/(nuez|nueces|frutos? secos|mani|cacahuete|almendra)/.test(t)) r.add("sin_frutos_secos");
  if (/huevo/.test(t)) r.add("sin_huevo");
  if (/(pescado|marisco|atun|salmon)/.test(t)) r.add("sin_pescado");
  return [...r];
}

export type Sugerencia = { receta: Receta; porcion: number; kcal: number; proteina: number; carbos: number; grasas: number };

export function escalar(r: Receta, porcion: number): Sugerencia {
  const f = (n: number) => Math.round(n * porcion);
  return { receta: r, porcion, kcal: f(r.kcal), proteina: f(r.proteina), carbos: f(r.carbos), grasas: f(r.grasas) };
}

/** Momento del día según la hora, para sugerir lo que toca. */
export function momentoActual(hora: number): Momento {
  return hora < 11 ? "desayuno" : hora < 16 ? "almuerzo" : hora < 18 ? "snack" : "cena";
}

const FRACCION: Record<Momento, number> = { desayuno: 0.25, almuerzo: 0.35, cena: 0.3, snack: 0.1 };

/**
 * Sugiere recetas para un momento del día. Calcula cuánto le queda al alumno de su objetivo,
 * ajusta la porción de cada receta (0,5 a 2 en pasos de 0,25) y ordena por lo bien que encaja
 * en calorías y proteína. Nunca sugiere algo que rompa sus restricciones.
 */
export function sugerirRecetas(opts: {
  momento: Momento;
  objetivo: Pick<ObjetivoNutricion, "kcal" | "proteina"> | null;
  consumido: { kcal: number; proteina: number };
  restricciones: Etiqueta[];
  /** Condiciones de salud declaradas: filtran además de las restricciones. */
  salud?: Condicion[];
  limite?: number;
}): Sugerencia[] {
  const { momento, objetivo, consumido, restricciones, salud = [], limite = 6 } = opts;
  const meta = objetivo ?? { kcal: 2000, proteina: 110 };
  // Lo que toca comer ahora: la parte típica del momento, sin pasarse de lo que queda del día.
  const quedaKcal = Math.max(meta.kcal - consumido.kcal, 0);
  const quedaProt = Math.max(meta.proteina - consumido.proteina, 0);
  const objKcal = Math.min(meta.kcal * FRACCION[momento], quedaKcal || meta.kcal * FRACCION[momento]);
  const objProt = Math.min(meta.proteina * FRACCION[momento], quedaProt || meta.proteina * FRACCION[momento]);

  return RECETAS
    .filter((r) => r.momento.includes(momento) && restricciones.every((e) => r.etiquetas.includes(e)) && aptaParaSalud(r, salud))
    .map((r) => {
      const ideal = objKcal / r.kcal;
      const porcion = Math.min(2, Math.max(0.5, Math.round(ideal * 4) / 4));
      const s = escalar(r, porcion);
      const errK = Math.abs(s.kcal - objKcal) / Math.max(objKcal, 1);
      const errP = Math.abs(s.proteina - objProt) / Math.max(objProt, 1);
      return { s, puntaje: errK * 0.6 + errP * 0.4 };
    })
    .sort((a, b) => a.puntaje - b.puntaje)
    .slice(0, limite)
    .map((x) => x.s);
}
