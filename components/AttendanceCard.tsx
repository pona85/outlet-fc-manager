import React, { useState, useEffect } from 'react';
import { Shield, Clock, MapPin, Calendar, Check, X, Beer } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { useAuth } from '../lib/AuthContext';

type Match = Database['public']['Tables']['matches']['Row'];

export const AttendanceCard = () => {
    const { session } = useAuth();
    const [match, setMatch] = useState<Match | null>(null);
    const [status, setStatus] = useState<'pending' | 'confirmed' | 'declined'>('pending');
    const [staysForSocial, setStaysForSocial] = useState(false);
    const [loading, setLoading] = useState(true);
    const [playerCount, setPlayerCount] = useState(0);

    const currentUserId = session?.user?.id;

    useEffect(() => {
        fetchNextMatch();
    }, [currentUserId]);

    const fetchNextMatch = async () => {
        setLoading(true);

        // 1. Get next scheduled match
        const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .select('*')
            .eq('status', 'scheduled')
            .order('match_date', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (matchError) console.error('Error fetching match:', matchError);

        if (matchData) {
            setMatch(matchData);

            if (currentUserId) {
                // 3. Check my attendance status
                const { data: attendance } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('match_id', matchData.id)
                    .eq('player_id', currentUserId)
                    .maybeSingle();

                if (attendance) {
                    setStatus((attendance as any).confirmation_status as any);
                    setStaysForSocial((attendance as any).stays_for_social || false);
                }
            }

            // 4. Get total confirmed count
            const { count } = await supabase
                .from('attendance')
                .select('*', { count: 'exact', head: true })
                .eq('match_id', matchData.id)
                .eq('confirmation_status', 'confirmed');

            setPlayerCount(count || 0);
        }
        setLoading(false);
    };

    const handleAttendance = async (newStatus: 'confirmed' | 'declined') => {
        if (!match || !currentUserId) return;

        // Optimistic update
        setStatus(newStatus);
        if (newStatus === 'confirmed') setPlayerCount(prev => prev + 1);
        else if (status === 'confirmed') setPlayerCount(prev => prev - 1);

        // If declining, reset social
        if (newStatus === 'declined') setStaysForSocial(false);

        const { error } = await supabase
            .from('attendance')
            .upsert({
                match_id: match.id,
                player_id: currentUserId,
                confirmation_status: newStatus,
                stays_for_social: newStatus === 'declined' ? false : staysForSocial,
            }, { onConflict: 'match_id, player_id' });

        if (error) {
            console.error('Error updating attendance:', error);
        } else {
            fetchNextMatch(); // Refresh to be sure
        }
    };

    const handleToggleSocial = async () => {
        if (!match || !currentUserId || status !== 'confirmed') return;

        const newVal = !staysForSocial;
        setStaysForSocial(newVal);

        const { error } = await supabase
            .from('attendance')
            .upsert({
                match_id: match.id,
                player_id: currentUserId,
                confirmation_status: 'confirmed',
                stays_for_social: newVal,
            }, { onConflict: 'match_id, player_id' });

        if (error) {
            console.error('Error updating stays_for_social:', error);
            setStaysForSocial(!newVal); // revert
        }
    };

    if (loading) return <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl"></div>;
    if (!match) return null;

    const matchDate = new Date(match.match_date);

    return (
        <div className="relative bg-card-light dark:bg-card-dark rounded-[2rem] shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-primary opacity-5 dark:opacity-5 blur-xl group-hover:opacity-10 transition-opacity duration-500"></div>
            <div className="absolute inset-0 stripe-pattern opacity-30 pointer-events-none"></div>

            <div className="relative z-10 p-8 flex flex-col h-full">

                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-md">
                        Próximo Partido
                    </span>
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm font-medium">
                        <MapPin size={16} className="mr-1" />
                        {match.location || 'Cancha a confirmar'}
                    </div>
                </div>

                {/* Match Info */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 justify-center flex-1">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xl border-4 border-gray-100 dark:border-gray-800 shadow-lg mx-auto mb-2">
                            OFC
                        </div>
                        <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white">Outlet FC</h3>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="text-2xl font-display font-black text-primary mb-1">VS</div>
                        <div className="text-sm font-bold text-gray-800 dark:text-white uppercase">
                            {matchDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' })}
                        </div>
                        <div className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                            {matchDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 flex items-center justify-center font-bold text-xl border-4 border-gray-100 dark:border-gray-800 shadow-lg mx-auto mb-2 uppercase">
                            {match.opponent.substring(0, 2)}
                        </div>
                        <h3 className="font-display font-bold text-lg text-gray-500 dark:text-gray-400">{match.opponent}</h3>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

                        {/* Attendance Counter */}
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {[...Array(Math.min(3, playerCount))].map((_, i) => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white dark:border-card-dark"></div>
                                ))}
                                {playerCount > 3 && (
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-card-dark flex items-center justify-center text-[10px] font-bold">
                                        +{playerCount - 3}
                                    </div>
                                )}
                            </div>
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                {playerCount} Confirmados
                            </span>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => handleAttendance('declined')}
                                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl border font-bold transition-all uppercase tracking-wide text-xs flex items-center justify-center gap-2
                                    ${status === 'declined'
                                        ? 'bg-red-500 text-white border-red-500 shadow-md transform scale-105'
                                        : 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                    }
                                `}
                            >
                                <X size={16} />
                                No Voy
                            </button>
                            <button
                                onClick={() => handleAttendance('confirmed')}
                                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold transition-all uppercase tracking-wide text-xs flex items-center justify-center gap-2 shadow-lg
                                    ${status === 'confirmed'
                                        ? 'bg-green-600 text-white border-2 border-green-600 transform scale-105 shadow-green-500/50'
                                        : 'bg-primary text-secondary hover:brightness-110 shadow-primary/30'
                                    }
                                `}
                            >
                                <Check size={16} />
                                {status === 'confirmed' ? 'Confirmado' : 'Voy'}
                            </button>
                        </div>
                    </div>

                    {/* Tercer Tiempo Toggle */}
                    {status === 'confirmed' && (
                        <div className="mt-5 animate-fade-in">
                            <button
                                onClick={handleToggleSocial}
                                className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 font-bold text-sm uppercase tracking-wider transition-all duration-300
                                    ${staysForSocial
                                        ? 'bg-[#98ffc8]/15 border-[#3DFFA2] text-[#3DFFA2] shadow-lg shadow-[#3DFFA2]/10'
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-400 hover:border-[#3DFFA2]/40 hover:text-[#3DFFA2]/60'
                                    }
                                `}
                            >
                                <span className="text-xl">{staysForSocial ? '🍻' : '🍺'}</span>
                                <span>¿Te quedás al 3er Tiempo?</span>
                                {staysForSocial && <span className="text-lg">✅</span>}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
