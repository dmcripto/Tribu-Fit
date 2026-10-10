export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  objetivo: string;
  nivel: string;
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
