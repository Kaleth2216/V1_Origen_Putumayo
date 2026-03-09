/**
 * Servicios públicos de productos.
 * Autor: Kaleth
 */

import { supabaseAnon } from "../lib/supabaseClient";

export const getPublicProducts = async () => {
  const { data, error } = await supabaseAnon
    .from("products_public")
    .select("*");

  if (error) throw error;
  return data ?? [];
};
