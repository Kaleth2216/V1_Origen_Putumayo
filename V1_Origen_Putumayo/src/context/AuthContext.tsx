import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const checkAdminStatus = async (userId: string) => {
        try {
            // El cliente de Supabase envía automáticamente el JWT del usuario,
            // lo que permite a RLS resolver auth.uid() correctamente.
            // Se usa Promise.race para evitar que una respuesta lenta bloquee
            // el estado loading indefinidamente.
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 5000)
            );

            const query = supabase
                .from('admin_users')
                .select('user_id')
                .eq('user_id', userId)
                .maybeSingle();

            const { data, error } = await Promise.race([query, timeout]);

            if (error) {
                console.error('Error verificando admin:', error.message);
                setIsAdmin(false);
                return;
            }

            setIsAdmin(!!data);
        } catch {
            setIsAdmin(false);
        }
    };

    useEffect(() => {
        // En Supabase v2, onAuthStateChange dispara INITIAL_SESSION al montar,
        // lo que elimina la necesidad de llamar getSession() por separado.
        // El try/finally garantiza que loading siempre pase a false.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await checkAdminStatus(session.user.id);
                } else {
                    setIsAdmin(false);
                }
            } finally {
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/admin`,
                }
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, isAdmin, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
