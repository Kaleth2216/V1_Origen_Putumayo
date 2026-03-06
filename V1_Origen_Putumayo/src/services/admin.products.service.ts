/**
 * admin.products.service
 *
 * Capa de acceso a datos para la gestión de productos desde el panel admin.
 *
 * Lectura : vista `products_public` (agrega imágenes y datos de empresa).
 * Escritura: tablas base `product` y `product_image`.
 *
 * Funciones expuestas:
 * - getAdminProducts()  → lista todos los productos ordenados por nombre.
 * - getCompanies()      → lista las empresas activas para el selector.
 * - createProduct()     → inserta producto + imágenes en dos pasos.
 * - updateProduct()     → actualiza campos del producto y reemplaza imágenes.
 * - deleteProduct()     → elimina imágenes asociadas y luego el producto.
 */

import { supabase } from "../lib/supabaseClient";

/* ─────────────────────────────────────────────
   TIPOS
   ───────────────────────────────────────────── */

/** Fila tal como la devuelve la vista products_public */
export interface ProductRow {
    product_id: string;
    name: string;
    description: string | null;
    price: number;
    company_name: string | null;
    company_id: string | null;
    images: string[];
    availability: string | null;
    category: string | null;
    currency: string | null;
    is_top: boolean | null;
    location: string | null;
    variant_group: string | null;
    weight_value: number | null;
    weight_unit: string | null;
}

export interface CompanyRow {
    company_id: string;
    name: string;
}

/* ─────────────────────────────────────────────
   READ
   ───────────────────────────────────────────── */

export const getAdminProducts = async (): Promise<ProductRow[]> => {
    const { data, error } = await supabase
        .from("products_public")
        .select("*")
        .order("name", { ascending: true });

    if (error) throw error;
    return (data as ProductRow[]) ?? [];
};

export const getCompanies = async (): Promise<CompanyRow[]> => {
    const { data, error } = await supabase
        .from("company")
        .select("company_id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

    if (error) throw error;
    return (data as CompanyRow[]) ?? [];
};

/* ─────────────────────────────────────────────
   CREATE
   ───────────────────────────────────────────── */

export const createProduct = async (fields: {
    name: string;
    description: string | null;
    price: number;
    company_id: string | null;
    category: string | null;
    location: string | null;
    image_urls: string[];
}): Promise<void> => {
    // 1. Insertar en la tabla product
    const { data, error } = await supabase
        .from("product")
        .insert({
            name: fields.name,
            description: fields.description,
            price: fields.price,
            company_id: fields.company_id,
            category: fields.category,
            location: fields.location,
            availability: "available",
            is_top: false,
            is_active: true,
        })
        .select("product_id")
        .single();

    if (error) throw error;

    // 2. Insertar imágenes en product_image
    if (data?.product_id && fields.image_urls.length > 0) {
        const imageRows = fields.image_urls
            .filter((url) => url.trim())
            .map((url, index) => ({
                product_id: data.product_id,
                url: url.trim(),
                order_index: index,
            }));

        if (imageRows.length > 0) {
            const { error: imgErr } = await supabase
                .from("product_image")
                .insert(imageRows);
            if (imgErr) console.error("Error guardando imágenes:", imgErr);
        }
    }
};

/* ─────────────────────────────────────────────
   UPDATE
   ───────────────────────────────────────────── */

interface UpdateProductPayload {
    name: string;
    description: string | null;
    price: number;
    company_id?: string;
}

export const updateProduct = async (
    productId: string,
    fields: {
        name: string;
        description: string | null;
        price: number;
        company_id: string | null;
        image_urls: string[];
    }
): Promise<void> => {
    // 1. Actualizar la tabla product
    const updatePayload: UpdateProductPayload = {
        name: fields.name,
        description: fields.description,
        price: fields.price,
    };
    if (fields.company_id) {
        updatePayload.company_id = fields.company_id;
    }

    const { error } = await supabase
        .from("product")
        .update(updatePayload)
        .eq("product_id", productId);

    if (error) throw error;

    // 2. Actualizar imágenes: borrar existentes y re-insertar todas
    const validUrls = fields.image_urls.filter((url) => url.trim());
    if (validUrls.length > 0) {
        await supabase
            .from("product_image")
            .delete()
            .eq("product_id", productId);

        const imageRows = validUrls.map((url, index) => ({
            product_id: productId,
            url: url.trim(),
            order_index: index,
        }));

        const { error: imgErr } = await supabase
            .from("product_image")
            .insert(imageRows);
        if (imgErr) console.error("Error actualizando imágenes:", imgErr);
    }
};

/* ─────────────────────────────────────────────
   DELETE
   ───────────────────────────────────────────── */

export const deleteProduct = async (productId: string): Promise<void> => {
    // 1. Borrar imágenes asociadas primero (integridad referencial)
    await supabase
        .from("product_image")
        .delete()
        .eq("product_id", productId);

    // 2. Borrar el producto
    const { error } = await supabase
        .from("product")
        .delete()
        .eq("product_id", productId);

    if (error) throw error;
};
