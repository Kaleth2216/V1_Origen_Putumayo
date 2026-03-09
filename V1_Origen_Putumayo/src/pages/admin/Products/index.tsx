/**
 * AdminProducts
 *
 * Panel de gestión CRUD de productos para administradores.
 *
 * Funcionalidades:
 * - Sidebar + tabla con búsqueda, filtro por categoría y paginación.
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

const PER_PAGE = 10;

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

    // Search / filter / pagination
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("Todas");
    const [page, setPage] = useState(1);

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

    /* ── Derive unique categories ── */
    const categories = ["Todas", ...new Set(products.map(p => p.category).filter(Boolean) as string[])];

    /* ── Filtered + paginated data ── */
    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (categoryFilter === "Todas" || p.category === categoryFilter)
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    /* ── Reset page on filter change ── */
    const handleSearch = (val: string) => { setSearch(val); setPage(1); };
    const handleCategoryFilter = (val: string) => { setCategoryFilter(val); setPage(1); };

    /* ── Open modal for creating ── */
    const handleOpenCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    /* ── Open modal for editing ── */
    const handleOpenEdit = (product: ProductRow) => {
        setEditingId(product.product_id);
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

    /* ── Thumb helper ── */
    const getThumb = (p: ProductRow) =>
        p.images && p.images.length > 0 ? p.images[0] : "/home/placeholder.png";

    /* ── Category badge color map (stable, derived from categories list) ── */
    const categoryColorMap: Record<string, number> = Object.fromEntries(
        categories.filter(c => c !== "Todas").map((cat, i) => [cat, i % 8])
    );

    /* ── Pagination helpers ── */
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    const startItem = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const endItem = Math.min(page * PER_PAGE, filtered.length);

    /* ─────────────────────────────────────────────
       RENDER
       ───────────────────────────────────────────── */
    return (
        <div className="ap-layout">
            {/* ── Sidebar ── */}
            <aside className="ap-sidebar">
                <div className="ap-sidebar__logo">
                    <div className="ap-sidebar__logo-icon">
                        <span className="material-symbols-outlined">eco</span>
                    </div>
                    <div className="ap-sidebar__logo-text">
                        <span className="ap-sidebar__logo-name">Origen Putumayo</span>
                        <span className="ap-sidebar__logo-sub">Admin Panel</span>
                    </div>
                </div>

                <nav className="ap-sidebar__nav">
                    <div className="ap-sidebar__section-label">Catálogo</div>
                    <button className="ap-sidebar__item active">
                        <span className="material-symbols-outlined">inventory_2</span>
                        Products
                        {!loading && (
                            <span className="ap-sidebar__badge">{products.length}</span>
                        )}
                    </button>
                </nav>
            </aside>

            {/* ── Main ── */}
            <main className="ap-main">
                {/* Header */}
                <header className="ap-header">
                    <div className="ap-header__titles">
                        <h1 className="ap-header__title">Products</h1>
                        <p className="ap-header__sub">
                            {loading ? "Cargando…" : `${filtered.length} de ${products.length} productos`}
                        </p>
                    </div>
                    <button className="ap-header__add-btn" onClick={handleOpenCreate}>
                        <span className="material-symbols-outlined">add_circle</span>
                        Add Product
                    </button>
                </header>

                {/* Content */}
                <div className="ap-content">
                    {/* Filters */}
                    <div className="ap-filters">
                        <div className="ap-search-wrap">
                            <span className="material-symbols-outlined">search</span>
                            <input
                                className="ap-search"
                                type="text"
                                placeholder="Search products…"
                                value={search}
                                onChange={e => handleSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="ap-filter-select"
                            value={categoryFilter}
                            onChange={e => handleCategoryFilter(e.target.value)}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Table */}
                    <div className="ap-table-wrap">
                        <table className="ap-table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Category</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr className="ap-table__status-row">
                                        <td colSpan={3}>Cargando productos…</td>
                                    </tr>
                                )}
                                {!loading && error && (
                                    <tr className="ap-table__status-row ap-table__status-row--error">
                                        <td colSpan={3}>⚠ {error}</td>
                                    </tr>
                                )}
                                {!loading && !error && filtered.length === 0 && (
                                    <tr className="ap-table__status-row">
                                        <td colSpan={3}>
                                            {search || categoryFilter !== "Todas"
                                                ? "No hay resultados para esta búsqueda."
                                                : "No hay productos aún. ¡Agrega el primero!"}
                                        </td>
                                    </tr>
                                )}
                                {paginated.map((p) => (
                                    <tr key={p.product_id}>
                                        <td>
                                            <div className="ap-product-cell">
                                                <img
                                                    className="ap-product-thumb"
                                                    src={getThumb(p)}
                                                    alt={p.name}
                                                />
                                                <span className="ap-product-name">{p.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {p.category ? (
                                                <span className={`ap-badge ap-badge--${categoryColorMap[p.category] ?? 0}`}>
                                                    {p.category}
                                                </span>
                                            ) : (
                                                <span style={{ color: "#9ca3af" }}>—</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="ap-actions">
                                                <button
                                                    className="ap-btn-icon ap-btn-icon--edit"
                                                    title="Editar"
                                                    onClick={() => handleOpenEdit(p)}
                                                >
                                                    <span className="material-symbols-outlined">edit</span>
                                                </button>
                                                <button
                                                    className="ap-btn-icon ap-btn-icon--delete"
                                                    title="Eliminar"
                                                    onClick={() => setDeleteTarget(p)}
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {!loading && !error && filtered.length > 0 && (
                            <div className="ap-pagination">
                                <span className="ap-pagination__info">
                                    Showing {startItem}–{endItem} of {filtered.length}
                                </span>
                                <div className="ap-pagination__controls">
                                    <button
                                        className="ap-page-btn"
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                        title="Anterior"
                                    >
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    {pageNumbers.map(n => (
                                        <button
                                            key={n}
                                            className={`ap-page-btn${page === n ? " ap-page-btn--active" : ""}`}
                                            onClick={() => setPage(n)}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                    <button
                                        className="ap-page-btn"
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                        title="Siguiente"
                                    >
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

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
        </div>
    );
};

export default AdminProducts;
