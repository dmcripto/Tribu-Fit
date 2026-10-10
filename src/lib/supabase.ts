import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Cliente de Supabase, o null si no hay claves (modo demo). */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export const modoDemo = supabase === null;
