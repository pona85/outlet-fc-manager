import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Users, UserX, HelpCircle } from 'lucide-react';

type RosterPlayer = {
    id: string;
    full_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
    jersey_number: number | null;
    confirmation_status: string | null;
    stays_for_social: boolean | null;
};

interface MatchRosterProps {
    matchId: string;
}

export const MatchRoster: React.FC<MatchRosterProps> = ({ matchId }) => {
    const [players, setPlayers] = useState<RosterPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!matchId) return;
        fetchRoster();

        // Real-time subscription for live updates
        const channel = supabase
            .channel(`roster-${matchId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'attendance', filter: `match_id=eq.${matchId}` },
                () => fetchRoster()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId]);

    const fetchRoster = async () => {
        setLoading(true);

        // 1. Get all profiles
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, nickname, avatar_url, jersey_number')
            .order('full_name');

        // 2. Get attendance for this match (use select('*') for resilience)
        const { data: attendanceData } = await supabase
            .from('attendance')
            .select('*')
            .eq('match_id', matchId);

        if (profiles) {
            const attList = (attendanceData || []) as any[];
            const merged: RosterPlayer[] = (profiles as any[]).map((p: any) => {
                const att = attList.find((a: any) => a.player_id === p.id);
                return {
                    ...p,
                    confirmation_status: att?.confirmation_status || null,
                    stays_for_social: att?.stays_for_social || null,
                };
            });
            setPlayers(merged);
        }

        setLoading(false);
    };

    const confirmed = players.filter(p => p.confirmation_status === 'confirmed');
    const declined = players.filter(p => p.confirmation_status === 'declined');
    const pending = players.filter(p => !p.confirmation_status || p.confirmation_status === 'pending');
    const socialCount = confirmed.filter(p => p.stays_for_social).length;

    if (loading) {
        return (
            <div className="bg-white dark:bg-card-dark rounded-[3rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-xl w-48 mb-6"></div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-14"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-card-dark rounded-[3rem] p-8 md:p-10 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute -right-6 -top-6 opacity-[0.03] pointer-events-none">
                <Users size={160} />
            </div>

            {/* Header */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-secondary rounded-2xl text-primary">
                        <Users size={22} />
                    </div>
                    <div>
                        <h3 className="text-xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight">
                            Lista del Plantel
                        </h3>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-0.5">
                            {confirmed.length} confirmados • {pending.length} sin confirmar
                        </p>
                    </div>
                </div>

                {/* Tercer Tiempo Badge */}
                {socialCount > 0 && (
                    <div className="flex items-center gap-2 bg-[#3DFFA2]/10 text-[#3DFFA2] px-4 py-2.5 rounded-2xl border border-[#3DFFA2]/20 animate-fade-in shrink-0">
                        <span className="text-lg">🍻</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {socialCount} se {socialCount === 1 ? 'queda' : 'quedan'} al 3er tiempo
                        </span>
                    </div>
                )}
            </div>

            {/* Empty State */}
            {confirmed.length === 0 && declined.length === 0 && pending.length === 0 && (
                <div className="text-center py-12">
                    <Users className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
                    <p className="text-gray-400 dark:text-gray-500 font-bold text-sm uppercase tracking-widest">
                        Aún no hay confirmados. ¡Sé el primero!
                    </p>
                </div>
            )}

            {/* === Group 1: Confirmados === */}
            {confirmed.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.25em]">
                            Confirmados ({confirmed.length})
                        </h4>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                        {confirmed.map(player => (
                            <div
                                key={player.id}
                                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 hover:border-primary/30 transition-all group"
                            >
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-green-500/30 group-hover:border-green-500/60 transition-all shadow-sm">
                                        {player.avatar_url ? (
                                            <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={20} className="text-gray-400" />
                                        )}
                                    </div>
                                    {/* Beer icon for 3er tiempo */}
                                    {player.stays_for_social && (
                                        <span className="absolute -bottom-1 -right-1 text-sm bg-white dark:bg-card-dark rounded-full w-5 h-5 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm" title="Se queda al 3er Tiempo">
                                            🍺
                                        </span>
                                    )}
                                </div>
                                <div className="text-center min-w-0 w-full">
                                    <p className="text-[11px] font-bold text-gray-800 dark:text-white truncate leading-tight">
                                        {player.nickname || player.full_name?.split(' ')[0] || 'Jugador'}
                                    </p>
                                    {player.jersey_number && (
                                        <p className="text-[9px] font-black text-primary/60 mt-0.5">#{player.jersey_number}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === Group 2: Se prenden al 3er Tiempo === */}
            {socialCount > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm">🍺</span>
                        <h4 className="text-[10px] font-black text-[#3DFFA2] uppercase tracking-[0.25em]">
                            Se prenden al 3er Tiempo ({socialCount})
                        </h4>
                    </div>
                    <div className="bg-[#3DFFA2]/5 border border-[#3DFFA2]/15 rounded-2xl p-4">
                        <div className="flex flex-wrap gap-2">
                            {confirmed.filter(p => p.stays_for_social).map(player => (
                                <div
                                    key={player.id}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#3DFFA2]/10 border border-[#3DFFA2]/20"
                                >
                                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-[#3DFFA2]/30">
                                        {player.avatar_url ? (
                                            <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={14} className="text-gray-400" />
                                        )}
                                    </div>
                                    <span className="text-[11px] font-bold text-[#3DFFA2]">
                                        {player.nickname || player.full_name?.split(' ')[0] || 'Jugador'}
                                    </span>
                                    <span className="text-xs">🍻</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* === Group 3: Bajas (No asisten) === */}
            {declined.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.25em]">
                            No asisten ({declined.length})
                        </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {declined.map(player => (
                            <div
                                key={player.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20"
                            >
                                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden opacity-60">
                                    {player.avatar_url ? (
                                        <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={14} className="text-gray-400" />
                                    )}
                                </div>
                                <span className="text-[11px] font-bold text-red-400/80 dark:text-red-400/60">
                                    {player.nickname || player.full_name?.split(' ')[0] || 'Jugador'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === Group 3: Sin Confirmar === */}
            {pending.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.25em]">
                            Sin confirmar ({pending.length})
                        </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {pending.map(player => (
                            <div
                                key={player.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20"
                            >
                                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden opacity-40">
                                    {player.avatar_url ? (
                                        <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <HelpCircle size={14} className="text-gray-400" />
                                    )}
                                </div>
                                <span className="text-[11px] font-bold text-yellow-500/60 dark:text-yellow-400/50">
                                    {player.nickname || player.full_name?.split(' ')[0] || 'Jugador'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
