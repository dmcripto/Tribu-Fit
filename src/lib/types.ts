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

export type Alumno = {
  id: string;
  nombre: string;
  objetivo: string;
  /** Si el alumno permite al entrenador ver sus datos. */
  permiso: boolean;
  medidas: Medida[];
  entrenos: Entreno[];
  ejemplo?: boolean;
};
