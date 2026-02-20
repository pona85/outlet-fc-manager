import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { Shirt, MessageCircle, AlertCircle, Clock, User } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Match = Database['public']['Tables']['matches']['Row'];

export const JerseyCustodianWidget: React.FC = () => {
    const [custodian, setCustodian] = useState<Profile | null>(null);
    const [nextMatch, setNextMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCustodianData = async () => {
            setLoading(true);
            try {
                // 1. Fetch most recent match where jerseys were washed/taken
                const { data: lastMatch } = await (supabase
                    .from('matches')
                    .select('jerseys_washed_by_id')
                    .not('jerseys_washed_by_id', 'is', null)
                    .order('match_date', { ascending: false })
                    .limit(1) as any)
                    .maybeSingle();

                if (lastMatch && 'jerseys_washed_by_id' in lastMatch && lastMatch.jerseys_washed_by_id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', lastMatch.jerseys_washed_by_id)
                        .single();

                    if (profile) setCustodian(profile as Profile);
                }

                // 2. Fetch next scheduled match to check time
                const { data: nextMatchData } = await supabase
                    .from('matches')
                    .select('*')
                    .eq('status', 'scheduled')
                    .order('match_date', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (nextMatchData) setNextMatch(nextMatchData);

            } catch (error) {
                console.error('Error fetching jersey custodian:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCustodianData();
    }, []);

    if (loading) return (
        <div className="bg-[#0a1128] p-6 rounded-[2rem] border border-primary/20 animate-pulse h-32 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-800"></div>
            <div className="flex-1 space-y-2">
                <div className="h-2 bg-gray-800 rounded w-1/2"></div>
                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            </div>
        </div>
    );

    if (!custodian) return null;

    const isUrgent = nextMatch ? (new Date(nextMatch.match_date).getTime() - new Date().getTime()) < (24 * 60 * 60 * 1000) : false;

    const handleWhatsApp = () => {
        const message = `Hola ${custodian.full_name?.split(' ')[0]}, acordate de traer las camisetas para el partido de hoy. ¡Abrazo!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="bg-[#0a1128] p-6 rounded-[2.5rem] border border-primary/30 shadow-2xl relative overflow-hidden group hover:border-primary/50 transition-all">
            {/* Glossy highlight */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-primary overflow-hidden shadow-[0_0_15px_rgba(140,214,150,0.3)] bg-secondary flex items-center justify-center">
                            {custodian.avatar_url ? (
                                <img src={custodian.avatar_url} alt={custodian.full_name || ''} className="w-full h-full object-cover" />
                            ) : <User size={32} className="text-gray-500" />}
                        </div>
                        {isUrgent && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full animate-pulse ring-2 ring-red-500/20">
                                <AlertCircle size={14} />
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 italic">Responsable de Camisetas</h3>
                        <p className="text-lg font-display font-black text-white uppercase tracking-tighter truncate max-w-[150px]">
                            {custodian.full_name}
                        </p>
                        {isUrgent && (
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                                <Clock size={10} /> Recordatorio Pendiente
                            </span>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleWhatsApp}
                    className="flex items-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-2xl hover:bg-[#128C7E] transition-all font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-90 group"
                >
                    <MessageCircle size={18} className="group-hover:rotate-12 transition-transform" />
                    <span className="hidden sm:inline">WhatsApp</span>
                </button>
            </div>

            {/* Background Icon */}
            <Shirt className="absolute -right-6 -bottom-6 w-32 h-32 text-primary opacity-[0.03] -rotate-12 pointer-events-none" />
        </div>
    );
};
