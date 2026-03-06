/**
 * AdminDashboard
 *
 * Página raíz del panel de administración.
 * Actúa como contenedor principal que agrupa las secciones
 * del panel (actualmente: gestión de productos).
 *
 * Solo es accesible a través de AdminRoute, que garantiza
 * que el usuario esté autenticado y tenga rol de admin.
 */

import React from "react";
import AdminProducts from "./Products";

const AdminDashboard: React.FC = () => {
    return (
        <div>
            <AdminProducts />
        </div>
    );
};

export default AdminDashboard;
