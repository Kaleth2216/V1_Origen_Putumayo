/**
 * AdminProducts
 *
 * Panel de gestión CRUD de productos para administradores.
 *
 * Funcionalidades:
 * - Tabla con listado de todos los productos (imagen, nombre, precio, productor).
 * - Modal para crear un nuevo producto (nombre, descripción, precio, productor,
 *   categoría, ubicación, hasta 2 imágenes con previsualización).
 * - Modal para editar un producto existente.
 * - Diálogo de confirmación antes de eliminar un producto.
 *
 * Fuente de datos: admin.products.service (Supabase).
 */

import React, { useEffect, useState, useCallback } from "react";
import {
    getAdminProducts,
    getCompanies,
    createProduct,
    updateProduct,
    deleteProduct,
} from "../../../services/admin.products.service";
import type {
    ProductRow,
    CompanyRow,
} from "../../../services/admin.products.service";
import "./styles.css";

/* ─────────────────────────────────────────────
   FORM STATE
   ───────────────────────────────────────────── */
interface FormData {
    name: string;
    description: string;
    price: string;
    company_id: string;
    category: string;
    location: string;
    image_url1: string;
    image_url2: string;
}

const emptyForm: FormData = {
    name: "",
    description: "",
    price: "",
    company_id: "",
    category: "",
    location: "",
    image_url1: "",
    image_url2: "",
};

/* ─────────────────────────────────────────────
   COMPONENT
   ───────────────────────────────────────────── */
const AdminProducts: React.FC = () => {
    const [products, setProducts] = useState<ProductRow[]>([]);
    const [companies, setCompanies] = useState<CompanyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>(emptyForm);
    const [saving, setSaving] = useState(false);

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);

    /* ── Fetch products + companies ── */
    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const [prods, comps] = await Promise.all([
                getAdminProducts(),
                getCompanies(),
            ]);
            setProducts(prods);
            setCompanies(comps);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Error cargando datos";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* ── Open modal for creating ── */
    const handleOpenCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    /* ── Open modal for editing ── */
    const handleOpenEdit = (product: ProductRow) => {
        setEditingId(product.product_id);
        // Buscar company_id por nombre (la vista solo devuelve company_name)
        const matchedCompany = companies.find(
            (c) => c.name === product.company_name
        );
        setForm({
            name: product.name ?? "",
            description: product.description ?? "",
            price: product.price != null ? String(product.price) : "",
            company_id: product.company_id ?? matchedCompany?.company_id ?? "",
            category: product.category ?? "",
            location: product.location ?? "",
            image_url1: product.images && product.images.length > 0 ? product.images[0] : "",
            image_url2: product.images && product.images.length > 1 ? product.images[1] : "",
        });
        setModalOpen(true);
    };

    /* ── Close modal ── */
    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setForm(emptyForm);
    };

    /* ── Handle input change ── */
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    /* ── Save (create or update) ── */
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        setSaving(true);
        try {
            const priceNum = parseFloat(form.price) || 0;
            const imageUrls = [form.image_url1.trim(), form.image_url2.trim()].filter(Boolean);
            const companyId = form.company_id || null;

            if (editingId) {
                await updateProduct(editingId, {
                    name: form.name.trim(),
                    description: form.description.trim() || null,
                    price: priceNum,
                    company_id: companyId,
                    image_urls: imageUrls,
                });
            } else {
                await createProduct({
                    name: form.name.trim(),
                    description: form.description.trim() || "",
                    price: priceNum,
                    company_id: companyId,
                    category: form.category.trim() || "General",
                    location: form.location.trim() || "Putumayo",
                    image_urls: imageUrls,
                });
            }

            handleCloseModal();
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Error desconocido";
            alert("Error guardando producto: " + message);
        } finally {
            setSaving(false);
        }
    };

    /* ── Delete ── */
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteProduct(deleteTarget.product_id);
            setDeleteTarget(null);
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Error desconocido";
            alert("Error eliminando producto: " + message);
        }
    };

    /* ── Format price ── */
    const fmtPrice = (price: number) =>
        new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        }).format(price);

    /* ── Thumb helper ── */
    const getThumb = (p: ProductRow) =>
        p.images && p.images.length > 0 ? p.images[0] : "/home/placeholder.png";

    /* ─────────────────────────────────────────────
       RENDER
       ───────────────────────────────────────────── */
    return (
        <section className="admin-products">
            {/* Header */}
            <div className="admin-products__header">
                <h1 className="admin-products__title">
                    Gestión de Productos
                    {!loading && (
                        <span className="admin-products__count">
                            ({products.length})
                        </span>
                    )}
                </h1>
                <button className="admin-products__add-btn" onClick={handleOpenCreate}>
                    + Agregar Producto
                </button>
            </div>

            {/* States */}
            {loading && (
                <p className="admin-products__loading">Cargando productos…</p>
            )}
            {error && <p className="admin-products__error">⚠ {error}</p>}
            {!loading && !error && products.length === 0 && (
                <p className="admin-products__empty">
                    No hay productos aún. ¡Agrega el primero!
                </p>
            )}

            {/* Table */}
            {!loading && products.length > 0 && (
                <div className="admin-products__table-wrap">
                    <table className="admin-products__table">
                        <thead>
                            <tr>
                                <th>Imagen</th>
                                <th>Nombre</th>
                                <th>Precio</th>
                                <th>Productor</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p) => (
                                <tr key={p.product_id}>
                                    <td>
                                        <img
                                            className="admin-products__thumb"
                                            src={getThumb(p)}
                                            alt={p.name}
                                        />
                                    </td>
                                    <td className="admin-products__name">{p.name}</td>
                                    <td>{fmtPrice(p.price)}</td>
                                    <td>{p.company_name || "—"}</td>
                                    <td>
                                        <div className="admin-products__actions">
                                            <button
                                                className="admin-products__edit-btn"
                                                onClick={() => handleOpenEdit(p)}
                                            >
                                                ✎ Editar
                                            </button>
                                            <button
                                                className="admin-products__delete-btn"
                                                onClick={() => setDeleteTarget(p)}
                                            >
                                                ✕ Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Create / Edit Modal ── */}
            {modalOpen && (
                <div className="admin-modal__overlay" onClick={handleCloseModal}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal__header">
                            <h2 className="admin-modal__title">
                                {editingId ? "Editar Producto" : "Nuevo Producto"}
                            </h2>
                            <button
                                className="admin-modal__close"
                                onClick={handleCloseModal}
                            >
                                ✕
                            </button>
                        </div>

                        <form className="admin-modal__form" onSubmit={handleSave}>
                            <div className="admin-modal__field">
                                <label className="admin-modal__label">Nombre *</label>
                                <input
                                    className="admin-modal__input"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Ej: Café Orgánico 250g"
                                    required
                                />
                            </div>

                            <div className="admin-modal__field">
                                <label className="admin-modal__label">Descripción</label>
                                <textarea
                                    className="admin-modal__textarea"
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    placeholder="Descripción del producto…"
                                />
                            </div>

                            <div className="admin-modal__field">
                                <label className="admin-modal__label">Precio (COP)</label>
                                <input
                                    className="admin-modal__input"
                                    name="price"
                                    type="number"
                                    min="0"
                                    value={form.price}
                                    onChange={handleChange}
                                    placeholder="Ej: 25000"
                                />
                            </div>

                            <div className="admin-modal__field">
                                <label className="admin-modal__label">Productor</label>
                                <select
                                    className="admin-modal__input"
                                    name="company_id"
                                    value={form.company_id}
                                    onChange={handleChange}
                                >
                                    <option value="">— Sin productor —</option>
                                    {companies.map((c) => (
                                        <option key={c.company_id} value={c.company_id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="admin-modal__field">
                                <label className="admin-modal__label">Categoría</label>
                                <input
                                    className="admin-modal__input"
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                    placeholder="Ej: Café, Chocolate, Artesanía…"
                                />
                            </div>

                            <div className="admin-modal__field">
                                <label className="admin-modal__label">Ubicación</label>
                                <input
                                    className="admin-modal__input"
                                    name="location"
                                    value={form.location}
                                    onChange={handleChange}
                                    placeholder="Ej: Mocoa, Putumayo"
                                />
                            </div>

                            <div className="admin-modal__field">
                                <label className="admin-modal__label">URL de imagen 1 *</label>
                                <input
                                    className="admin-modal__input"
                                    name="image_url1"
                                    value={form.image_url1}
                                    onChange={handleChange}
                                    placeholder="https://…"
                                    required
                                />
                                {form.image_url1.trim() && (
                                    <img
                                        className="admin-modal__img-preview"
                                        src={form.image_url1}
                                        alt="Vista previa 1"
                                        onError={(e) =>
                                            ((e.target as HTMLImageElement).style.display = "none")
                                        }
                                    />
                                )}
                            </div>

                            <div className="admin-modal__field">
                                <label className="admin-modal__label">URL de imagen 2 *</label>
                                <input
                                    className="admin-modal__input"
                                    name="image_url2"
                                    value={form.image_url2}
                                    onChange={handleChange}
                                    placeholder="https://…"
                                    required
                                />
                                {form.image_url2.trim() && (
                                    <img
                                        className="admin-modal__img-preview"
                                        src={form.image_url2}
                                        alt="Vista previa 2"
                                        onError={(e) =>
                                            ((e.target as HTMLImageElement).style.display = "none")
                                        }
                                    />
                                )}
                            </div>

                            <div className="admin-modal__actions">
                                <button
                                    type="button"
                                    className="admin-modal__cancel-btn"
                                    onClick={handleCloseModal}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="admin-modal__save-btn"
                                    disabled={saving || !form.name.trim()}
                                >
                                    {saving
                                        ? "Guardando…"
                                        : editingId
                                            ? "Guardar Cambios"
                                            : "Crear Producto"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete confirm ── */}
            {deleteTarget && (
                <div className="admin-confirm__overlay">
                    <div className="admin-confirm">
                        <p>
                            ¿Eliminar <strong>{deleteTarget.name}</strong>? Esta acción no se
                            puede deshacer.
                        </p>
                        <div className="admin-confirm__actions">
                            <button
                                className="admin-confirm__cancel"
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="admin-confirm__delete"
                                onClick={handleConfirmDelete}
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default AdminProducts;
