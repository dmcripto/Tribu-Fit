"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Estado guardado en el navegador. `initial` debe ser una constante estable. */
export function useLocal<T>(key: string, initial: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const value = useMemo<T>(() => {
    if (raw === null) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  }, [raw, initial]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = read(key);
      const prev = current === null ? initial : (JSON.parse(current) as T);
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        /* almacenamiento bloqueado: se ignora */
      }
      listeners.forEach((l) => l());
    },
    [key, initial],
  );

  return [value, set] as const;
}

/** Fecha de hoy (AAAA-MM-DD). Cadena vacía en el servidor. */
export function useToday() {
  return useSyncExternalStore(
    () => () => {},
    () => new Date().toISOString().slice(0, 10),
    () => "",
  );
}

/**
 * Lee un dato que solo existe en el navegador (hora, hash de la dirección, permisos…) sin romper
 * la hidratación: en el servidor devuelve `servidor`. `leer` debe devolver un valor primitivo.
 */
export function useCliente<T extends string | number | boolean>(leer: () => T, servidor: T): T {
  return useSyncExternalStore(() => () => {}, leer, () => servidor);
}
