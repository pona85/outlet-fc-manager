
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
    // Ref to avoid re-fetching role if we already have it (prevents flicker on token refresh)
    const roleCache = useRef<Record<string, 'admin' | 'dt' | 'player'>>({});

    const fetchRole = async (userId: string): Promise<void> => {
        // If we already have this user's role cached, use it immediately
        if (roleCache.current[userId]) {
            setUserRole(roleCache.current[userId]);
            return;
        }
        try {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single() as { data: { role: string } | null, error: any };
            if (data) {
                const role = data.role as 'admin' | 'dt' | 'player';
                roleCache.current[userId] = role;
                setUserRole(role);
            }
        } catch (err) {
            console.error('Error fetching role:', err);
        }
    };

    useEffect(() => {
        let isMounted = true;
        let authSubscription: any = null;

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

                // Step 3: Set up the listener AFTER initial state is resolved
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
                    if (!isMounted) return;

                    // TOKEN_REFRESHED: session is silently updated — don't touch userRole
                    // This prevents "flicker" where route guards momentarily see null role
                    if (event === 'TOKEN_REFRESHED') {
                        setSession(newSession);
                        return;
                    }

                    // SIGNED_IN: update session and role (uses cache if available — no network call needed)
                    if (event === 'SIGNED_IN' && newSession?.user) {
                        setSession(newSession);
                        await fetchRole(newSession.user.id);
                        return;
                    }

                    // SIGNED_OUT: clear everything including cache
                    if (event === 'SIGNED_OUT') {
                        roleCache.current = {};
                        setSession(null);
                        setUserRole(null);
                        return;
                    }

                    // For any other event, update session and fetch role if needed
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
