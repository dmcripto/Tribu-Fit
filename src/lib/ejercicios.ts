export type Ejercicio = {
  id: string;
  nombre: string;
  musculo: string;
  equipo: "Peso corporal" | "Mancuernas" | "Barra" | "Máquina" | "Polea" | "Banda" | "Sin equipo";
  nivel: "Principiante" | "Intermedio" | "Avanzado";
  pasos: string[];
  errores: string[];
  /** Variantes más fáciles o para casa. */
  alternativa?: string;
  /** Palabras extra con las que se reconoce en una rutina. */
  alias?: string[];
};

export const MUSCULOS = ["Pecho", "Espalda", "Hombro", "Bíceps", "Tríceps", "Pierna", "Glúteo", "Core", "Cardio"] as const;

export const EJERCICIOS: Ejercicio[] = [
  { id: "press-banca", nombre: "Press banca", musculo: "Pecho", equipo: "Barra", nivel: "Intermedio",
    pasos: ["Acuéstate con los ojos bajo la barra, pies firmes en el suelo.", "Agarra la barra un poco más ancho que los hombros y escápulas juntas y abajo.", "Baja controlado hasta rozar el pecho a media altura.", "Empuja hacia arriba sin despegar glúteos ni espalda del banco."],
    errores: ["Rebotar la barra en el pecho.", "Abrir demasiado los codos (90°).", "Levantar los glúteos del banco."], alternativa: "Flexiones con las manos elevadas", alias: ["press de banca", "bench"] },
  { id: "press-inclinado", nombre: "Press inclinado con mancuernas", musculo: "Pecho", equipo: "Mancuernas", nivel: "Intermedio",
    pasos: ["Banco a 30°, mancuernas a la altura del pecho.", "Empuja hacia arriba juntando ligeramente las mancuernas.", "Baja lento hasta sentir estiramiento en el pecho."],
    errores: ["Banco demasiado vertical (trabaja más hombro).", "Dejar caer las mancuernas sin control."], alternativa: "Flexiones inclinadas" },
  { id: "flexiones", nombre: "Flexiones", musculo: "Pecho", equipo: "Peso corporal", nivel: "Principiante",
    pasos: ["Manos algo más anchas que los hombros, cuerpo en línea recta.", "Baja el pecho hasta casi tocar el suelo con codos a unos 45°.", "Empuja y vuelve arriba sin arquear la espalda."],
    errores: ["Hundir la cadera.", "Mover solo la cabeza.", "No bajar lo suficiente."], alternativa: "Flexiones con rodillas apoyadas", alias: ["push up", "lagartijas"] },
  { id: "aperturas", nombre: "Aperturas con mancuernas", musculo: "Pecho", equipo: "Mancuernas", nivel: "Principiante",
    pasos: ["Acostado, brazos arriba con codos ligeramente flexionados.", "Abre en arco hasta sentir estiramiento.", "Cierra apretando el pecho como un abrazo."], errores: ["Usar demasiado peso.", "Estirar los codos del todo."] },
  { id: "fondos", nombre: "Fondos", musculo: "Tríceps", equipo: "Peso corporal", nivel: "Intermedio",
    pasos: ["Agarra las barras paralelas con los brazos estirados.", "Baja doblando los codos hasta unos 90°.", "Empuja hasta estirar sin bloquear con violencia."], errores: ["Bajar demasiado y cargar el hombro.", "Balancear las piernas."], alternativa: "Fondos en banco", alias: ["fondos en paralelas"] },
  { id: "press-militar", nombre: "Press militar", musculo: "Hombro", equipo: "Barra", nivel: "Intermedio",
    pasos: ["De pie, barra a la altura de los hombros, abdomen firme.", "Empuja la barra por encima de la cabeza llevando la cabeza ligeramente atrás y luego adelante.", "Baja controlado hasta la clavícula."], errores: ["Arquear mucho la zona lumbar.", "Usar impulso de piernas sin querer."], alternativa: "Press con mancuernas sentado", alias: ["press de hombro", "overhead press"] },
  { id: "elevaciones-laterales", nombre: "Elevaciones laterales", musculo: "Hombro", equipo: "Mancuernas", nivel: "Principiante",
    pasos: ["De pie, mancuernas a los lados, codos ligeramente flexionados.", "Sube los brazos hasta la altura de los hombros.", "Baja en 2-3 segundos."], errores: ["Balancear el torso.", "Subir por encima de los hombros con el trapecio."] },
  { id: "face-pull", nombre: "Face pull", musculo: "Hombro", equipo: "Polea", nivel: "Principiante",
    pasos: ["Polea a la altura de la cara con cuerda.", "Tira hacia la frente separando las manos.", "Junta escápulas un segundo y vuelve lento."], errores: ["Usar mucho peso y echar el cuerpo atrás."], alternativa: "Remo con banda elástica" },
  { id: "dominadas", nombre: "Dominadas", musculo: "Espalda", equipo: "Peso corporal", nivel: "Avanzado",
    pasos: ["Agarra la barra algo más ancho que los hombros.", "Baja las escápulas y tira llevando el pecho a la barra.", "Baja controlado hasta estirar los brazos."], errores: ["Balancearse (kipping).", "No estirar del todo abajo."], alternativa: "Jalón al pecho o dominadas con banda", alias: ["pull up", "dominada"] },
  { id: "jalon", nombre: "Jalón al pecho", musculo: "Espalda", equipo: "Polea", nivel: "Principiante",
    pasos: ["Siéntate con los muslos fijos bajo el soporte.", "Tira de la barra hacia la parte alta del pecho.", "Sube lento hasta estirar los brazos."], errores: ["Tirar por detrás de la nuca.", "Inclinarse hacia atrás para ayudarse."], alias: ["jalon al pecho"] },
  { id: "remo-barra", nombre: "Remo con barra", musculo: "Espalda", equipo: "Barra", nivel: "Intermedio",
    pasos: ["Torso inclinado ~45°, espalda neutra, rodillas flexionadas.", "Tira de la barra hacia el abdomen.", "Baja controlado sin redondear la espalda."], errores: ["Redondear la zona lumbar.", "Usar impulso del torso."], alternativa: "Remo con mancuerna a una mano", alias: ["remo"] },
  { id: "remo-mancuerna", nombre: "Remo con mancuerna", musculo: "Espalda", equipo: "Mancuernas", nivel: "Principiante",
    pasos: ["Apoya mano y rodilla en un banco, espalda recta.", "Tira de la mancuerna hacia la cadera.", "Baja hasta estirar el brazo."], errores: ["Girar el torso al subir."] },
  { id: "curl-barra", nombre: "Curl con barra", musculo: "Bíceps", equipo: "Barra", nivel: "Principiante",
    pasos: ["De pie, agarre supino a la anchura de los hombros.", "Sube la barra flexionando los codos pegados al cuerpo.", "Baja lento."], errores: ["Balancear el cuerpo.", "Adelantar los codos."], alias: ["curl"] },
  { id: "curl-martillo", nombre: "Curl martillo", musculo: "Bíceps", equipo: "Mancuernas", nivel: "Principiante",
    pasos: ["Mancuernas con agarre neutro (palmas enfrentadas).", "Sube alternando sin mover el codo.", "Baja controlado."], errores: ["Impulsarse con la espalda."] },
  { id: "extension-triceps", nombre: "Extensión de tríceps en polea", musculo: "Tríceps", equipo: "Polea", nivel: "Principiante",
    pasos: ["Codos pegados al cuerpo, agarra la cuerda o barra.", "Extiende los brazos hacia abajo.", "Vuelve hasta 90° sin despegar los codos."], errores: ["Abrir los codos.", "Inclinar el torso para empujar."], alias: ["triceps polea", "jalón de tríceps"] },
  { id: "sentadilla", nombre: "Sentadilla", musculo: "Pierna", equipo: "Barra", nivel: "Intermedio",
    pasos: ["Barra sobre los trapecios, pies a la anchura de hombros, puntas algo abiertas.", "Baja empujando la cadera atrás y rodillas en línea con los pies.", "Baja hasta que los muslos queden paralelos o más.", "Sube empujando el suelo con todo el pie."], errores: ["Rodillas hacia dentro.", "Talones levantados.", "Redondear la espalda al bajar."], alternativa: "Sentadilla con peso corporal o goblet", alias: ["sentadilla con barra", "squat"] },
  { id: "sentadilla-goblet", nombre: "Sentadilla goblet", musculo: "Pierna", equipo: "Mancuernas", nivel: "Principiante",
    pasos: ["Sostén una mancuerna contra el pecho.", "Baja con el torso erguido.", "Sube sin perder la postura."], errores: ["Inclinar el torso hacia delante.", "Rodillas hacia dentro."] },
  { id: "zancadas", nombre: "Zancadas", musculo: "Pierna", equipo: "Mancuernas", nivel: "Principiante",
    pasos: ["Da un paso largo al frente.", "Baja hasta que ambas rodillas formen ~90°.", "Empuja con el pie delantero para volver."], errores: ["Paso demasiado corto.", "Rodilla delantera hacia dentro."], alternativa: "Zancada estática o sentadilla búlgara", alias: ["desplantes"] },
  { id: "prensa", nombre: "Prensa de piernas", musculo: "Pierna", equipo: "Máquina", nivel: "Principiante",
    pasos: ["Espalda y glúteos apoyados, pies a la anchura de hombros.", "Baja hasta ~90° de rodilla.", "Empuja sin bloquear las rodillas arriba."], errores: ["Despegar la cadera del asiento.", "Bloquear las rodillas de golpe."] },
  { id: "peso-muerto-rumano", nombre: "Peso muerto rumano", musculo: "Glúteo", equipo: "Barra", nivel: "Intermedio",
    pasos: ["Barra cerca de los muslos, rodillas casi estiradas.", "Lleva la cadera atrás bajando la barra pegada a las piernas.", "Sube apretando glúteos."], errores: ["Redondear la espalda.", "Alejar la barra del cuerpo."], alternativa: "Con mancuernas", alias: ["rumano", "peso muerto"] },
  { id: "hip-thrust", nombre: "Puente de glúteo (hip thrust)", musculo: "Glúteo", equipo: "Barra", nivel: "Principiante",
    pasos: ["Espalda alta apoyada en un banco, pies firmes.", "Sube la cadera hasta alinear rodillas, cadera y hombros.", "Aprieta glúteos arriba un segundo."], errores: ["Arquear la zona lumbar.", "Empujar con la punta de los pies."], alternativa: "Puente de glúteo en el suelo", alias: ["puente de gluteo", "elevación de cadera"] },
  { id: "gemelos", nombre: "Elevación de gemelos", musculo: "Pierna", equipo: "Máquina", nivel: "Principiante",
    pasos: ["Apoya la parte delantera del pie en un escalón.", "Sube todo lo que puedas.", "Baja hasta estirar y repite."], errores: ["Rebotar sin estirar.", "Recorrido corto."], alias: ["gemelos", "pantorrillas"] },
  { id: "plancha", nombre: "Plancha", musculo: "Core", equipo: "Peso corporal", nivel: "Principiante",
    pasos: ["Antebrazos en el suelo, cuerpo en línea recta.", "Aprieta abdomen y glúteos.", "Respira y mantén el tiempo indicado."], errores: ["Hundir o subir la cadera.", "Aguantar la respiración."], alternativa: "Plancha con rodillas apoyadas", alias: ["plank"] },
  { id: "crunch", nombre: "Crunch abdominal", musculo: "Core", equipo: "Peso corporal", nivel: "Principiante",
    pasos: ["Acostado, rodillas flexionadas, manos junto a las sienes.", "Sube los hombros enrollando el tronco.", "Baja lento sin soltarte."], errores: ["Tirar del cuello.", "Subir con impulso."], alias: ["abdominales"] },
  { id: "elevacion-piernas", nombre: "Elevación de piernas", musculo: "Core", equipo: "Peso corporal", nivel: "Intermedio",
    pasos: ["Acostado, lumbar pegada al suelo.", "Sube las piernas juntas a 90°.", "Baja sin tocar el suelo."], errores: ["Arquear la zona lumbar."], alternativa: "Con rodillas flexionadas" },
  { id: "bird-dog", nombre: "Bird dog", musculo: "Core", equipo: "Peso corporal", nivel: "Principiante",
    pasos: ["A cuatro apoyos, espalda neutra.", "Extiende brazo y pierna contrarios.", "Vuelve y alterna."], errores: ["Rotar la cadera.", "Ir demasiado rápido."] },
  { id: "burpees", nombre: "Burpees", musculo: "Cardio", equipo: "Sin equipo", nivel: "Intermedio",
    pasos: ["De pie, baja a cuclillas y apoya las manos.", "Lleva los pies atrás en plancha y haz una flexión (opcional).", "Vuelve a cuclillas y salta arriba."], errores: ["Hundir la espalda en la plancha."], alternativa: "Sin salto ni flexión" },
  { id: "saltos-tijera", nombre: "Saltos de tijera", musculo: "Cardio", equipo: "Sin equipo", nivel: "Principiante",
    pasos: ["De pie, salta abriendo piernas y subiendo los brazos.", "Vuelve a la posición inicial.", "Mantén un ritmo constante."], errores: ["Caer con las piernas rígidas."], alias: ["jumping jacks"] },
  { id: "mountain-climbers", nombre: "Mountain climbers", musculo: "Cardio", equipo: "Sin equipo", nivel: "Intermedio",
    pasos: ["En posición de plancha alta.", "Lleva una rodilla al pecho y alterna rápido.", "Mantén la cadera baja."], errores: ["Subir la cadera.", "Perder el control del ritmo."], alias: ["escaladores"] },
  { id: "carrera", nombre: "Carrera suave", musculo: "Cardio", equipo: "Sin equipo", nivel: "Principiante",
    pasos: ["Calienta 5 minutos caminando.", "Corre a un ritmo en el que puedas hablar.", "Termina caminando y estirando."], errores: ["Salir demasiado rápido.", "Subir distancia muy rápido."], alias: ["running", "correr", "trote"] },
  { id: "remo-banda", nombre: "Remo con banda elástica", musculo: "Espalda", equipo: "Banda", nivel: "Principiante",
    pasos: ["Siéntate con las piernas estiradas y la banda en los pies.", "Tira de los extremos hacia el abdomen.", "Vuelve lento."], errores: ["Encorvar la espalda."] },
  { id: "press-pecho-banda", nombre: "Press de pecho con banda", musculo: "Pecho", equipo: "Banda", nivel: "Principiante",
    pasos: ["Banda por la espalda, manos a la altura del pecho.", "Empuja al frente estirando los brazos.", "Vuelve controlado."], errores: ["Dejar que la banda tire de golpe."] },
  { id: "sentadilla-bulgara", nombre: "Sentadilla búlgara", musculo: "Pierna", equipo: "Mancuernas", nivel: "Avanzado",
    pasos: ["Pie trasero apoyado en un banco.", "Baja con el torso erguido.", "Sube empujando con el pie delantero."], errores: ["Pie delantero demasiado cerca.", "Rodilla hacia dentro."] },
];

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Busca en la biblioteca el ejercicio que corresponde al nombre que aparece en una rutina. */
export function buscarEjercicio(nombre: string): Ejercicio | undefined {
  const n = sinTildes(nombre);
  if (!n) return undefined;
  return (
    EJERCICIOS.find((e) => sinTildes(e.nombre) === n) ??
    EJERCICIOS.find((e) => [e.nombre, ...(e.alias ?? [])].some((t) => { const x = sinTildes(t); return n.includes(x) || x.includes(n); }))
  );
}

export function filtrarEjercicios(texto: string, musculo: string) {
  const t = sinTildes(texto);
  return EJERCICIOS.filter(
    (e) =>
      (!musculo || e.musculo === musculo) &&
      (!t || [e.nombre, e.musculo, e.equipo, ...(e.alias ?? [])].some((x) => sinTildes(x).includes(t))),
  );
}

export const enlaceVideo = (nombre: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${nombre} técnica correcta`)}`;
