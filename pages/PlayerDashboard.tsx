import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { Database } from '../types/supabase';
import {
    Calendar,
    MapPin,
    CheckCircle2,
    XCircle,
    Clock,
    Wallet,
    Shield,
    User,
    Loader2,
    TrendingUp,
    ChevronRight,
    CircleDashed,
    AlertCircle,
    BadgeAlert,
    LogOut,
    Shirt,
    Trophy,
    Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Match = Database['public']['Tables']['matches']['Row'];
type Attendance = Database['public']['Tables']['attendance']['Row'];

type UnifiedRankingEntry = {
    id: string;
    full_name: string;
    avatar_url: string | null;
    total_points: number;
    positive_points: number;
    negative_points: number;
};

const PlayerDashboard: React.FC = () => {
    const { session } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [nextMatch, setNextMatch] = useState<Match | null>(null);
    const [attendance, setAttendance] = useState<Attendance | null>(null);
    const [attendanceCount, setAttendanceCount] = useState(0);
    const [savings, setSavings] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState({ state: 'loading', expected: 0, paid: 0 });
    const [lineupPos, setLineupPos] = useState<{ x: number, y: number } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [top3, setTop3] = useState<UnifiedRankingEntry[]>([]);
    const [hasShameAlert, setHasShameAlert] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const loadPlayerData = async () => {
            if (!session?.user) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const now = new Date();
                const month = now.getMonth() + 1;
                const year = now.getFullYear();

                // 1. Fetch Profile and Rankings (Parallel)
                const [profileRes, rankingsRes, clubPayRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
                    supabase.from('unified_ranking').select('*').order('total_points', { ascending: false }),
                    supabase.from('club_payments').select('savings').eq('month', month).eq('year', year).maybeSingle()
                ]) as any[];

                if (profileRes.data) {
                    const pData = profileRes.data as any;
                    setProfile(pData);

                    if (clubPayRes.data) {
                        setSavings(Number(clubPayRes.data.savings));
                    }

                    // 2. Fetch Next Match and its context
                    const { data: mData } = await (supabase
                        .from('matches')
                        .select('*')
                        .eq('status', 'scheduled')
                        .order('match_date', { ascending: true })
                        .limit(1)
                        .maybeSingle() as any);

                    if (mData) {
                        setNextMatch(mData);

                        const [attRes, attCountRes, lineupRes] = await Promise.all([
                            supabase.from('attendance').select('*').eq('match_id', mData.id).eq('player_id', pData.id).maybeSingle(),
                            supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('match_id', mData.id).eq('confirmation_status', 'confirmed'),
                            supabase.from('match_lineups').select('*').eq('match_id', mData.id).eq('player_id', pData.id).maybeSingle()
                        ]) as any[];

                        setAttendance(attRes.data as any);
                        setAttendanceCount(attCountRes.count || 0);
                        if (lineupRes.data) {
                            setLineupPos({ x: (lineupRes.data as any).position_x, y: (lineupRes.data as any).position_y });
                        }
                    }

                    // 3. Rankings & Alerts
                    if (rankingsRes.data) {
                        const sortedRankings = rankingsRes.data as UnifiedRankingEntry[];
                        setTop3(sortedRankings.slice(0, 3));

                        // Check if ANYONE is in shame (-10 points or less)
                        setHasShameAlert(sortedRankings.some(r => r.total_points <= -10));

                        const myEntry = sortedRankings.find(r => r.id === pData.id);
                        if (myEntry && (myEntry.total_points < 0 || myEntry.total_points <= -10)) {
                            pData.shame = {
                                points: myEntry.total_points,
                                isLeader: sortedRankings[sortedRankings.length - 1]?.id === pData.id
                            };
                        }
                    }

                    // 4. Personal Balance
                    const [feesRes, paymentsRes] = await Promise.all([
                        supabase.from('fees_config').select('*').eq('month', month).eq('year', year),
                        supabase.from('payments').select('*').eq('player_id', pData.id).eq('month', month).eq('year', year)
                    ]) as any[];

                    const feeActivo = (feesRes.data as any)?.find((f: any) => f.category === 'activo')?.amount || 0;
                    const feeDT = pData.role === 'dt' ? ((feesRes.data as any)?.find((f: any) => f.category === 'dt')?.amount || 0) : 0;
                    const expected = Number(feeActivo) + Number(feeDT);
                    const paid = (paymentsRes.data as any)?.reduce((acc: number, p: any) => acc + Number(p.amount_total), 0) || 0;
                    const financed = (paymentsRes.data as any)?.some((p: any) => p.is_financed_by_team);

                    setBalance({
                        state: financed ? 'financed' : (paid >= expected && expected > 0) ? 'paid' : 'debt',
                        expected,
                        paid
                    });
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPlayerData();
    }, [session]);

    const handleAttendance = async (status: 'confirmed' | 'declined') => {
        if (!nextMatch || !profile) return;
        setIsUpdating(true);
        try {
            const upsertData: any = {
                match_id: nextMatch.id,
                player_id: profile.id,
                confirmation_status: status,
            };
            if (attendance?.id) upsertData.id = attendance.id;

            const { data, error } = await supabase
                .from('attendance')
                .upsert(upsertData, { onConflict: 'match_id,player_id' })
                .select()
                .single();

            if (error) throw error;
            setAttendance(data);

            // Refresh count
            const { count } = await supabase
                .from('attendance')
                .select('*', { count: 'exact', head: true })
                .eq('match_id', nextMatch.id)
                .eq('confirmation_status', 'confirmed');

            setAttendanceCount(count || 0);
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(val).replace('ARS', '$');
    };

    if (loading) return <DashboardSkeleton />;

    if (!profile) return <div className="p-10 text-center dark:text-white">Perfil no encontrado.</div>;

    const shame = (profile as any).shame;

    return (
        <div className="p-4 lg:p-10 max-w-7xl mx-auto animate-fade-in pb-32">

            {/* 1. Header & Quick Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden border-4 border-primary/20 bg-secondary flex items-center justify-center shadow-2xl group-hover:border-primary/50 transition-all">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                            ) : <User className="text-gray-500" size={40} />}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-primary text-secondary text-sm font-black w-9 h-9 flex items-center justify-center rounded-2xl border-2 border-white dark:border-background-dark shadow-xl">
                            #{profile.jersey_number || '--'}
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-2">¡Hola, {profile.full_name?.split(' ')[0]}!</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                            Plantel Oficial • {profile.role}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {hasShameAlert && (
                        <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-3 rounded-2xl border border-red-500/20 animate-bounce-slow">
                            <BadgeAlert size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Alerta Muro</span>
                        </div>
                    )}
                    <button
                        onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
                        className="p-4 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 rounded-2xl transition-all shadow-sm active:scale-95"
                    >
                        <LogOut size={24} />
                    </button>
                </div>
            </div>

            {/* 2. Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column (Main Context) - Col Span 8 */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Urgency Alerts */}
                    {shame && (
                        <div className={`p-8 rounded-[2.5rem] border-2 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-8 ${shame.isLeader ? 'bg-red-600 border-red-400 text-white' : 'bg-[#0a0f1a] border-red-500/50 text-white'}`}>
                            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                                <AlertCircle size={32} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-2xl font-black uppercase tracking-tight mb-1">{shame.isLeader ? '⚠️ SOS EL COLISTA DEL EQUIPO' : '⚠️ ATENCIÓN: MURO DE LA VERGÜENZA'}</h3>
                                <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Tu compromiso está bajo ({shame.points} pts). Regularizá tus deudas o asistencias.</p>
                            </div>
                        </div>
                    )}

                    {/* Próximo Partido Hero */}
                    {nextMatch ? (
                        <div className="bg-secondary rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl group">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                                <Calendar size={200} />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <span className="px-4 py-1 bg-primary text-secondary text-[10px] font-black uppercase tracking-[0.3em] rounded-full">Próximo Partido</span>
                                    <span className="px-4 py-1 bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full flex items-center gap-2">
                                        <Users size={12} className="text-primary" /> {attendanceCount} / 8 CONFIRMADOS
                                    </span>
                                </div>

                                <h2 className="text-6xl font-display font-black uppercase mb-8 leading-none tracking-tighter">
                                    VS <span className="text-primary">{nextMatch.opponent}</span>
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
                                        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase opacity-50">Fecha y Hora</p>
                                            <p className="font-bold text-sm uppercase">{new Date(nextMatch.match_date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} • {new Date(nextMatch.match_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
                                        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                                            <MapPin size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase opacity-50">Lugar</p>
                                            <p className="font-bold text-sm uppercase">{nextMatch.location || 'A confirmar'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Attendance Confirm */}
                                <div className="mt-12 flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => handleAttendance('confirmed')}
                                        disabled={isUpdating}
                                        className={`flex-1 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all ${attendance?.confirmation_status === 'confirmed'
                                            ? 'bg-primary text-secondary shadow-[0_0_30px_rgba(45,212,191,0.4)]'
                                            : 'bg-white/10 border-2 border-white/10 hover:border-primary/50 text-white'}`}
                                    >
                                        Confirmar Asistencia {attendance?.confirmation_status === 'confirmed' && '✅'}
                                    </button>
                                    <button
                                        onClick={() => handleAttendance('declined')}
                                        disabled={isUpdating}
                                        className={`flex-1 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all ${attendance?.confirmation_status === 'declined'
                                            ? 'bg-red-500 text-white'
                                            : 'bg-white/5 border-2 border-white/5 hover:border-red-500/30 text-white/50'}`}
                                    >
                                        No puedo ir {attendance?.confirmation_status === 'declined' && '❌'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-100 dark:bg-gray-800 p-16 rounded-[3rem] text-center border-4 border-dashed border-gray-200 dark:border-gray-700">
                            <CircleDashed className="mx-auto text-gray-400 mb-6 animate-spin-slow" size={64} />
                            <h3 className="text-2xl font-black text-gray-400 uppercase">No hay partidos programados</h3>
                            <p className="text-xs font-bold text-gray-500 mt-2 uppercase tracking-widest">El DT informará pronto la próxima fecha.</p>
                        </div>
                    )}

                    {/* Jersey Custodian Widget */}
                    <JerseyComponent />

                    {/* Tactics Snapshot */}
                    {lineupPos && nextMatch && (
                        <div className="bg-white dark:bg-card-dark rounded-[3rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                    <Shield size={24} />
                                </div>
                                <h3 className="text-xl font-display font-black uppercase tracking-tight">Tu Posición</h3>
                            </div>
                            <div className="relative w-full aspect-[16/9] bg-[#2a9d8f] rounded-[2rem] border-4 border-secondary/20 overflow-hidden">
                                <div className="absolute inset-4 border border-white/20 rounded-xl"></div>
                                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 -translate-y-1/2"></div>
                                <div className="absolute top-1/2 left-1/2 w-24 h-24 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                                <div
                                    style={{ left: `${lineupPos.x}%`, top: `${lineupPos.y}%` }}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-bounce-slow"
                                >
                                    <div className="w-14 h-14 bg-white rounded-full border-4 border-primary flex items-center justify-center shadow-2xl">
                                        <span className="font-black text-secondary text-base">#{profile.jersey_number}</span>
                                    </div>
                                    <span className="mt-2 text-[8px] font-black bg-secondary text-white px-3 py-1 rounded-full uppercase">Titular</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column (Widgets) - Col Span 4 */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Treasury Snapshot */}
                    <div className="bg-white dark:bg-card-dark p-10 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm group hover:shadow-xl transition-all">
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-4 bg-primary/10 rounded-3xl text-primary group-hover:scale-110 transition-transform">
                                <Wallet size={32} />
                            </div>
                            <div className="flex flex-col items-end">
                                {balance.state === 'paid' ? (
                                    <span className="text-[9px] font-black text-green-600 bg-green-50 px-4 py-2 rounded-full uppercase tracking-widest border border-green-100">Al Día</span>
                                ) : (
                                    <span className="text-[9px] font-black text-red-500 bg-red-50 px-4 py-2 rounded-full uppercase tracking-widest border border-red-100 animate-pulse">Pendiente</span>
                                )}
                            </div>
                        </div>

                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Mi Cuota del Mes</p>
                        <h4 className="text-4xl font-display font-black text-gray-900 dark:text-white mb-8">{formatCurrency(balance.expected)}</h4>

                        <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Ahorro del Mes (Fondo Club)</p>
                            <div className="flex items-center gap-3">
                                <span className={`text-2xl font-black ${savings && savings > 0 ? 'text-primary' : 'text-gray-400'}`}>
                                    {savings !== null ? formatCurrency(savings) : '$ ---'}
                                </span>
                                {savings && savings > 0 && <TrendingUp className="text-primary" size={18} />}
                            </div>
                        </div>
                    </div>

                    {/* Mini Ranking Compromiso */}
                    <div className="bg-[#0a0f1a] p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                        <Trophy className="absolute -right-8 -bottom-8 w-40 h-40 opacity-[0.03] pointer-events-none" />

                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-lg font-display font-black uppercase tracking-tight flex items-center gap-3">
                                <Trophy className="text-yellow-500" size={24} /> Top 3 Ranking
                            </h3>
                            <button onClick={() => navigate('/rankings')} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                <ChevronRight size={20} className="text-primary" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {top3.map((p, idx) => (
                                <div key={p.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-xl bg-gray-800 border border-white/10 overflow-hidden">
                                                {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <User className="p-3 text-gray-600" />}
                                            </div>
                                            <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-500 text-secondary text-[10px] font-black flex items-center justify-center rounded-lg border-2 border-[#0a0f1a]">
                                                {idx + 1}
                                            </div>
                                        </div>
                                        <span className="font-bold text-sm uppercase tracking-tight">{p.full_name?.split(' ')[0]}</span>
                                    </div>
                                    <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-black">+{p.total_points}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const DashboardSkeleton = () => (
    <div className="p-10 max-w-7xl mx-auto space-y-12 animate-pulse">
        <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-[2.5rem]"></div>
            <div className="space-y-3">
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-xl w-48"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-32"></div>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
                <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-[3rem]"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-[3rem]"></div>
            </div>
            <div className="lg:col-span-4 space-y-8">
                <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-[3rem]"></div>
                <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-[3rem]"></div>
            </div>
        </div>
    </div>
);

const JerseyComponent: React.FC = () => {
    const [custodian, setCustodian] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCustodian = async () => {
            const { data: lastMatch } = await (supabase
                .from('matches')
                .select('*, profile:jerseys_washed_by_id(*)')
                .not('jerseys_washed_by_id', 'is', null)
                .order('match_date', { ascending: false })
                .limit(1)
                .maybeSingle() as any);

            if (lastMatch?.profile) setCustodian(lastMatch.profile);
            setLoading(false);
        };
        fetchCustodian();
    }, []);

    if (loading) return <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-[3rem] animate-pulse"></div>;
    if (!custodian) return null;

    return (
        <div className="bg-[#0a1128] p-8 rounded-[3rem] border border-primary/20 shadow-xl relative overflow-hidden group">
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full border-2 border-primary overflow-hidden bg-secondary">
                        {custodian.avatar_url ? <img src={custodian.avatar_url} className="w-full h-full object-cover" /> : <User className="p-4 text-gray-500" />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1 italic">Custodio de Camisetas</p>
                        <h3 className="text-2xl font-display font-black text-white uppercase tracking-tighter">{custodian.full_name}</h3>
                    </div>
                </div>
                <Shirt className="text-primary lg:w-16 lg:h-16 w-12 h-12 opacity-50 group-hover:rotate-12 transition-transform duration-500" />
            </div>
        </div>
    );
};

export default PlayerDashboard;
