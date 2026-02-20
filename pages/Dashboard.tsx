import React, { useState, useEffect } from 'react';
import {
    Users,
    DollarSign,
    Target,
    TrendingUp,
    MessageCircle,
    User,
    Calendar,
    MapPin,
    ArrowUpRight,
    Search,
    Bell,
    UserCircle,
    Plus,
    AlertCircle,
    TrendingDown,
    PiggyBank
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { AttendanceCard } from '../components/AttendanceCard';
import { JerseyCustodianWidget } from '../components/JerseyCustodianWidget';
import { PullToRefresh } from '../components/PullToRefresh';
import { InstallBanner } from '../components/InstallBanner';

interface DashboardStats {
    recaudacionMes: number;
    asistenciaPromedio: number;
    jugadoresActivos: number;
    deudaTotal: number;
}

interface FinancialSummary {
    totalRecaudado: number;
    totalPaidClub: number;
    ahorro: number;
}

const Dashboard: React.FC = () => {
    const { session, userRole } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        recaudacionMes: 0,
        asistenciaPromedio: 0,
        jugadoresActivos: 0,
        deudaTotal: 0
    });
    const [finances, setFinances] = useState<FinancialSummary>({
        totalRecaudado: 0,
        totalPaidClub: 0,
        ahorro: 0
    });
    const [morosos, setMorosos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();

        // Real-time subscriptions
        const attendanceChannel = supabase
            .channel('dashboard-attendance')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchAllData())
            .subscribe();

        const paymentChannel = supabase
            .channel('dashboard-payments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchAllData())
            .subscribe();

        const profilesChannel = supabase
            .channel('dashboard-profiles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchAllData())
            .subscribe();

        return () => {
            supabase.removeChannel(attendanceChannel);
            supabase.removeChannel(paymentChannel);
            supabase.removeChannel(profilesChannel);
        };
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        try {
            // 1. Recaudación Mes & Deuda Total
            const { data: paymentsData } = await supabase
                .from('payments')
                .select('paid_to_team, debt_with_team, month, year') as { data: any[] };

            const recaudacionMes = paymentsData
                ?.filter(p => p.month === currentMonth && p.year === currentYear)
                .reduce((acc, p) => acc + Number(p.paid_to_team), 0) || 0;

            const deudaTotal = paymentsData?.reduce((acc, p) => acc + Number(p.debt_with_team), 0) || 0;

            // 2. Jugadores Activos
            const { count: activosCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .in('status', ['activo', 'semiactivo']);

            // 3. Asistencia Promedio (Last 3 matches)
            const { data: lastMatches } = await supabase
                .from('matches')
                .select('id')
                .eq('status', 'finished')
                .order('match_date', { ascending: false })
                .limit(3) as { data: any[] };

            let avgAttendance = 0;
            if (lastMatches && lastMatches.length > 0) {
                const matchIds = lastMatches.map(m => m.id);
                const { data: attendanceData } = await supabase
                    .from('attendance')
                    .select('match_id, confirmation_status, attendance_type')
                    .in('match_id', matchIds) as { data: any[] };

                // Calculate % per match and then average
                const attendanceByMatch = lastMatches.map(m => {
                    const matchAttendance = attendanceData?.filter(a => a.match_id === m.id) || [];
                    const present = matchAttendance.filter(a => a.attendance_type === 'present' || a.attendance_type?.includes('late')).length;
                    const totalExpected = matchAttendance.length || 12;
                    return (present / totalExpected) * 100;
                });
                avgAttendance = attendanceByMatch.reduce((acc, val) => acc + val, 0) / attendanceByMatch.length;
            }

            // 4. Caja del Equipo
            const { data: clubPayments } = await supabase.from('club_payments').select('amount_paid') as { data: any[] };
            const totalRecaudado = paymentsData?.reduce((acc, p) => acc + Number(p.paid_to_team), 0) || 0;
            const totalPaidClub = clubPayments?.reduce((acc, cp) => acc + Number(cp.amount_paid), 0) || 0;

            // 5. Morosos (Top 3 from unified_ranking)
            const { data: rankingData } = await supabase
                .from('unified_ranking')
                .select('*')
                .order('total_points', { ascending: true })
                .limit(3);

            setStats({
                recaudacionMes,
                asistenciaPromedio: Math.round(avgAttendance),
                jugadoresActivos: activosCount || 0,
                deudaTotal
            });

            setFinances({
                totalRecaudado,
                totalPaidClub,
                ahorro: totalRecaudado - totalPaidClub
            });

            setMorosos(rankingData || []);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PullToRefresh onRefresh={fetchAllData}>
            <div className="p-4 lg:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-[0.2em]">
                            <span className="w-8 h-[2px] bg-primary"></span>
                            Panel de Control
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                            Estado <span className="text-primary truncate">del Club</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar jugador..."
                                className="w-full md:w-64 pl-10 pr-4 py-2 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm shadow-sm"
                            />
                        </div>
                        <button className="relative p-2.5 rounded-xl bg-white dark:bg-card-dark text-gray-400 hover:text-primary border border-gray-200 dark:border-gray-700 transition-all shadow-sm hover:shadow-md active:scale-95">
                            <Bell size={22} />
                            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-card-dark rounded-full"></span>
                        </button>
                    </div>
                </header>

                {/* PWA Install Banner */}
                <InstallBanner />

                {/* 1. Top Row: Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <KPICard
                        label="Recaudación Mes"
                        value={`$${stats.recaudacionMes.toLocaleString()}`}
                        icon={DollarSign}
                        color="text-emerald-500"
                        bgColor="bg-emerald-500/10"
                        loading={loading}
                    />
                    <KPICard
                        label="Asistencia Promedio"
                        value={`${stats.asistenciaPromedio}%`}
                        icon={Target}
                        color="text-primary"
                        bgColor="bg-primary/10"
                        loading={loading}
                    />
                    <KPICard
                        label="Jugadores Activos"
                        value={stats.jugadoresActivos.toString()}
                        icon={Users}
                        color="text-blue-500"
                        bgColor="bg-blue-500/10"
                        loading={loading}
                    />
                    <KPICard
                        label="Deuda Total"
                        value={`$${stats.deudaTotal.toLocaleString()}`}
                        icon={TrendingDown}
                        color="text-rose-500"
                        bgColor="bg-rose-500/10"
                        loading={loading}
                    />
                </div>

                {/* 2. Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    {/* Left Column: Match Logistics */}
                    <div className="space-y-6">
                        <div className="h-full flex flex-col gap-6">
                            <section className="flex-1 min-h-[300px]">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Calendar size={14} className="text-primary" />
                                    Próximo Desafío
                                </h3>
                                <div className="h-full">
                                    <AttendanceCardWithEmpty />
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <TrendingUp size={14} className="text-primary" />
                                    Logística de Indumentaria
                                </h3>
                                <JerseyCustodianWidget />
                            </section>
                        </div>
                    </div>

                    {/* Right Column: Finance & Discipline */}
                    <div className="space-y-6">
                        {/* Caja del Equipo */}
                        <section className="bg-white dark:bg-card-dark p-8 rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div>
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                        <PiggyBank size={14} className="text-emerald-500" />
                                        Caja del Equipo
                                    </h3>
                                    <p className="text-4xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                        ${finances.ahorro.toLocaleString()}
                                    </p>
                                </div>
                                <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                    Ahorro Equipo
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Recaudado</p>
                                    <p className="text-xl font-display font-bold text-gray-900 dark:text-white">${finances.totalRecaudado.toLocaleString()}</p>
                                </div>
                                <div className="border-l border-gray-100 dark:border-gray-800 pl-8">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Pagado al Club</p>
                                    <p className="text-xl font-display font-bold text-rose-500">${finances.totalPaidClub.toLocaleString()}</p>
                                </div>
                            </div>
                        </section>

                        {/* Alerta de Morosos */}
                        <section className="bg-card-light dark:bg-card-dark p-8 rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <AlertCircle size={14} className="text-rose-500" />
                                Alerta de Compromiso
                            </h3>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {morosos.length > 0 ? (
                                    morosos.map((player, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 group hover:border-rose-500/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-transparent group-hover:border-rose-500/20 transition-all bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                    {player.avatar_url ? (
                                                        <img src={player.avatar_url} alt={player.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={20} className="text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white uppercase text-sm tracking-tight">{player.full_name}</p>
                                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                                        Moral baja: {player.total_points} PTS
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${player.full_name?.split(' ')[0]}, como va? Te escribo por el saldo pendiente en Outlet FC. Avisame cuando puedas arreglarlo, gracias!`)}`, '_blank')}
                                                className="p-2.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                                            >
                                                <MessageCircle size={20} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sin morosos críticos 🎉</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </PullToRefresh>
    );
};

const KPICard = ({ label, value, icon: Icon, color, bgColor, loading }: any) => (
    <div className="bg-white dark:bg-card-dark p-6 rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className={`absolute -right-4 -top-4 w-16 h-16 ${bgColor} rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
        <div className="relative z-10 flex flex-col gap-4">
            <div className={`p-2.5 rounded-xl ${bgColor} ${color} w-fit`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                {loading ? (
                    <div className="h-8 bg-gray-100 dark:bg-gray-800 animate-pulse rounded w-24"></div>
                ) : (
                    <p className={`text-2xl lg:text-3xl font-display font-black ${color} tracking-tighter italic uppercase`}>
                        {value}
                    </p>
                )}
            </div>
        </div>
    </div>
);

const AttendanceCardWithEmpty = () => {
    const [hasMatch, setHasMatch] = useState<boolean | null>(null);

    useEffect(() => {
        const checkMatch = async () => {
            const { count } = await supabase
                .from('matches')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'scheduled');
            setHasMatch((count || 0) > 0);
        };
        checkMatch();
    }, []);

    if (hasMatch === null) return <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-[2rem]"></div>;

    if (!hasMatch) {
        return (
            <div className="h-full min-h-[250px] bg-white dark:bg-card-dark rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center p-8 gap-4 text-center group hover:border-primary/50 transition-all">
                <div className="p-4 bg-primary/10 text-primary rounded-full group-hover:scale-110 transition-transform">
                    <Calendar size={32} />
                </div>
                <div>
                    <h4 className="font-display font-black text-xl text-gray-900 dark:text-white uppercase tracking-tighter italic">No hay partidos programados</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Siguiente fecha a confirmar</p>
                </div>
                <a
                    href="/match-admin"
                    className="mt-2 flex items-center gap-2 px-6 py-3 bg-primary text-secondary rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                    <Plus size={18} />
                    Crear Partido
                </a>
            </div>
        );
    }

    return <AttendanceCard />;
};

export default Dashboard;
