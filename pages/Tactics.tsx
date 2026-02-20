import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { TacticalLineupManager } from '../components/TacticalLineupManager';
import { Database } from '../types/supabase';
import { useAuth } from '../lib/AuthContext';
import { PullToRefresh } from '../components/PullToRefresh';

type Match = Database['public']['Tables']['matches']['Row'];

const Tactics: React.FC = () => {
    const { userRole } = useAuth();
    const [match, setMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(true);

    const isEditable = userRole === 'admin' || userRole === 'dt';

    const fetchMatch = async () => {
        // Get the next scheduled match
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .eq('status', 'scheduled')
            .order('match_date', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (data) {
            setMatch(data);
        } else {
            // Fallback: Try to get ANY match just to show the UI
            const { data: anyMatch } = await supabase
                .from('matches')
                .select('*')
                .order('match_date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (anyMatch) setMatch(anyMatch);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchMatch();
            setLoading(false);
        };
        init();
    }, []);

    if (loading) return <div className="p-10 text-center dark:text-white bg-background-light dark:bg-background-dark h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-bold uppercase tracking-widest text-xs opacity-50">Cargando Pizarra...</p>
    </div>;

    if (!match) return (
        <div className="p-10 text-center dark:text-white bg-background-light dark:bg-background-dark h-screen flex flex-col items-center justify-center gap-4">
            <h2 className="text-xl font-bold uppercase italic">No hay partidos</h2>
            <p className="text-sm opacity-60">Crea un partido en la sección de administración para usar la pizarra.</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-background-light dark:bg-background-dark overflow-hidden">
            <div className="px-6 py-3 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 shrink-0 z-20">
                <h1 className="text-xl font-bold dark:text-white flex items-center gap-2">
                    <span className="text-primary truncate">VS {match.opponent}</span>
                    <span className="text-[10px] font-black text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-2 py-1 rounded-lg ml-2 uppercase tracking-widest whitespace-nowrap">
                        {new Date(match.match_date).toLocaleDateString()}
                    </span>
                </h1>
            </div>
            <div className="flex-1 overflow-hidden relative">
                <PullToRefresh onRefresh={fetchMatch}>
                    <TacticalLineupManager matchId={match.id} isEditable={isEditable} />
                </PullToRefresh>
            </div>
        </div>
    );
};

export default Tactics;
