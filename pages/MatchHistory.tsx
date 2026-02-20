import React, { useState, useEffect } from 'react';
import { History, Calendar, Clock, MapPin, Trophy, Edit2, Target } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { useNavigate } from 'react-router-dom';
import { PullToRefresh } from '../components/PullToRefresh';
import { BottomSheet } from '../components/BottomSheet';
import { X } from 'lucide-react';

type Match = Database['public']['Tables']['matches']['Row'];

const MatchHistory: React.FC = () => {
    const navigate = useNavigate();
    const [allMatches, setAllMatches] = useState<Match[]>([]);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'scheduled' | 'finished' | 'cancelled'>('all');
    const [loading, setLoading] = useState(true);

    // Result Entry Modal State
    const [showResultModal, setShowResultModal] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [ourScore, setOurScore] = useState('');
    const [opponentScore, setOpponentScore] = useState('');

    useEffect(() => {
        fetchAllMatches();
    }, []);

    const fetchAllMatches = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .order('match_date', { ascending: false });

        if (error) {
            console.error('Error fetching matches:', error);
        } else {
            setAllMatches(data || []);
        }
        setLoading(false);
    };

    const handleOpenResultModal = (match: Match) => {
        setSelectedMatch(match);
        setOurScore(match.result_our_score?.toString() || '');
        setOpponentScore(match.result_opponent_score?.toString() || '');
        setShowResultModal(true);
    };

    const handleSaveResult = async () => {
        if (!selectedMatch) return;

        const { error } = await supabase
            .from('matches')
            .update({
                result_our_score: ourScore ? parseInt(ourScore) : null,
                result_opponent_score: opponentScore ? parseInt(opponentScore) : null,
                status: 'finished'
            })
            .eq('id', selectedMatch.id);

        if (error) {
            console.error('Error updating match result:', error);
            alert('Error al guardar el resultado');
        } else {
            setShowResultModal(false);
            fetchAllMatches();
            alert('¡Resultado guardado exitosamente!');
        }
    };

    const handleViewAttendance = (matchId: string) => {
        // Navigate to admin page with the selected match
        navigate(`/admin?matchId=${matchId}`);
    };

    const filteredMatches = historyFilter === 'all'
        ? allMatches
        : allMatches.filter(m => m.status === historyFilter);

    const getStatusBadge = (status: string) => {
        const styles = {
            scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            finished: 'bg-green-500/10 text-green-500 border-green-500/20',
            cancelled: 'bg-red-500/10 text-red-500 border-red-500/20'
        };
        const labels = {
            scheduled: 'PROGRAMADO',
            finished: 'FINALIZADO',
            cancelled: 'CANCELADO'
        };
        return (
            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${styles[status as keyof typeof styles] || 'bg-gray-500/10 text-gray-500'}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const getMatchResult = (match: Match) => {
        if (match.result_our_score === null || match.result_opponent_score === null) return null;
        if (match.result_our_score > match.result_opponent_score) return 'GANÓ';
        if (match.result_our_score < match.result_opponent_score) return 'PERDIÓ';
        return 'EMPATE';
    };

    return (
        <div className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto animate-fade-in bg-background-light dark:bg-background-dark min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <History className="text-primary" size={32} />
                    <h1 className="font-display font-bold text-4xl lg:text-5xl text-secondary dark:text-white uppercase tracking-tight">
                        Historial de Partidos
                    </h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                    Revisa todos los partidos pasados y programados del equipo.
                </p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-2 flex-wrap">
                {(['all', 'scheduled', 'finished', 'cancelled'] as const).map(filter => (
                    <button
                        key={filter}
                        onClick={() => setHistoryFilter(filter)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${historyFilter === filter
                            ? 'bg-primary text-secondary'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        {filter === 'all' ? 'Todos' : filter === 'scheduled' ? 'Programados' : filter === 'finished' ? 'Finalizados' : 'Cancelados'}
                    </button>
                ))}
            </div>

            <PullToRefresh onRefresh={fetchAllMatches}>
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p>Cargando partidos...</p>
                        </div>
                    ) : filteredMatches.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-800">
                            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No hay partidos en esta categoría</p>
                        </div>
                    ) : (
                        filteredMatches.map(match => {
                            const matchDate = new Date(match.match_date);
                            const result = getMatchResult(match);

                            return (
                                <div
                                    key={match.id}
                                    className="bg-white dark:bg-card-dark rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="flex-1 min-w-[250px]">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <h3 className="text-xl font-display font-black text-gray-900 dark:text-white uppercase">
                                                    VS {match.opponent}
                                                </h3>
                                                {getStatusBadge(match.status)}
                                                {result && (
                                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${result === 'GANÓ' ? 'bg-green-500/10 text-green-500' :
                                                        result === 'PERDIÓ' ? 'bg-red-500/10 text-red-500' :
                                                            'bg-blue-500/10 text-blue-500'
                                                        }`}>
                                                        {result}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    {matchDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {matchDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={14} />
                                                    {match.location}
                                                </span>
                                            </div>
                                            {match.result_our_score !== null && match.result_opponent_score !== null && (
                                                <div className="mt-3 flex items-center gap-3">
                                                    <span className="text-2xl font-display font-black text-primary">
                                                        {match.result_our_score}
                                                    </span>
                                                    <span className="text-gray-400">-</span>
                                                    <span className="text-2xl font-display font-black text-gray-600 dark:text-gray-400">
                                                        {match.result_opponent_score}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {match.status === 'scheduled' && (
                                                <button
                                                    onClick={() => handleOpenResultModal(match)}
                                                    className="px-4 py-2 bg-primary text-secondary rounded-lg text-xs font-bold uppercase hover:brightness-110 transition-all flex items-center gap-2"
                                                >
                                                    <Trophy size={14} />
                                                    Cargar Resultado
                                                </button>
                                            )}
                                            {match.status === 'finished' && (
                                                <button
                                                    onClick={() => handleOpenResultModal(match)}
                                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold uppercase hover:bg-gray-300 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
                                                >
                                                    <Edit2 size={14} />
                                                    Editar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleViewAttendance(match.id)}
                                                className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold uppercase hover:bg-gray-800 transition-all flex items-center gap-2"
                                            >
                                                <Target size={14} />
                                                Ver Asistencia
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </PullToRefresh>

            <BottomSheet
                isOpen={showResultModal}
                onClose={() => setShowResultModal(false)}
                title="Resultado Final"
            >
                <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="text-center group">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                                Outlet FC
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={ourScore}
                                onChange={(e) => setOurScore(e.target.value)}
                                className="w-full text-center text-5xl font-display font-black bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-100 dark:border-gray-800 rounded-3xl py-6 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-primary shadow-inner"
                                placeholder="0"
                            />
                        </div>
                        <div className="text-center group">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 truncate italic">
                                {selectedMatch?.opponent.split(' ')[0]}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={opponentScore}
                                onChange={(e) => setOpponentScore(e.target.value)}
                                className="w-full text-center text-5xl font-display font-black bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-100 dark:border-gray-800 rounded-3xl py-6 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-600 dark:text-gray-400 shadow-inner"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={handleSaveResult}
                            className="w-full py-5 bg-primary text-secondary font-display font-black text-xl rounded-[2rem] uppercase tracking-[0.2em] shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Confirmar Resultado
                        </button>
                        <button
                            onClick={() => setShowResultModal(false)}
                            className="w-full py-4 mt-2 bg-transparent text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] hover:text-gray-600"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </BottomSheet>
        </div>
    );
};

export default MatchHistory;
