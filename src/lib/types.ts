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
