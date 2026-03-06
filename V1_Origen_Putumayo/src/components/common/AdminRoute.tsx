/**
 * AdminRoute
 *
 * Guard de rutas para el panel de administración.
 * - Si el usuario no está autenticado → redirige a /login.
 * - Si está autenticado pero NO es admin → redirige a / (home).
 * - Si está autenticado y ES admin → renderiza la ruta solicitada.
 *
 * Uso: envolver cualquier <Route> del panel admin con este componente.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { user, loading, isAdmin } = useAuth();

    if (loading) {
        return <div>Cargando...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};

export default AdminRoute;
