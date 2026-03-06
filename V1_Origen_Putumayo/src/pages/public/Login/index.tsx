/**
 * Login
 *
 * Página de autenticación exclusiva para administradores.
 * No está enlazada desde la navegación pública; solo se accede
 * al intentar entrar a /admin sin sesión activa.
 *
 * Flujo:
 * - Si ya hay sesión activa → redirige a /admin (admin) o / (no admin).
 * - Autenticación por email/contraseña o Google OAuth.
 * - Tras login exitoso → redirige a /admin (AdminRoute decide si tiene acceso).
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import '../../../styles/Login.css';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user, isAdmin, loading: authLoading, signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    // Si ya hay sesión activa, redirigir según rol
    useEffect(() => {
        if (authLoading) return;
        if (user) {
            navigate(isAdmin ? '/admin' : '/', { replace: true });
        }
    }, [user, isAdmin, authLoading, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;
            navigate('/admin', { replace: true });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch {
            setError('Error al iniciar con Google');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Acceso Admin</h1>
                <p className="login-subtitle">Inicia sesión para continuar</p>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Correo Electrónico</label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Contraseña</label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Cargando...' : 'INICIAR SESIÓN'}
                    </button>
                </form>

                <div className="login-divider">
                    <span>O continúa con</span>
                </div>

                <button onClick={handleGoogleLogin} className="google-btn" type="button">
                    <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google logo"
                        className="google-icon"
                    />
                    Google
                </button>
            </div>
        </div>
    );
};

export default Login;
