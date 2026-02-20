
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { Check, X, HelpCircle, AlertCircle, Shirt, Clock, Save, User as UserIcon, ChevronDown, Users } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Attendance = Database['public']['Tables']['attendance']['Row'];

interface PlayerWithAttendance extends Profile {
    attendance?: Attendance;
}

export const AdminAttendanceList = ({ matchId }: { matchId: string }) => {
    const [players, setPlayers] = useState<PlayerWithAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
    const [isRealAttendanceMode, setIsRealAttendanceMode] = useState(false);
    const [matchDetails, setMatchDetails] = useState<Database['public']['Tables']['matches']['Row'] | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (matchId) {
            fetchPlayers();
            fetchMatchDetails();
        }

        // Subscribe to changes
        const channel = supabase
            .channel('admin-attendance')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'attendance', filter: `match_id=eq.${matchId}` },
                () => {
                    fetchPlayers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId]);

    const fetchMatchDetails = async () => {
        const { data } = await supabase.from('matches').select('*').eq('id', matchId).single();
        if (data) setMatchDetails(data);
    };

    const fetchPlayers = async () => {
        setLoading(true);
        // 1. Get all profiles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name');

        if (profiles) {
            // 2. Get attendance for this match
            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('*')
                .eq('match_id', matchId);

            // 3. Merge
            const merged = profiles.map(p => ({
                ...p,
                attendance: attendanceData?.find(a => a.player_id === p.id)
            }));

            setPlayers(merged);
        }
        setLoading(false);
    };

    const updateStatus = async (playerId: string, status: 'confirmed' | 'declined' | 'pending') => {
        // Optimistic update
        setPlayers(current =>
            current.map(p =>
                p.id === playerId
                    ? { ...p, attendance: { ...p.attendance, confirmation_status: status } as Attendance }
                    : p
            )
        );

        const { error } = await supabase
            .from('attendance')
            .upsert({
                match_id: matchId,
                player_id: playerId,
                confirmation_status: status
            }, { onConflict: 'match_id, player_id' });

        if (error) {
            console.error('Error updating status:', error);
            fetchPlayers(); // Revert
        }
    };

    const getStatusColor = (status?: string | null) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'declined': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        }
    };

    const filteredPlayers = players.filter(p => {
        if (filter === 'all') return true;
        const status = p.attendance?.confirmation_status || 'pending';
        return status === filter;
    });

    const stats = {
        confirmed: players.filter(p => p.attendance?.confirmation_status === 'confirmed').length,
        pending: players.filter(p => !p.attendance?.confirmation_status || p.attendance?.confirmation_status === 'pending').length,
        declined: players.filter(p => p.attendance?.confirmation_status === 'declined').length
    };

    const handleSaveRealAttendance = async () => {
        setSaving(true);
        try {
            // Updated attendance records are already handled via the toggles in simplified logic
            // providing we upsert them. Let's make sure we update the match details for jerseys.
            if (matchDetails) {
                const { error } = await supabase
                    .from('matches')
                    .update({
                        jerseys_brought_by_id: matchDetails.jerseys_brought_by_id,
                        jerseys_washed_by_id: matchDetails.jerseys_washed_by_id
                    })
                    .eq('id', matchId);

                if (error) throw error;
            }
            setIsRealAttendanceMode(false);
            alert('¡Asistencia y camisetas guardadas exitosamente!');
        } catch (error) {
            console.error('Error saving real attendance:', error);
            alert('Error al guardar los datos.');
        } finally {
            setSaving(false);
        }
    };

    const updateRealAttendance = async (playerId: string, type: string) => {
        // Optimistic update
        setPlayers(current =>
            current.map(p =>
                p.id === playerId
                    ? { ...p, attendance: { ...p.attendance, attendance_type: type } as Attendance }
                    : p
            )
        );

        const { error } = await supabase
            .from('attendance')
            .upsert({
                match_id: matchId,
                player_id: playerId,
                attendance_type: type
            }, { onConflict: 'match_id, player_id' });

        if (error) {
            console.error('Error updating real attendance:', error);
            fetchPlayers();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-card-dark rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative">
            {isRealAttendanceMode && (
                <div className="absolute inset-0 z-50 bg-white dark:bg-card-dark flex flex-col animate-fade-in">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-secondary">
                        <h2 className="text-xl font-display font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <Clock className="text-primary" /> Control de Asistencia y Camisetas
                        </h2>
                        <button onClick={() => setIsRealAttendanceMode(false)} className="text-white opacity-60 hover:opacity-100 p-2">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {/* Jersey Tracking Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Responsable de traer camisetas</label>
                                <div className="relative">
                                    <select
                                        value={matchDetails?.jerseys_brought_by_id || ''}
                                        onChange={(e) => setMatchDetails(prev => prev ? { ...prev, jerseys_brought_by_id: e.target.value || null } : null)}
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
                                    >
                                        <option value="">Seleccionar jugador...</option>
                                        {players.map(p => (
                                            <option key={p.id} value={p.id}>{p.full_name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Responsable de lavar (Se las lleva)</label>
                                <div className="relative">
                                    <select
                                        value={matchDetails?.jerseys_washed_by_id || ''}
                                        onChange={(e) => setMatchDetails(prev => prev ? { ...prev, jerseys_washed_by_id: e.target.value || null } : null)}
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
                                    >
                                        <option value="">Seleccionar jugador...</option>
                                        {players.map(p => (
                                            <option key={p.id} value={p.id}>{p.full_name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Real Attendance Table */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                <Users size={14} /> Jugadores Confirmados
                            </h3>
                            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-white/50 dark:bg-black/20 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Jugador</th>
                                            <th className="px-6 py-4 text-center">Estado de Llegada</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {players.filter(p => p.attendance?.confirmation_status === 'confirmed').map(player => (
                                            <tr key={player.id} className="hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden font-bold text-[10px] text-gray-500">
                                                            {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" /> : player.full_name?.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-800 dark:text-white">{player.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {[
                                                            { id: 'present', label: 'A tiempo', icon: Clock, color: 'text-green-500' },
                                                            { id: 'late_1st_half', label: 'Tarde (1er T)', icon: Clock, color: 'text-yellow-500' },
                                                            { id: 'late_2nd_half', label: 'Tarde (2do T)', icon: Clock, color: 'text-orange-500' },
                                                            { id: 'absent', label: 'Faltazo', icon: AlertCircle, color: 'text-red-500' }
                                                        ].map(opt => (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => updateRealAttendance(player.id, opt.id)}
                                                                title={opt.label}
                                                                className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-1 group
                                                                    ${player.attendance?.attendance_type === opt.id
                                                                        ? 'bg-white dark:bg-gray-800 border-primary shadow-lg ring-2 ring-primary/20 scale-105'
                                                                        : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-gray-800 hover:border-gray-200 opacity-40 hover:opacity-100'
                                                                    }`}
                                                            >
                                                                <opt.icon size={18} className={opt.color} />
                                                                <span className="text-[7px] font-black uppercase tracking-tight text-gray-500 dark:text-gray-400">{opt.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                        <button onClick={() => setIsRealAttendanceMode(false)} className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-300 dark:hover:bg-gray-700 transition-all">
                            Cerrar
                        </button>
                        <button
                            onClick={handleSaveRealAttendance}
                            disabled={saving}
                            className="px-8 py-3 bg-primary text-secondary rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
                        >
                            {saving ? <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div> : <Save size={16} />}
                            Finalizar Reporte
                        </button>
                    </div>
                </div>
            )}
            {/* Header / Stats */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="font-display text-xl font-black text-secondary dark:text-white uppercase tracking-tight">Plantel</h2>
                        <div className="flex gap-2 text-[9px] font-black uppercase tracking-widest mt-1">
                            <span className="text-green-500">{stats.confirmed} Confirmados</span>
                            <span className="text-yellow-500/80">{stats.pending} Pendientes</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsRealAttendanceMode(true)}
                        className="bg-primary hover:bg-primary-dark text-secondary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                        <Clock size={14} /> Registrar Asistencia Real
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    {(['all', 'confirmed', 'pending'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 text-xs font-bold uppercase rounded-full transition-colors
                                ${filter === f
                                    ? 'bg-secondary text-white dark:bg-white dark:text-secondary'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                }`}
                        >
                            {f === 'all' ? 'Todos' : f === 'confirmed' ? 'Confirmados' : 'Pendientes'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Cargando jugadores...</div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredPlayers.map(player => (
                            <li key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden font-bold text-gray-500">
                                            {player.avatar_url ? (
                                                <img src={player.avatar_url} alt="av" className="w-full h-full object-cover" />
                                            ) : (
                                                player.full_name?.substring(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{player.full_name}</p>
                                            <p className="text-xs text-gray-500">{player.role || 'Jugador'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(player.attendance?.confirmation_status)}`}>
                                            {player.attendance?.confirmation_status || 'Pendiente'}
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 ml-2">
                                            <button
                                                onClick={() => updateStatus(player.id, 'confirmed')}
                                                className={`p-1.5 rounded hover:bg-white dark:hover:bg-gray-700 shadow-sm transition
                                                    ${player.attendance?.confirmation_status === 'confirmed' ? 'text-green-500' : 'text-gray-400'}
                                                `}
                                                title="Confirmar"
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={() => updateStatus(player.id, 'pending')}
                                                className={`p-1.5 rounded hover:bg-white dark:hover:bg-gray-700 shadow-sm transition
                                                    ${!player.attendance?.confirmation_status || player.attendance?.confirmation_status === 'pending' ? 'text-yellow-500' : 'text-gray-400'}
                                                `}
                                                title="Pendiente"
                                            >
                                                <HelpCircle size={14} />
                                            </button>
                                            <button
                                                onClick={() => updateStatus(player.id, 'declined')}
                                                className={`p-1.5 rounded hover:bg-white dark:hover:bg-gray-700 shadow-sm transition
                                                    ${player.attendance?.confirmation_status === 'declined' ? 'text-red-500' : 'text-gray-400'}
                                                `}
                                                title="Baja"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
