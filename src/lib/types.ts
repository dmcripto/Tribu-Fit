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
  /** Si el alumno permite al entrenador ver sus datos. */
  permiso: boolean;
  medidas: Medida[];
  entrenos: Entreno[];
  comidas: Comida[];
  ejemplo?: boolean;
};

export type Metodo = "tarjeta" | "qr" | "transferencia" | "efectivo";
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
