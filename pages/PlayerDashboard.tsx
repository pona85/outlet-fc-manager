import React, { useState, useEffect, useRef } from 'react';
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
    Users,
    Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MatchRoster } from '../components/MatchRoster';

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
    const [staysForSocial, setStaysForSocial] = useState(false);
    const [attendanceNote, setAttendanceNote] = useState('');
    const [savings, setSavings] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState({ state: 'loading', expected: 0, paid: 0 });
    const [formationData, setFormationData] = useState<{ formation: string; lineup: any[]; subs: any[]; dt: any | null } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [top3, setTop3] = useState<UnifiedRankingEntry[]>([]);
    const [hasShameAlert, setHasShameAlert] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
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

                        const [attRes, attCountRes, allLineupRes, allConfirmedRes, dtRes] = await Promise.all([
                            supabase.from('attendance').select('*').eq('match_id', mData.id).eq('player_id', pData.id).maybeSingle(),
                            supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('match_id', mData.id).eq('confirmation_status', 'confirmed'),
                            supabase.from('match_lineups').select('*, profile:player_id(*)').eq('match_id', mData.id),
                            supabase.from('attendance').select('player_id, profiles:player_id(*)').eq('match_id', mData.id).eq('confirmation_status', 'confirmed'),
                            supabase.from('profiles').select('*').eq('role', 'dt').limit(1).maybeSingle()
                        ]) as any[];

                        setAttendance(attRes.data as any);
                        setAttendanceCount(attCountRes.count || 0);
                        setStaysForSocial((attRes.data as any)?.stays_for_social || false);
                        setAttendanceNote((attRes.data as any)?.note || '');

                        // Build formation data
                        const lineupEntries = (allLineupRes.data || []) as any[];
                        const confirmedEntries = (allConfirmedRes.data || []) as any[];
                        const matchFormation = (mData as any).formation || '2-3-2';
                        const lineupPlayerIds = new Set(lineupEntries.map((l: any) => l.player_id));
                        const subs = confirmedEntries
                            .filter((c: any) => !lineupPlayerIds.has(c.player_id))
                            .map((c: any) => {
                                const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
                                return p;
                            }).filter(Boolean);

                        if (lineupEntries.length > 0) {
                            setFormationData({
                                formation: matchFormation,
                                lineup: lineupEntries,
                                subs,
                                dt: dtRes.data || null
                            });
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

        // If declining, reset social
        if (status === 'declined') setStaysForSocial(false);

        try {
            const upsertData: any = {
                match_id: nextMatch.id,
                player_id: profile.id,
                confirmation_status: status,
                stays_for_social: status === 'declined' ? false : staysForSocial,
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

    const handleToggleSocial = async () => {
        if (!nextMatch || !profile || attendance?.confirmation_status !== 'confirmed') return;
        setIsUpdating(true);

        const newVal = !staysForSocial;
        setStaysForSocial(newVal);

        try {
            const { data, error } = await supabase
                .from('attendance')
                .upsert({
                    match_id: nextMatch.id,
                    player_id: profile.id,
                    confirmation_status: 'confirmed',
                    stays_for_social: newVal,
                }, { onConflict: 'match_id,player_id' })
                .select()
                .single();

            if (error) throw error;
            setAttendance(data);
        } catch (error: any) {
            setStaysForSocial(!newVal); // revert
            console.error('Error updating stays_for_social:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const saveNote = async (text: string) => {
        if (!nextMatch || !profile || !attendance) return;
        try {
            await supabase
                .from('attendance')
                .update({ note: text || null } as any)
                .eq('match_id', nextMatch.id)
                .eq('player_id', profile.id);
        } catch (error) {
            console.error('Error saving note:', error);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            alert('Solo se permiten imágenes');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen no puede superar los 5MB');
            return;
        }

        setUploadingAvatar(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `player_${profile.id}_${Date.now()}.${fileExt}`;

            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const avatarUrl = urlData.publicUrl;

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: avatarUrl } as any)
                .eq('id', profile.id);

            if (updateError) throw updateError;

            setProfile({ ...profile, avatar_url: avatarUrl });
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            alert('Error al subir la foto: ' + error.message);
        } finally {
            setUploadingAvatar(false);
            // Reset file input
            if (avatarInputRef.current) avatarInputRef.current.value = '';
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
                        <div
                            onClick={() => avatarInputRef.current?.click()}
                            className="w-24 h-24 rounded-[2.5rem] overflow-hidden border-4 border-primary/20 bg-secondary flex items-center justify-center shadow-2xl group-hover:border-primary/50 transition-all cursor-pointer"
                        >
                            {uploadingAvatar ? (
                                <Loader2 className="text-primary animate-spin" size={32} />
                            ) : profile.avatar_url ? (
                                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                            ) : <User className="text-gray-500" size={40} />}

                            {/* Camera overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity rounded-[2.5rem]">
                                <Camera className="text-white" size={24} />
                            </div>
                        </div>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                        />
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

                                {/* Tercer Tiempo Toggle */}
                                {attendance?.confirmation_status === 'confirmed' && (
                                    <div className="mt-6 animate-fade-in">
                                        <button
                                            onClick={handleToggleSocial}
                                            disabled={isUpdating}
                                            className={`w-full flex items-center justify-center gap-3 py-4 rounded-3xl border-2 font-black text-sm uppercase tracking-widest transition-all duration-300
                                                ${staysForSocial
                                                    ? 'bg-[#98ffc8]/15 border-[#3DFFA2] text-[#3DFFA2] shadow-lg shadow-[#3DFFA2]/20'
                                                    : 'bg-white/5 border-white/10 text-white/40 hover:border-[#3DFFA2]/40 hover:text-[#3DFFA2]/60'
                                                }
                                            `}
                                        >
                                            <span className="text-xl">{staysForSocial ? '🍻' : '🍺'}</span>
                                            <span>¿Te quedás al 3er Tiempo?</span>
                                            {staysForSocial && <span className="text-lg">✅</span>}
                                        </button>
                                    </div>
                                )}

                                {/* Aclaración del jugador */}
                                {attendance?.confirmation_status && (
                                    <div className="mt-4 animate-fade-in">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">
                                            📝 Aclaración (opcional)
                                        </label>
                                        <textarea
                                            value={attendanceNote}
                                            onChange={(e) => setAttendanceNote(e.target.value)}
                                            onBlur={(e) => saveNote(e.target.value)}
                                            placeholder="Ej: llego arrancado el partido, me tengo que ir en el 2do tiempo..."
                                            maxLength={150}
                                            rows={2}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                                        />
                                        <p className="text-[9px] text-white/20 mt-1 text-right">{attendanceNote.length}/150</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-100 dark:bg-gray-800 p-16 rounded-[3rem] text-center border-4 border-dashed border-gray-200 dark:border-gray-700">
                            <CircleDashed className="mx-auto text-gray-400 mb-6 animate-spin-slow" size={64} />
                            <h3 className="text-2xl font-black text-gray-400 uppercase">No hay partidos programados</h3>
                            <p className="text-xs font-bold text-gray-500 mt-2 uppercase tracking-widest">El DT informará pronto la próxima fecha.</p>
                        </div>
                    )}

                    {/* Match Roster - Lista de Convocados */}
                    {nextMatch && (
                        <MatchRoster matchId={nextMatch.id} />
                    )}

                    {/* Jersey Custodian Widget */}
                    <JerseyComponent />

                    {/* Formation Snapshot */}
                    {formationData && nextMatch && (
                        <div className="bg-white dark:bg-card-dark rounded-[3rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-display font-black uppercase tracking-tight">Formación</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{formationData.formation}</p>
                                </div>
                            </div>
                            {/* Full-width Pitch */}
                            <div className="relative w-full aspect-[3/4] bg-gradient-to-b from-[#1e8c7e] to-[#2a9d8f] rounded-2xl border-4 border-secondary/20 overflow-hidden">
                                {/* Field lines */}
                                <div className="absolute inset-4 border border-white/20 rounded-lg pointer-events-none"></div>
                                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 -translate-y-1/2 pointer-events-none"></div>
                                <div className="absolute top-1/2 left-1/2 w-20 h-20 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                {/* Arco superior */}
                                <div className="absolute top-0 left-1/2 w-28 h-8 border-b-2 border-x-2 border-white/30 -translate-x-1/2 bg-white/5 pointer-events-none rounded-b-sm"></div>
                                {/* Area chica superior */}
                                <div className="absolute top-0 left-1/2 w-44 h-14 border-b border-x border-white/15 -translate-x-1/2 pointer-events-none"></div>
                                {/* Arco inferior */}
                                <div className="absolute bottom-0 left-1/2 w-28 h-8 border-t-2 border-x-2 border-white/30 -translate-x-1/2 bg-white/5 pointer-events-none rounded-t-sm"></div>
                                {/* Area chica inferior */}
                                <div className="absolute bottom-0 left-1/2 w-44 h-14 border-t border-x border-white/15 -translate-x-1/2 pointer-events-none"></div>

                                {(() => {
                                    const MINI_FORMATIONS: Record<string, { x: number; y: number }[]> = {
                                        '2-3-2': [
                                            { x: 50, y: 88 }, { x: 30, y: 65 }, { x: 70, y: 65 },
                                            { x: 20, y: 42 }, { x: 50, y: 45 }, { x: 80, y: 42 },
                                            { x: 35, y: 20 }, { x: 65, y: 20 }
                                        ],
                                        '3-3-1': [
                                            { x: 50, y: 88 }, { x: 20, y: 65 }, { x: 50, y: 68 }, { x: 80, y: 65 },
                                            { x: 20, y: 42 }, { x: 50, y: 45 }, { x: 80, y: 42 },
                                            { x: 50, y: 18 }
                                        ],
                                        '2-4-1': [
                                            { x: 50, y: 88 }, { x: 35, y: 65 }, { x: 65, y: 65 },
                                            { x: 15, y: 42 }, { x: 40, y: 42 }, { x: 60, y: 42 }, { x: 85, y: 42 },
                                            { x: 50, y: 18 }
                                        ],
                                        '2-3-1-1': [
                                            { x: 50, y: 88 }, { x: 30, y: 65 }, { x: 70, y: 65 },
                                            { x: 20, y: 45 }, { x: 50, y: 45 }, { x: 80, y: 45 },
                                            { x: 50, y: 28 }, { x: 50, y: 12 }
                                        ],
                                        '3-2-2': [
                                            { x: 50, y: 88 }, { x: 20, y: 65 }, { x: 50, y: 68 }, { x: 80, y: 65 },
                                            { x: 35, y: 42 }, { x: 65, y: 42 },
                                            { x: 35, y: 18 }, { x: 65, y: 18 }
                                        ]
                                    };
                                    const slots = MINI_FORMATIONS[formationData.formation] || MINI_FORMATIONS['2-3-2'];

                                    return slots.map((coord, i) => {
                                        const entry = formationData.lineup.find((l: any) => l.slot_index === i);
                                        const entryProfile = entry?.profile ? (Array.isArray(entry.profile) ? entry.profile[0] : entry.profile) : null;
                                        const isMe = entry?.player_id === profile.id;

                                        return (
                                            <div
                                                key={i}
                                                style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                                                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                                            >
                                                <div className={`
                                                    w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center overflow-hidden shadow-xl transition-all
                                                    ${isMe
                                                        ? 'border-[3px] border-primary bg-white ring-4 ring-primary/30 scale-110'
                                                        : entry
                                                            ? 'border-2 border-white/70 bg-white'
                                                            : 'border-2 border-dashed border-white/30 bg-white/10'
                                                    }
                                                `}>
                                                    {entryProfile?.avatar_url ? (
                                                        <img src={entryProfile.avatar_url} className="w-full h-full object-cover" alt="" />
                                                    ) : entry ? (
                                                        <span className={`text-xs font-black ${isMe ? 'text-primary' : 'text-secondary'}`}>
                                                            {entryProfile?.full_name?.substring(0, 2).toUpperCase() || '??'}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {isMe && (
                                                    <span className="mt-1.5 text-[8px] font-black bg-primary text-secondary px-2.5 py-0.5 rounded-full uppercase whitespace-nowrap shadow-lg">
                                                        Vos
                                                    </span>
                                                )}
                                                {!isMe && entryProfile && (
                                                    <span className="mt-1 text-[8px] font-bold text-white/90 whitespace-nowrap truncate max-w-[60px] bg-black/20 px-1.5 py-0.5 rounded-md">
                                                        {entryProfile.full_name?.split(' ')[0]}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* DT + Subs row below pitch */}
                            <div className="flex gap-3 mt-4">
                                {/* DT */}
                                {formationData.dt && (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 flex items-center gap-3 shrink-0">
                                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                                            {formationData.dt.avatar_url ? (
                                                <img src={formationData.dt.avatar_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <User size={16} className="text-gray-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">DT</p>
                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                {formationData.dt.full_name?.split(' ')[0]}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Subs */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700 flex-1 min-w-0">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Suplentes ({formationData.subs.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                        {formationData.subs.length === 0 ? (
                                            <p className="text-[10px] text-gray-400 italic">Sin suplentes</p>
                                        ) : (
                                            formationData.subs.map((sub: any) => {
                                                const isMe = sub.id === profile.id;
                                                return (
                                                    <div key={sub.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${isMe ? 'bg-primary/10 border border-primary/20' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}`}>
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                                                            {sub.avatar_url ? (
                                                                <img src={sub.avatar_url} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <span className="text-[8px] font-bold text-gray-400">{sub.full_name?.substring(0, 2).toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <span className={`text-[10px] font-bold truncate ${isMe ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}>
                                                            {isMe ? 'Vos' : sub.full_name?.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
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
