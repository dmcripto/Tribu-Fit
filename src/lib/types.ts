export type Rol = "atleta" | "entrenador";

export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  objetivo: string;
  nivel: string;
  rol: Rol;
  /** Código de invitación (solo entrenadores). */
  codigo?: string;
  entrenadorId?: string | null;
};

export type Medida = {
  fecha: string;
  peso_kg: number;
  grasa_pct?: number;
  cintura_cm?: number;
};

export type Entreno = {
  fecha: string;
  rutina: string;
  hechos: number;
  total: number;
};

export type Comida = {
  id: string;
  fecha: string;
  nombre: string;
  kcal: number;
  proteina: number;
  carbos: number;
  grasas: number;
};

/** Objetivo diario de nutrición (gramos de cada macro, vasos de agua). */
export type ObjetivoNutricion = {
  kcal: number;
  proteina: number;
  carbos: number;
  grasas: number;
  agua: number;
  notas: string;
};

export type Alumno = {
  id: string;
  nombre: string;
  objetivo: string;
  nivel?: string;
  /** Si el alumno permite al entrenador ver sus datos. */
  permiso: boolean;
  medidas: Medida[];
  entrenos: Entreno[];
  comidas: Comida[];
  ejemplo?: boolean;
};

export type Metodo = "tarjeta" | "qr" | "transferencia" | "efectivo" | "mercadopago";
export type EstadoPago = "pendiente" | "confirmado" | "rechazado";

/** Cobro que configura la entrenadora. `enlace` es la página segura del proveedor de pagos. */
export type PagoConfig = {
  moneda: string;
  precio: number;
  instrucciones: string;
  enlace: string;
  /** Imagen del código QR como data URL. */
  qr: string;
  /** Días de gracia tras el vencimiento antes de bloquear el premium. */
  gracia: number;
};

/** Excepción que fija la entrenadora para un alumno. */
export type PremiumModo = "bloqueado" | "cortesia";

export type Pago = {
  id: string;
  alumno_id: string;
  monto: number;
  moneda: string;
  metodo: Metodo;
  referencia: string;
  comprobante?: string;
  estado: EstadoPago;
  /** Fecha hasta la que cubre la cuota (solo pagos confirmados). */
  vence?: string;
  creado: string;
};

/* ---------- Perfil de entrenamiento y propuestas automáticas ---------- */

export type Sexo = "mujer" | "hombre" | "no_dice";
export type Lugar = "casa" | "gimnasio";

/** Datos que el alumno aporta para que el sistema pueda personalizar su plan. */
export type PerfilFitness = {
  edad: number | null;
  sexo: Sexo;
  altura_cm: number | null;
  dias_semana: number;
  lugar: Lugar;
  lesiones: string;
  restricciones: string;
};

export type ContenidoRutinas = {
  nombre: string;
  semanas: { semana: number; rutinas: { nombre: string; detalle: string; ejercicios: { nombre: string; series: string; carga: string }[] }[] }[];
};

type BasePropuesta = {
  id: string;
  alumno_id: string;
  /** Por qué el sistema propone esto. Solo lo ve la entrenadora. */
  razones: string[];
  /** Cosas que la entrenadora debe revisar con especial cuidado. */
  avisos: string[];
  estado: "pendiente" | "aprobada" | "rechazada";
  creado: string;
};

/** Borrador generado automáticamente. Lo ve y lo valida la entrenadora antes de llegar al alumno. */
export type Propuesta =
  | (BasePropuesta & { tipo: "rutinas"; contenido: ContenidoRutinas })
  | (BasePropuesta & { tipo: "nutricion"; contenido: ObjetivoNutricion });

/* ---------- Comunidad ---------- */

export type Mensaje = {
  id: string;
  alumno_id: string;
  entrenador_id: string;
  de_entrenador: boolean;
  texto: string;
  /** De qué rutina o ejercicio habla el mensaje (opcional). */
  contexto?: string;
  leido: boolean;
  creado: string;
};

export type AvisoTipo = "mensaje" | "plan" | "nutricion" | "pago" | "reto" | "otro";
export type Aviso = {
  id: string;
  tipo: AvisoTipo;
  titulo: string;
  texto: string;
  enlace?: string;
  leido: boolean;
  creado: string;
};

export type AnguloFoto = "frente" | "perfil" | "espalda" | "otra";
export type FotoProgreso = { id: string; fecha: string; nota: string; imagen: string; tipo: AnguloFoto };
export type Marca = { id: string; fecha: string; ejercicio: string; peso_kg: number; reps: number };

export type Reto = {
  id: string;
  titulo: string;
  descripcion: string;
  meta_entrenos: number;
  desde: string;
  hasta: string;
};

export type FilaRanking = { usuario_id: string; nombre: string; entrenos: number; es_yo: boolean };

export type CuentaBancaria = {
  id: string;
  banco: string;
  titular: string;
  cbu?: string;
  alias?: string;
  documento: string;
  nota: string;
};
