
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface AuthContextType {
    session: any;
    userRole: 'admin' | 'dt' | 'player' | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, userRole: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<any>(null);
    const [userRole, setUserRole] = useState<'admin' | 'dt' | 'player' | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRole = async (userId: string) => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();
            if (data) setUserRole(data.role as any);
        } catch (err) {
            console.error('Error fetching role:', err);
        }
    };

    useEffect(() => {
        let isMounted = true;
        let authSubscription: any = null;

        // Reduced timeout to 3 seconds (session check should be fast)
        const timeout = setTimeout(() => {
            if (isMounted && loading) {
                setLoading(false);
            }
        }, 3000);

        const initializeAuth = async () => {
            try {
                // Step 1: Get initial session
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Session retrieval error:', error);
                    if (isMounted) setLoading(false);
                    return;
                }

                // Step 2: Set session and fetch role
                if (isMounted) {
                    setSession(initialSession);
                    if (initialSession?.user) {
                        await fetchRole(initialSession.user.id);
                    }
                    setLoading(false);
                }

                // Step 3: ONLY NOW set up the listener (after initial state is set)
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
                    if (!isMounted) return;

                    setSession(newSession);
                    if (newSession?.user) {
                        await fetchRole(newSession.user.id);
                    } else {
                        setUserRole(null);
                    }
                });

                authSubscription = subscription;

            } catch (err) {
                console.error('Error in auth initialization:', err);
                if (isMounted) setLoading(false);
            }
        };

        initializeAuth();

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            if (authSubscription) {
                authSubscription.unsubscribe();
            }
        };
    }, []);

    return (
        <AuthContext.Provider value={{ session, userRole, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
