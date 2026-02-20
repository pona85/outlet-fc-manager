import React, { useState, useEffect } from 'react';
import { History, Plus, Shield, Calendar, ChevronDown, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { AdminAttendanceList } from '../components/AdminAttendanceList';
import { useAuth } from '../lib/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { Database } from '../types/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';

type Match = Database['public']['Tables']['matches']['Row'];

const MatchAdmin: React.FC = () => {
    const { userRole } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Form State
    const [opponent, setOpponent] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [pitch, setPitch] = useState('Local (Central Park)');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Active Match State (for attendance view)
    const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Initial Load: check URL params first, then fetch next match


    const fetchNextMatch = async () => {
        const { data } = await supabase
            .from('matches')
            .select('id')
            .eq('status', 'scheduled')
            .order('match_date', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (data) {
            setActiveMatchId(data.id);
            // We do NOT populate form for next match automatically per typical workflow
        }
    };

    const fetchMatchDetails = async (id: string) => {
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .eq('id', id)
            .single();

        if (data) {
            setOpponent(data.opponent);
            setPitch(data.location);

            // Parse date and time from ISO string
            const matchDateObj = new Date(data.match_date);
            const year = matchDateObj.getFullYear();
            const month = (matchDateObj.getMonth() + 1).toString().padStart(2, '0');
            const day = matchDateObj.getDate().toString().padStart(2, '0');
            setDate(`${year}-${month}-${day}`);
            // Extract HH:mm safely
            const hours = matchDateObj.getHours().toString().padStart(2, '0');
            const minutes = matchDateObj.getMinutes().toString().padStart(2, '0');
            setTime(`${hours}:${minutes}`);

            setIsEditing(true);
        } else if (error) {
            console.error('Error fetching match details:', error);
        }
    };

    const resetForm = () => {
        setOpponent('');
        setDate('');
        setTime('');
        setPitch('Local (Central Park)');
        setIsEditing(false);
        setSuccessMessage('');
    };

    // Initial Load: check URL params first, then fetch next match
    useEffect(() => {
        const matchIdFromUrl = searchParams.get('matchId');
        if (matchIdFromUrl) {
            setActiveMatchId(matchIdFromUrl);
            fetchMatchDetails(matchIdFromUrl);
        } else {
            fetchNextMatch();
            resetForm();
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');

        // Combine date and time
        const matchTimestamp = new Date(`${date}T${time}`).toISOString();

        const matchData = {
            opponent,
            match_date: matchTimestamp,
            location: pitch,
            status: 'scheduled'
        };

        let result;

        if (isEditing && activeMatchId) {
            result = await supabase
                .from('matches')
                .update(matchData)
                .eq('id', activeMatchId)
                .select()
                .single();
        } else {
            result = await supabase
                .from('matches')
                .insert(matchData)
                .select()
                .single();
        }

        const { data, error } = result;

        if (error) {
            console.error(error);
            alert('Error al guardar el partido');
        } else {
            setSuccessMessage(isEditing ? '¡Partido actualizado exitosamente!' : '¡Partido programado exitosamente!');
            if (!isEditing) {
                setActiveMatchId(data.id);
                // We keep the form filled if editing, or reset if creating? 
                // Usually reset if creating new.
                resetForm();
            }
            // If editing, we leave the values so user sees what they saved.
        }
        setLoading(false);
    };

    const handleOpenHistory = () => {
        navigate('/history');
    };

    return (
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto animate-fade-in bg-background-light dark:bg-background-dark min-h-screen">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="font-display font-bold text-4xl lg:text-5xl text-secondary dark:text-white uppercase tracking-tight">Gestión de Partidos</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400 font-medium">Administra los próximos encuentros y el rendimiento del equipo.</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={handleOpenHistory}
                        className="inline-flex items-center px-4 py-2 bg-secondary dark:bg-card-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                    >
                        <History size={16} className="mr-2" />
                        Ver Historial
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

                {/* CREATE MATCH FORM */}
                <div className="lg:col-span-4 flex flex-col gap-6 min-h-0">
                    <div className="bg-white dark:bg-card-dark rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                        <div className="bg-secondary px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-secondary to-gray-800">
                            <h2 className="font-display text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                {isEditing ? (
                                    <>
                                        <span className="text-primary">///</span> Editar Partido
                                    </>
                                ) : (
                                    <>
                                        <span className="text-primary">///</span> Nuevo Partido
                                    </>
                                )}
                            </h2>
                            <Shield className="text-primary opacity-80" size={20} />
                        </div>

                        {!(userRole === 'admin' || userRole === 'dt') ? (
                            <div className="p-10 text-center animate-fade-in bg-gray-50/50 dark:bg-gray-900/20">
                                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-3 border border-red-500/20">
                                    <ShieldAlert size={40} />
                                </div>
                                <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2 uppercase tracking-tighter">ACCESO RESTRINGIDO</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No tienes permiso para programar partidos. Solo Administradores o DTs pueden realizar esta acción.</p>
                            </div>
                        ) : successMessage ? (
                            <div className="p-10 text-center animate-fade-in bg-gray-50/50 dark:bg-gray-900/20">
                                <div className="w-20 h-20 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3 ring-4 ring-primary/10">
                                    <Shield size={40} className="fill-current" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2 uppercase tracking-tighter">¡LISTO PARA EL DUELO!</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">{successMessage}</p>
                                <button
                                    onClick={() => setSuccessMessage('')}
                                    className="px-6 py-3 bg-secondary dark:bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg uppercase text-xs tracking-widest"
                                >
                                    PROXIMO PARTIDO
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Equipo Rival</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                                            <Shield size={18} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={opponent}
                                            onChange={(e) => setOpponent(e.target.value)}
                                            className="focus:ring-2 focus:ring-primary focus:border-primary block w-full pl-12 text-sm border-gray-200 dark:border-gray-800 dark:bg-gray-900/50 dark:text-white rounded-xl py-3.5 transition-all outline-none"
                                            placeholder="Nombre del rival..."
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Fecha</label>
                                        <input
                                            type="date"
                                            required
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="focus:ring-2 focus:ring-primary focus:border-primary block w-full text-sm border-gray-200 dark:border-gray-800 dark:bg-gray-900/50 dark:text-white rounded-xl py-3.5 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Hora</label>
                                        <input
                                            type="time"
                                            required
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="focus:ring-2 focus:ring-primary focus:border-primary block w-full text-sm border-gray-200 dark:border-gray-800 dark:bg-gray-900/50 dark:text-white rounded-xl py-3.5 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Sede / Cancha</label>
                                    <div className="relative">
                                        <select
                                            value={pitch}
                                            onChange={(e) => setPitch(e.target.value)}
                                            className="appearance-none focus:ring-2 focus:ring-primary focus:border-primary block w-full pl-4 pr-10 py-3.5 text-sm border-gray-200 dark:border-gray-800 dark:bg-gray-900/50 dark:text-white rounded-xl transition-all outline-none"
                                        >
                                            {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                                                <option key={num} value={`Cancha ${num} (Sede Club)`}>Cancha {num} (Sede Club)</option>
                                            ))}
                                            <option value="Visita">Visita</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="pt-4 pb-2 flex gap-3">
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                resetForm();
                                                navigate('/admin');
                                            }}
                                            className="flex-1 flex items-center justify-center gap-3 py-4 bg-gray-200 dark:bg-gray-800 text-gray-500 font-display font-black text-sm uppercase tracking-[0.2em] rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-all shadow-lg"
                                        >
                                            <X size={18} strokeWidth={3} />
                                            Cancelar
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`flex items-center justify-center gap-3 py-4 bg-primary text-secondary font-display font-black text-sm uppercase tracking-[0.2em] rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 ${isEditing ? 'flex-1' : 'w-full'}`}
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                {isEditing ? <Save size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                                                {isEditing ? 'Guardar Cambios' : 'Programar Partido'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* ATTENDANCE LIST (Conditional) */}
                <div className="lg:col-span-8 flex flex-col h-[600px] lg:h-full min-h-[500px]">
                    {activeMatchId ? (
                        <AdminAttendanceList matchId={activeMatchId} />
                    ) : (
                        <div className="h-full bg-white dark:bg-card-dark rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                            <Calendar size={48} className="mb-4 opacity-50" />
                            <h3 className="text-lg font-bold mb-2">Sin Partido Seleccionado</h3>
                            <p className="max-w-xs">Programa un nuevo partido o selecciona uno del historial para gestionar la asistencia.</p>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
};

export default MatchAdmin;
