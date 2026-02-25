import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, AlertTriangle, BadgeAlert, DollarSign, Clock, Trophy, Shield, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { useAuth } from '../lib/AuthContext';
import { PullToRefresh } from '../components/PullToRefresh';
import { BottomSheet } from '../components/BottomSheet';
import { X } from 'lucide-react';

type UnifiedRankingEntry = {
    player_id: string;
    full_name: string;
    avatar_url: string | null;
    role: string | null;
    total_points: number;
    positive_points: number;
    negative_points: number;
    breakdown: {
        asistencia: { pos: number; neg: number };
        finanzas: { pos: number; neg: number };
        logistica: { pos: number; neg: number };
    };
};

const Rankings: React.FC = () => {
    const { userRole } = useAuth();
    const [unifiedRanking, setUnifiedRanking] = useState<UnifiedRankingEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState<UnifiedRankingEntry | null>(null);
    const [infractions, setInfractions] = useState<any[]>([]);
    const [loadingInfractions, setLoadingInfractions] = useState(false);

    useEffect(() => {
        fetchUnifiedRanking();
    }, []);

    const fetchUnifiedRanking = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('unified_ranking')
                .select('*')
                .order('total_points', { ascending: false });

            if (error) throw error;
            setUnifiedRanking(data || []);
        } catch (error) {
            console.error('Error in fetchUnifiedRanking:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDetail = async (player: UnifiedRankingEntry) => {
        setSelectedPlayer(player);
        setLoadingInfractions(true);
        try {
            const { data, error } = await supabase
                .from('scoring_details')
                .select('*')
                .eq('player_id', player.player_id)
                .order('event_date', { ascending: false });

            if (error) throw error;
            setInfractions(data || []);
        } catch (error) {
            console.error('Error fetching detail:', error);
        } finally {
            setLoadingInfractions(false);
        }
    };

    const handlePardon = async (infraction: any) => {
        if (!infraction.source_table || infraction.id?.toString().startsWith('missing')) return;

        const { error } = await (supabase
            .from(infraction.source_table)
            .update({ is_pardoned: true, pardon_reason: 'Indultado por el DT' } as any)
            .eq('id', infraction.source_id) as any);

        if (error) {
            alert('Error al perdonar puntuación');
        } else {
            setInfractions((prev: any[]) => prev.map(i => i.source_id === infraction.source_id ? { ...i, is_pardoned: true } : i));
            fetchUnifiedRanking();
        }
    };

    const positiveRanking = unifiedRanking.filter(r => r.total_points >= 0);
    const negativeRanking = unifiedRanking.filter(r => r.total_points < 0);
    const podium = positiveRanking.slice(0, 3);
    const restPositive = positiveRanking.slice(3);

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-fade-in bg-background-light dark:bg-background-dark min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                <div>
                    <h1 className="font-display text-4xl lg:text-5xl font-black text-secondary dark:text-white uppercase tracking-tight">
                        <span className="text-primary">///</span> RANKING OUTLET FC
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 font-medium tracking-tight uppercase text-xs tracking-[0.2em] mt-2">Resumen de Temporada • Puntos de Compromiso</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-6 py-3 rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Efectividad Total</p>
                        <p className="text-xl font-black text-secondary dark:text-white">{(positiveRanking.length / unifiedRanking.length * 100 || 0).toFixed(0)}%</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-24">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="font-black text-gray-400 uppercase tracking-[0.2em] text-xs">Calculando compromiso...</p>
                </div>
            ) : (
                <PullToRefresh onRefresh={fetchUnifiedRanking}>
                    <div className="space-y-20">
                        {/* TOP SECTION: LOS MÁS COMPROMETIDOS */}
                        <section>
                            <div className="flex items-center gap-4 mb-10 text-center">
                                <span className="h-px bg-yellow-500/30 flex-1"></span>
                                <h2 className="font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-[0.3em] text-[10px] flex items-center gap-2 px-4">
                                    <Trophy size={14} /> Los Más Comprometidos
                                </h2>
                                <span className="h-px bg-yellow-500/30 flex-1"></span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-end px-4">
                                {podium[1] && <PodiumCard entry={podium[1]} pos={2} color="slate" onClick={() => fetchDetail(podium[1])} />}
                                {podium[0] && <PodiumCard entry={podium[0]} pos={1} color="yellow" trophy onClick={() => fetchDetail(podium[0])} />}
                                {podium[2] && <PodiumCard entry={podium[2]} pos={3} color="amber" onClick={() => fetchDetail(podium[2])} />}
                            </div>
                        </section>

                        {/* GENERAL TABLE */}
                        {restPositive.length > 0 && (
                            <section>
                                <div className="flex items-center gap-4 mb-8">
                                    <h2 className="font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] text-[10px] flex items-center gap-2">
                                        <Shield size={14} /> Tabla General
                                    </h2>
                                    <span className="h-px bg-gray-100 dark:bg-gray-800 flex-1"></span>
                                </div>

                                <div className="bg-white dark:bg-card-dark rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                    <table className="w-full">
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                            {restPositive.map((entry, index) => (
                                                <RankingRow
                                                    key={entry.player_id}
                                                    entry={entry}
                                                    pos={index + 4}
                                                    onClick={() => fetchDetail(entry)}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* MURO DE LA VERGÜENZA */}
                        <section className="pb-20">
                            <div className="flex items-center gap-4 mb-8">
                                <h2 className="font-black text-red-500 uppercase tracking-[0.3em] text-[10px] flex items-center gap-2">
                                    <BadgeAlert size={14} /> El Muro de la Vergüenza
                                </h2>
                                <span className="h-px bg-red-500/20 flex-1"></span>
                            </div>

                            {negativeRanking.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {negativeRanking.map((entry) => (
                                        <div
                                            key={entry.player_id}
                                            onClick={() => fetchDetail(entry)}
                                            className="bg-[#0a0f1a] p-8 rounded-[2.5rem] border-2 border-red-500/20 hover:border-red-500/50 transition-all cursor-pointer group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                                                <BadgeAlert size={120} className="text-red-500" />
                                            </div>

                                            <div className="flex flex-col items-center relative z-10">
                                                <div className="relative mb-6">
                                                    <div className="w-24 h-24 rounded-[2rem] bg-gray-900 border-4 border-red-500/30 overflow-hidden shadow-2xl group-hover:scale-105 transition-transform">
                                                        {entry.avatar_url ? <img src={entry.avatar_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" /> : <User size={40} className="text-gray-700 m-auto mt-6" />}
                                                    </div>
                                                </div>

                                                <h3 className="font-black text-white uppercase tracking-tighter text-xl mb-1 text-center">{entry.full_name}</h3>
                                                <p className="text-red-500 font-black text-3xl mb-6">{entry.total_points} PTS</p>

                                                <div className="w-full grid grid-cols-3 gap-2 text-center">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Déficit</p>
                                                        <p className="text-red-500 font-black">{entry.negative_points}</p>
                                                    </div>
                                                    <div className="border-x border-gray-800">
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Ahorro</p>
                                                        <p className="text-green-500 font-black">+{entry.positive_points}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Neto</p>
                                                        <p className="text-white font-black">{entry.total_points}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-100 dark:bg-gray-900/50 py-12 rounded-[2.5rem] text-center border-2 border-dashed border-gray-200 dark:border-gray-800">
                                    <CheckCircle className="text-primary w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-black text-gray-500 uppercase tracking-widest text-xs italic">Increíble, ¡nadie en el muro!</p>
                                </div>
                            )}
                        </section>
                    </div>
                </PullToRefresh>
            )}

            <BottomSheet
                isOpen={!!selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
                title="Detalle de Scoring"
            >
                {selectedPlayer && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-gray-800 shadow-lg">
                                {selectedPlayer.avatar_url ? (
                                    <img src={selectedPlayer.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                                        <User size={24} className="text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-display font-black text-gray-900 dark:text-white uppercase leading-tight">
                                    {selectedPlayer.full_name}
                                </h3>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                        {selectedPlayer.total_points} PTS TOTAL
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                            {loadingInfractions ? (
                                <div className="text-center py-10">
                                    <Loader2 className="animate-spin text-primary mx-auto mb-2" size={32} />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compilando historial...</p>
                                </div>
                            ) : infractions.length > 0 ? (
                                infractions.map((inf, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-5 rounded-2xl border ${inf.type === 'positiva'
                                            ? 'bg-green-50/50 dark:bg-green-500/5 border-green-100 dark:border-green-500/10'
                                            : 'bg-red-50/50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl">{inf.icon || (inf.type === 'positiva' ? '✓' : '⚠')}</div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                        {new Date(inf.event_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} • {inf.category}
                                                    </p>
                                                    <p className="font-bold text-gray-800 dark:text-gray-200 uppercase text-xs truncate">
                                                        {inf.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`font-black text-lg ${inf.type === 'positiva' ? 'text-green-500' : 'text-red-500'}`}>
                                                    {inf.points > 0 ? `+${inf.points}` : inf.points}
                                                </p>
                                                {(userRole === 'dt' || userRole === 'admin') && inf.type === 'negativa' && !inf.is_pardoned && (
                                                    <button
                                                        onClick={() => handlePardon(inf)}
                                                        className="text-[9px] font-black text-amber-500 underline uppercase tracking-widest"
                                                    >
                                                        Indultar
                                                    </button>
                                                )}
                                                {inf.is_pardoned && <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">INDULTADO</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 opacity-50">
                                    <CheckCircle size={40} className="mx-auto mb-2" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Sin registros</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-secondary p-8 rounded-[2rem] text-center">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Performance Histórica</p>
                            <div className="flex justify-center gap-12">
                                <div>
                                    <p className="text-2xl font-black text-white">{selectedPlayer.total_points}</p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Balance</p>
                                </div>
                                <div className="w-px h-10 bg-gray-800" />
                                <div>
                                    <p className="text-2xl font-black text-green-500">+{selectedPlayer.positive_points}</p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Favor</p>
                                </div>
                                <div className="w-px h-10 bg-gray-800" />
                                <div>
                                    <p className="text-2xl font-black text-red-500">{selectedPlayer.negative_points}</p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Contra</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </BottomSheet>
        </div>
    );
};

const PodiumCard = ({ entry, pos, color, trophy, onClick }: any) => {
    const cardBg = pos === 1 ? 'bg-yellow-500/10 border-yellow-500/30 shadow-yellow-500/10' : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900 shadow-xl';
    const avatarBorder = pos === 1 ? 'border-yellow-500 shadow-yellow-500/40' : 'border-primary/20 shadow-xl';
    const size = pos === 1 ? 'w-40 h-40' : 'w-32 h-32';

    return (
        <div className={`flex flex-col items-center animate-slide-up cursor-pointer group`} onClick={onClick}>
            <div className="relative mb-8">
                <div className={`${size} rounded-[3rem] border-8 ${avatarBorder} overflow-hidden transform transition-all group-hover:scale-105 group-hover:-rotate-3`}>
                    {entry.avatar_url ? <img src={entry.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center"><User size={48} className="text-gray-400" /></div>}
                </div>
                {trophy && <Trophy className="absolute -top-12 left-1/2 -translate-x-1/2 text-yellow-500 w-20 h-20 drop-shadow-2xl animate-bounce-slow" />}
                <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 ${pos === 1 ? 'bg-yellow-500 text-2xl w-16 h-16' : 'bg-gray-400 text-xl w-12 h-12'} text-white rounded-3xl flex items-center justify-center font-black border-4 border-white dark:border-gray-950 shadow-2xl`}>{pos}</div>
            </div>
            <h3 className={`font-black uppercase tracking-tight text-center ${pos === 1 ? 'text-2xl text-yellow-600 dark:text-yellow-500' : 'text-lg text-gray-800 dark:text-gray-200'}`}>{entry.full_name}</h3>
            <p className={`${pos === 1 ? 'text-5xl text-yellow-500' : 'text-2xl text-primary'} font-black mt-2 tracking-tighter`}>{entry.total_points} <span className="text-[10px] uppercase tracking-widest">pts</span></p>
        </div>
    );
};

const RankingRow = ({ entry, pos, onClick }: any) => (
    <tr className="group hover:bg-primary/5 transition-all cursor-pointer" onClick={onClick}>
        <td className="px-8 py-8 text-center w-24">
            <span className="font-black text-gray-400 group-hover:text-primary transition-colors text-lg tracking-tighter">#{pos}</span>
        </td>
        <td className="px-4 py-8">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-gray-100 dark:bg-gray-900 overflow-hidden border-2 border-transparent group-hover:border-primary/30 transition-all">
                    {entry.avatar_url ? <img src={entry.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User size={24} className="text-gray-400" /></div>}
                </div>
                <div>
                    <p className="font-black text-gray-800 dark:text-white uppercase tracking-tighter text-lg">{entry.full_name}</p>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{entry.role || 'Jugador'}</p>
                </div>
            </div>
        </td>
        <td className="px-8 py-8 text-right">
            <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-gray-950 dark:text-white tracking-tighter leading-none mb-2">
                    {entry.total_points} <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest ml-1">pts</span>
                </span>
                <div className="flex gap-3">
                    <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">+{entry.positive_points}</span>
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{entry.negative_points}</span>
                </div>
            </div>
        </td>
    </tr>
);

export default Rankings;
