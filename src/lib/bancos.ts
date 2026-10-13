"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback } from "react";
import { useRemoto } from "./repo";
import { useLocal } from "./store";
import { modoDemo, supabase } from "./supabase";
import type { CuentaBancaria, Usuario } from "./types";

const db = () => supabase as SupabaseClient;
export const BANCOS_KEY = "tf_bancos";
const VACIO: CuentaBancaria[] = [];

export type NuevaCuenta = Omit<CuentaBancaria, "id">;

/** Bancos y billeteras habituales en Argentina, para sugerir al escribir. */
export const BANCOS_AR = [
  "Mercado Pago", "Banco Nación", "Banco Provincia", "Banco Ciudad", "Santander", "Galicia", "BBVA", "Macro", "Brubank",
  "Naranja X", "Ualá", "Personal Pay", "HSBC", "ICBC", "Credicoop", "Patagonia", "Supervielle", "Itaú", "Banco Hipotecario",
];

/** Dígito verificador del CBU (BCRA): ponderadores 7-1-3-9 en el bloque 1 y 3-9-7-1 en el bloque 2. */
export function cbuVerifica(cbu: string): boolean {
  if (!/^\d{22}$/.test(cbu)) return false;
  const dv = (digitos: string, pesos: number[]) => {
    const suma = digitos.split("").reduce((s, d, i) => s + Number(d) * pesos[i % pesos.length], 0);
    return (10 - (suma % 10)) % 10;
  };
  return dv(cbu.slice(0, 7), [7, 1, 3, 9, 7, 1, 3]) === Number(cbu[7])
    && dv(cbu.slice(8, 21), [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]) === Number(cbu[21]);
}

export const aliasValido = (a: string) => /^[A-Za-z0-9.-]{6,20}$/.test(a);

/** Valida lo que escribe la entrenadora. Devuelve un error, o null si está bien. `aviso` no impide guardar. */
export function validarCuenta(c: { banco: string; titular: string; cbu: string; alias: string }): { error?: string; aviso?: string } {
  if (!c.banco.trim()) return { error: "Escribe el banco o la billetera." };
  if (!c.titular.trim()) return { error: "Escribe el nombre del titular." };
  const cbu = c.cbu.replace(/\s/g, "");
  const alias = c.alias.trim();
  if (!cbu && !alias) return { error: "Pon al menos el CBU/CVU o el alias." };
  if (cbu && !/^\d{22}$/.test(cbu)) return { error: "El CBU o CVU tiene 22 números, sin espacios ni guiones." };
  if (alias && !aliasValido(alias)) return { error: "El alias tiene de 6 a 20 caracteres: letras, números, punto o guion (sin espacios)." };
  if (cbu && !cbuVerifica(cbu)) return { aviso: "Ese CBU/CVU no pasa la verificación. Revísalo; si estás segura de que es correcto, guarda de nuevo." };
  return {};
}

type Api = {
  cuentas: CuentaBancaria[];
  anadir: (c: NuevaCuenta) => Promise<string | null>;
  borrar: (id: string) => Promise<string | null>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useCuentasLocal(_yo: Usuario | null): Api {
  const [cuentas, set] = useLocal(BANCOS_KEY, VACIO);
  const anadir = useCallback(async (c: NuevaCuenta) => {
    set((p) => [...p, { id: crypto.randomUUID(), ...c }]);
    return null as string | null;
  }, [set]);
  const borrar = useCallback(async (id: string) => { set((p) => p.filter((x) => x.id !== id)); return null as string | null; }, [set]);
  return { cuentas, anadir, borrar };
}

type Fila = { id: number; banco: string; titular: string; cbu: string | null; alias: string | null; documento: string; nota: string };

function useCuentasRemoto(yo: Usuario | null): Api {
  const uid = yo?.id ?? "";
  const cargar = useCallback(async (): Promise<CuentaBancaria[]> => {
    if (!uid) return [];
    const { data } = await db().from("cuentas_bancarias").select("id,banco,titular,cbu,alias,documento,nota").order("id");
    return ((data ?? []) as Fila[]).map((f) => ({
      id: String(f.id), banco: f.banco, titular: f.titular, cbu: f.cbu ?? undefined, alias: f.alias ?? undefined, documento: f.documento, nota: f.nota,
    }));
  }, [uid]);
  const [cuentas, recargar] = useRemoto(cargar, VACIO);
  const anadir = useCallback(async (c: NuevaCuenta) => {
    const { error } = await db().from("cuentas_bancarias").insert({
      entrenador_id: uid, banco: c.banco, titular: c.titular, cbu: c.cbu ?? null, alias: c.alias ?? null, documento: c.documento, nota: c.nota,
    });
    if (!error) recargar();
    return error ? (/cuentas_bancarias/i.test(error.message) && /exist|find/i.test(error.message) ? "Falta activar las cuentas bancarias en la base de datos (migración 008)." : error.message) : null;
  }, [uid, recargar]);
  const borrar = useCallback(async (id: string) => {
    const { error } = await db().from("cuentas_bancarias").delete().eq("id", Number(id)).eq("entrenador_id", uid);
    if (!error) recargar();
    return error ? error.message : null;
  }, [uid, recargar]);
  return { cuentas, anadir, borrar };
}

export const useCuentasBancarias: (yo: Usuario | null) => Api = modoDemo ? useCuentasLocal : useCuentasRemoto;
