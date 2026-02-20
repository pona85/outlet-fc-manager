import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { ShieldAlert } from 'lucide-react';
import {
    Search,
    Filter,
    TrendingUp,
    AlertTriangle,
    Wallet,
    ArrowRight,
    Plus,
    DollarSign,
    Calendar,
    Settings,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Loader2,
    Save,
    History,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight,
    Shield,
    Pencil
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { BottomSheet } from '../components/BottomSheet';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type HistoricalFee = Database['public']['Tables']['fees_config']['Row'];
type HistoricalStatus = Database['public']['Tables']['player_monthly_status']['Row'];
type ClubPayment = Database['public']['Tables']['club_payments']['Row'];

interface PlayerAccountStatus {
    totalExpected: number;
    totalPaid: number;
    totalDebt: number;
    financedDebt: number; // Sum of is_financed_by_team payments
    monthlyStatus: {
        month: number;
        year: number;
        expected: number;
        paid: number;
        status: 'paid' | 'debt' | 'financed';
    }[];
}

const Treasury: React.FC = () => {
    const { userRole } = useAuth();
    const [players, setPlayers] = useState<Profile[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [allFees, setAllFees] = useState<HistoricalFee[]>([]);
    const [allHistoricalStatus, setAllHistoricalStatus] = useState<HistoricalStatus[]>([]);
    const [clubClosings, setClubClosings] = useState<ClubPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isClubModalOpen, setIsClubModalOpen] = useState(false);
    const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<Profile | null>(null);
    const [isSavingClub, setIsSavingClub] = useState(false);

    // View Filter State
    const [viewDate, setViewDate] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    // Payment Form State
    const [paymentForm, setPaymentForm] = useState({
        player_id: '',
        amount: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        date: new Date().toISOString().split('T')[0],
        financed: false
    });

    // Config Form State
    const [configForm, setConfigForm] = useState({ activo: 0, semiactivo: 0, pasivo: 0, dt: 0 });
    const [configGroupPayment, setConfigGroupPayment] = useState(false);

    // Monthly Settings State
    const [monthlySettings, setMonthlySettings] = useState<Database['public']['Tables']['monthly_settings']['Row'] | null>(null);
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'accounts' | 'financing'>('accounts');

    // Club Payment Form State
    const [clubForm, setClubForm] = useState({
        amount_paid: '',
        notes: ''
    });

    // Initial Load
    useEffect(() => {
        fetchData();
    }, [viewDate]); // Reload if view date changes to get relevant config?? 
    // Actually fetchData calls ALL data. Ideally we filter. 
    // But current fetchData gets ALL payments and ALL fees.
    // monthly_settings is small, let's get all or just current.
    // For "viewDate", we need "is_group_payment" for THAT month to show stats?
    // User said: "necesito saber cuanto ahorro el equipo en el mes".
    // So we need settings for current viewDate.

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profilesRes, paymentsRes, feesRes, settingsRes, statusRes, closingsRes] = await Promise.all([
                supabase.from('profiles').select('*').order('full_name'),
                supabase.from('payments').select('*').order('payment_date', { ascending: false }),
                supabase.from('fees_config').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
                supabase.from('monthly_settings').select('*'),
                supabase.from('player_monthly_status').select('*'),
                supabase.from('club_payments').select('*')
            ]);

            if (profilesRes.data) setPlayers(profilesRes.data);
            if (paymentsRes.data) setPayments(paymentsRes.data);
            if (feesRes.data) setAllFees(feesRes.data);
            if (statusRes.data) setAllHistoricalStatus(statusRes.data);
            if (closingsRes.data) setClubClosings(closingsRes.data);

            // Set settings for CURRENT VIEW DATE
            // But wait, fetchData shouldn't depend on viewDate if we want to cache everything?
            // Simple: store all settings or just find the one we need.
            // Let's store current view monthly setting separately or derived?
            // I'll just find it.
            if (settingsRes.data) {
                const setting = settingsRes.data.find(s => s.month === viewDate.month && s.year === viewDate.year);
                setMonthlySettings(setting || null);
                setConfigGroupPayment(setting?.is_group_payment || false);
            }

            // Set current month fees for the form (based on viewDate)
            const currentMonthFees = feesRes.data?.filter(f => f.month === viewDate.month && f.year === viewDate.year);
            const config = { activo: 0, semiactivo: 0, pasivo: 0, dt: 0 };
            if (currentMonthFees && currentMonthFees.length > 0) {
                currentMonthFees.forEach(f => {
                    if (f.category in config) config[f.category as keyof typeof config] = Number(f.amount);
                });
            }
            setConfigForm(config);

        } catch (error) {
            console.error('Error fetching treasury data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const updates = Object.entries(configForm).map(([category, amount]) => ({
                category,
                amount,
                month: viewDate.month, // Set config for the CURRENTLY SELECTED view date
                year: viewDate.year
            }));

            for (const update of updates) {
                await supabase
                    .from('fees_config')
                    .upsert(update, { onConflict: 'category,month,year' });
            }

            // Save Monthly Settings (Group Payment)
            // We need a state for this checkbox.
            // I'll assume I add `isGroupPayment` state and use it here.
            // But I haven't added it yet.
            // I'll rely on `monthlySettings?.is_group_payment` derived from state?
            // No, I need a form state for the edit. 
            // I will update the code to use a temp state `configGroupPayment`.

            await supabase.from('monthly_settings').upsert({
                month: viewDate.month,
                year: viewDate.year,
                is_group_payment: configGroupPayment
            }, { onConflict: 'month,year' });


            await fetchData();
            setIsConfigModalOpen(false);
            alert('Configuración actualizada para ' + viewDate.month + '/' + viewDate.year);
        } catch (error) {
            console.error('Error saving config:', error);
            alert('Error al guardar configuración');
        }
    };

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentForm.player_id) return;

        try {
            const paymentData = {
                player_id: paymentForm.player_id,
                amount_total: Number(paymentForm.amount),
                paid_to_team: Number(paymentForm.amount),
                month: paymentForm.month,
                year: paymentForm.year,
                payment_date: paymentForm.date,
                is_financed_by_team: paymentForm.financed,
                status: 'paid'
            };

            if (editingPaymentId) {
                const { error } = await supabase
                    .from('payments')
                    .update(paymentData)
                    .eq('id', editingPaymentId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('payments')
                    .insert([paymentData]);
                if (error) throw error;
            }

            await fetchData();
            setIsPaymentModalOpen(false);
            alert('¡Pago registrado correctamente!');
            setEditingPaymentId(null);
            setPaymentForm({
                ...paymentForm,
                player_id: '',
                amount: '',
                financed: false
            });
        } catch (error) {
            console.error('Error saving payment:', error);
            alert('Error al registrar pago');
        }
    };
    const handleSaveClubClosing = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingClub(true);
        try {
            const { error: upsertError } = await supabase.from('club_payments').upsert({
                month: viewDate.month,
                year: viewDate.year,
                amount_paid: Number(clubForm.amount_paid),
                collected_total: monthlyStats.totalCollected,
                savings: monthlyStats.totalCollected - Number(clubForm.amount_paid),
                notes: clubForm.notes
            }, { onConflict: 'month,year' });

            if (upsertError) throw upsertError;
            await fetchData();
            setIsClubModalOpen(false);
            alert('¡Cierre mensual guardado correctamente!');
        } catch (error) {
            console.error('Error saving club closing:', error);
            alert('Error al guardar el cierre mensual');
        } finally {
            setIsSavingClub(false);
        }
    };

    const handleMarkAsReimbursed = async (paymentId: string) => {
        try {
            const { error } = await supabase
                .from('payments')
                .update({ reimbursed_to_team: true })
                .eq('id', paymentId);
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error marking as reimbursed:', error);
            alert('Error al marcar como devuelto');
        }
    };

    const handleEditPayment = (payment: Payment) => {
        setPaymentForm({
            player_id: payment.player_id,
            amount: payment.amount_total.toString(),
            month: payment.month,
            year: payment.year,
            date: payment.payment_date || new Date().toISOString().split('T')[0],
            financed: payment.is_financed_by_team || false
        });
        setEditingPaymentId(payment.id);
        setIsPaymentModalOpen(true);
        // Clean up Detail Modal if open?
        // Maybe keep it open to return to it?
        // If modal is on top of modal, z-index matters.
        // Payment modal z-index is 100. Detail modal is 100.
        // I should probably close Detail modal or make Payment modal 110.
        // Or simply set Detail to null?
        // User workflow: View Detail -> Edit Payment -> Save -> Return to Treasury.
        // Detail modal closes automatically if I don't keep it.
        setSelectedPlayerForDetail(null);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(amount).replace('ARS', '$');
    };

    const getFeeForMonth = (category: string, month: number, year: number) => {
        const fee = allFees.find(f => f.category === category && f.month === month && f.year === year);
        return fee ? Number(fee.amount) : 0;
    };

    const calculatePlayerAccount = useMemo(() => {
        return (player: Profile): PlayerAccountStatus => {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1; // 1-indexed

            let totalExpected = 0;
            let totalPaid = 0;
            let financedDebt = 0;
            let monthlyStatus: PlayerAccountStatus['monthlyStatus'] = [];

            // iterate from Jan 2025 (or start of records) to today
            // assuming starting Jan 2025 for simplicity
            let curM = 1;
            let curY = 2025;
            let loopCount = 0;

            while ((curY < currentYear || (curY === currentYear && curM <= currentMonth)) && loopCount < 120) {
                loopCount++;

                // 1. Calculate Expected Fee (Status Fee + DT)
                const monthStatus = allHistoricalStatus.find(s => s.player_id === player.id && s.month === curM && s.year === curY);
                const statusCategory = monthStatus?.status || player.status || 'activo';

                const statusFeeObj = allFees.find(f => f.category === statusCategory && f.month === curM && f.year === curY);
                const dtFeeObj = allFees.find(f => f.category === 'dt' && f.month === curM && f.year === curY);

                const statusFee = statusFeeObj ? Number(statusFeeObj.amount) : 0;
                const dtFee = dtFeeObj ? Number(dtFeeObj.amount) : 0;

                const expected = statusFee + dtFee;

                // 2. Calculate Paid Amount
                const monthPayments = payments.filter(p => p.player_id === player.id && p.month === curM && p.year === curY);
                let paid = 0;
                let isFinanced = false;

                monthPayments.forEach(p => {
                    if (p.is_financed_by_team) isFinanced = true;
                    paid += Number(p.amount_total);

                    // Financed debt only counts if NOT reimbursed to team
                    if (p.is_financed_by_team && !p.reimbursed_to_team) {
                        financedDebt += Number(p.amount_total);
                    }
                });

                if (expected > 0) {
                    totalExpected += expected;
                    totalPaid += paid; // This includes cash + financed (since financed means team treasury paid it)

                    let status: 'paid' | 'debt' | 'financed' = 'debt';
                    if (isFinanced) status = 'financed';
                    else if (paid >= expected) status = 'paid';

                    monthlyStatus.push({ month: curM, year: curY, expected, paid, status });
                }

                curM++;
                if (curM > 12) { curM = 1; curY++; }
            }

            return {
                totalExpected,
                totalPaid,
                totalDebt: Math.max(0, totalExpected - totalPaid),
                financedDebt,
                monthlyStatus: monthlyStatus.reverse()
            };
        };
    }, [allFees, payments, allHistoricalStatus]);

    const monthlyStats = useMemo(() => {
        const monthPayments = payments.filter(p => p.month === viewDate.month && p.year === viewDate.year);

        // Total Collected (Gross) includes EVERYTHING (cash + financed)
        const totalCollected = monthPayments.reduce((acc, p) => acc + Number(p.amount_total), 0);

        // Total Financed this month (to subtract from real cash flow)
        const totalFinancedThisMonth = monthPayments
            .filter(p => p.is_financed_by_team)
            .reduce((acc, p) => acc + Number(p.amount_total), 0);

        // Paid Count includes financed players
        const paidPlayersSet = new Set(
            monthPayments
                .filter(p => Number(p.amount_total) > 0)
                .map(p => p.player_id)
        );
        const paidCount = paidPlayersSet.size;

        const activoFeeObj = allFees.find(f => f.category === 'activo' && f.month === viewDate.month && f.year === viewDate.year);
        const activoFee = activoFeeObj ? Number(activoFeeObj.amount) : 0;

        let suggestedClubFee = 0;
        if (paidCount > 0) {
            if (paidCount < 16) {
                suggestedClubFee = paidCount * activoFee;
            } else {
                suggestedClubFee = (paidCount * activoFee) - activoFee;
            }
        }

        const clubClosing = clubClosings.find(c => c.month === viewDate.month && c.year === viewDate.year);

        // Real Savings = (Gross Collected - Financed) - Paid to Club
        // This reflects real cash flow.
        const amountPaidToClub = clubClosing ? Number(clubClosing.amount_paid) : 0;
        const currentCashSavings = clubClosing
            ? (clubClosing.collected_total - totalFinancedThisMonth - amountPaidToClub)
            : (totalCollected - totalFinancedThisMonth - suggestedClubFee);

        return {
            totalCollected,
            totalFinancedThisMonth,
            paidCount,
            suggestedClubFee,
            amountPaidToClub,
            hasClosed: !!clubClosing,
            notes: clubClosing?.notes || '',
            savings: currentCashSavings
        };
    }, [payments, allFees, viewDate, clubClosings]);

    const filteredPlayers = players.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = useMemo(() => {
        const totalDebt = players.reduce((acc, p) => acc + calculatePlayerAccount(p).totalDebt, 0);

        // Total Global Financed: All payments where is_financed_by_team = true and recharged_to_team = false
        const totalFinanced = payments
            .filter(p => p.is_financed_by_team && !p.reimbursed_to_team)
            .reduce((acc, p) => acc + Number(p.amount_total), 0);

        // Calculate Monthly Savings if Group Payment is active
        let monthlySavings = 0;
        if (monthlySettings?.is_group_payment) {
            const activeFee = allFees.find(f => f.category === 'activo' && f.month === viewDate.month && f.year === viewDate.year);
            monthlySavings = activeFee ? Number(activeFee.amount) : 0;
        }

        return { totalDebt, totalFinanced, monthlySavings };
    }, [players, payments, calculatePlayerAccount, monthlySettings, allFees, viewDate]);

    // Handle Month/Year Change
    const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => ({ val: i + 1, label: new Date(0, i).toLocaleString('es-AR', { month: 'long' }) }));

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    if (userRole !== 'admin') {
        return (
            <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mb-6 border border-red-500/20">
                    <ShieldAlert size={48} />
                </div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">ACCESO RESTRINGIDO</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md">Lo sentimos, no tienes los permisos de Administrador necesarios para acceder a la Tesorería del club.</p>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-fade-in bg-background-light dark:bg-background-dark min-h-screen">
            {/* Header */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-8">
                <div>
                    <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <Wallet className="text-primary" size={32} />
                        Tesorería & Cuenta Corriente
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Historial completo de pagos y auditoría debida del plantel.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    {/* Selectores de Período */}
                    <div className="flex items-center gap-2 bg-white dark:bg-card-dark p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <select
                            value={viewDate.month}
                            onChange={(e) => setViewDate({ ...viewDate, month: Number(e.target.value) })}
                            className="bg-transparent text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white outline-none cursor-pointer px-2"
                        >
                            {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                        </select>
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-800"></div>
                        <select
                            value={viewDate.year}
                            onChange={(e) => setViewDate({ ...viewDate, year: Number(e.target.value) })}
                            className="bg-transparent text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white outline-none cursor-pointer px-2"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setClubForm({
                                    amount_paid: monthlyStats.amountPaidToClub ? monthlyStats.amountPaidToClub.toString() : monthlyStats.suggestedClubFee.toString(),
                                    notes: monthlyStats.notes
                                });
                                setIsClubModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-[#8CD696]/10 text-[#8CD696] px-5 py-3 rounded-xl font-display font-bold uppercase tracking-wider hover:bg-[#8CD696]/20 transition-all border border-[#8CD696]/20"
                        >
                            <DollarSign size={20} />
                            Cierre de Mes
                        </button>
                        <button
                            onClick={() => setIsConfigModalOpen(true)}
                            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white px-5 py-3 rounded-xl font-display font-bold uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
                        >
                            <Settings size={20} />
                            Config. Cuotas
                        </button>
                        <button
                            onClick={() => {
                                setPaymentForm({
                                    player_id: '',
                                    amount: '',
                                    month: new Date().getMonth() + 1,
                                    year: new Date().getFullYear(),
                                    date: new Date().toISOString().split('T')[0],
                                    financed: false
                                });
                                setEditingPaymentId(null);
                                setIsPaymentModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-primary text-secondary px-6 py-3 rounded-xl font-display font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            <Plus size={20} strokeWidth={3} />
                            Cargar Pago
                        </button>
                    </div>
                </div>
            </header>

            {/* Global Account Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="bg-white dark:bg-card-dark p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                    <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Total Recaudado</p>
                    <h3 className="text-3xl font-display font-black text-gray-900 dark:text-white tracking-tight">{formatCurrency(monthlyStats.totalCollected)}</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-400">
                        <User size={14} className="text-primary" />
                        <span>{monthlyStats.paidCount} jugadores pagaron este mes.</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-card-dark p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                    <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Costo Club</p>
                    <h3 className="text-3xl font-display font-black text-red-500 tracking-tight">{formatCurrency(monthlyStats.amountPaidToClub || monthlyStats.suggestedClubFee)}</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-400">
                        <TrendingUp size={14} className="text-red-500" />
                        <span>{monthlyStats.hasClosed ? 'Pago mensual al Club confirmado.' : 'Sugerencia según recaudación.'}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-card-dark p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                    <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Ahorro Outlet FC</p>
                    <h3 className={`text-3xl font-display font-black tracking-tight ${monthlyStats.savings > 0 ? 'text-[#8CD696]' : 'text-gray-400'}`}>
                        {formatCurrency(monthlyStats.savings)}
                    </h3>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-400">
                        <CheckCircle2 size={14} className={monthlyStats.savings > 0 ? "text-[#8CD696]" : "text-gray-300"} />
                        <span>Ahorro del Mes.</span>
                    </div>
                </div>

                <div className="bg-[#FBBF24] p-8 rounded-[2.5rem] shadow-xl text-secondary relative overflow-hidden">
                    <div className="bg-white/20 w-32 h-32 absolute -top-10 -right-10 rounded-full blur-3xl"></div>
                    <p className="text-secondary/60 text-[10px] font-black uppercase tracking-[0.3em] mb-3 text-amber-900">Total Global Financiado</p>
                    <h3 className="text-3xl font-display font-black text-secondary tracking-tight">
                        {formatCurrency(stats.totalFinanced)}
                    </h3>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-900/40">
                        <Wallet size={14} className="text-amber-900" />
                        <span>Dinero adelantado por el equipo.</span>
                    </div>
                </div>
            </div>

            {/* Players Table */}
            <div className="bg-white dark:bg-card-dark rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/50 dark:bg-transparent">
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => setActiveTab('accounts')}
                            className={`text-2xl font-display font-bold uppercase tracking-tight pb-2 border-b-4 transition-all ${activeTab === 'accounts' ? 'text-gray-900 dark:text-white border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                        >
                            Estado de Cuenta
                        </button>
                        <button
                            onClick={() => setActiveTab('financing')}
                            className={`text-2xl font-display font-bold uppercase tracking-tight pb-2 border-b-4 transition-all ${activeTab === 'financing' ? 'text-gray-900 dark:text-white border-[#FBBF24]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                        >
                            Seguimiento de Financiación
                        </button>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Filtrar jugador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {activeTab === 'accounts' ? (
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/40 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    <th className="px-8 py-5 text-left">Jugador</th>
                                    <th className="px-8 py-5 text-center">Estado del Mes</th>
                                    <th className="px-8 py-5 text-right">Monto a Pagar</th>
                                    <th className="px-8 py-5 text-right">Pagado</th>
                                    <th className="px-8 py-5 text-right text-orange-500">Saldo Pendiente</th>
                                    {viewDate.month === new Date().getMonth() + 1 && viewDate.year === new Date().getFullYear() && (
                                        <th className="px-8 py-5 text-right text-red-500">Deuda Total</th>
                                    )}
                                    <th className="px-8 py-5 text-right text-amber-500">Deuda Interna</th>
                                    <th className="px-8 py-5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {filteredPlayers.map(player => {
                                    const account = calculatePlayerAccount(player);
                                    const currentStatus = account.monthlyStatus.find(s => s.month === viewDate.month && s.year === viewDate.year);

                                    return (
                                        <tr key={player.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary transition-all shadow-sm">
                                                        {player.avatar_url ? (
                                                            <img src={player.avatar_url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="text-gray-400" size={24} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="block font-display font-bold text-lg text-gray-900 dark:text-white uppercase tracking-tight">{player.full_name}</span>
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{player.role}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                {!currentStatus ? (
                                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">N/A</span>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-black ${currentStatus.status === 'paid' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                                                            currentStatus.status === 'financed' ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' :
                                                                'text-red-500 bg-red-50 dark:bg-red-900/20'
                                                            } px-4 py-1.5 rounded-full uppercase tracking-widest border ${currentStatus.status === 'paid' ? 'border-green-200/50' :
                                                                currentStatus.status === 'financed' ? 'border-amber-200/50' : 'border-red-200/50'
                                                            }`}>
                                                            {currentStatus.status === 'paid' ? 'Al Día' : currentStatus.status === 'financed' ? 'Financiado por Equipo' : 'Deudor'}
                                                        </span>
                                                        <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                                                            {allHistoricalStatus.find(s => s.player_id === player.id && s.month === viewDate.month && s.year === viewDate.year)?.status || player.status || 'activo'}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-right font-display font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(currentStatus?.expected || 0)}
                                            </td>
                                            <td className="px-8 py-6 text-right font-display font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(currentStatus?.paid || 0)}
                                            </td>
                                            <td className="px-8 py-6 text-right font-display font-bold text-orange-500">
                                                {formatCurrency(currentStatus ? Math.max(0, currentStatus.expected - currentStatus.paid) : 0)}
                                            </td>
                                            {viewDate.month === new Date().getMonth() + 1 && viewDate.year === new Date().getFullYear() && (
                                                <td className="px-8 py-6 text-right font-display font-black text-red-500 text-xl">
                                                    {formatCurrency(account.totalDebt)}
                                                </td>
                                            )}
                                            <td className="px-8 py-6 text-right font-display font-bold text-amber-500">
                                                {formatCurrency(
                                                    payments
                                                        .filter(p => p.player_id === player.id && p.month === viewDate.month && p.year === viewDate.year && p.is_financed_by_team)
                                                        .reduce((acc, p) => acc + Number(p.amount_total), 0)
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const pForm = {
                                                                player_id: player.id,
                                                                amount: (currentStatus ? Math.max(0, currentStatus.expected - currentStatus.paid) : 0).toString(),
                                                                month: viewDate.month,
                                                                year: viewDate.year,
                                                                date: new Date().toISOString().split('T')[0],
                                                                financed: false
                                                            };
                                                            setPaymentForm(pForm);
                                                            setEditingPaymentId(null);
                                                            setIsPaymentModalOpen(true);
                                                        }}
                                                        className="bg-[#8CD696]/20 p-3 rounded-xl text-[#8CD696] hover:bg-[#8CD696]/30 transition-all shadow-sm"
                                                        title="Cargar pago de este mes"
                                                    >
                                                        <DollarSign size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedPlayerForDetail(player)}
                                                        className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl text-gray-500 hover:text-primary hover:bg-primary/10 transition-all shadow-sm"
                                                        title="Ver Historial"
                                                    >
                                                        <History size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/40 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    <th className="px-8 py-5 text-left">Jugador</th>
                                    <th className="px-8 py-5 text-left">Mes Financiado</th>
                                    <th className="px-8 py-5 text-right">Monto</th>
                                    <th className="px-8 py-5 text-center">Fecha Financiación</th>
                                    <th className="px-8 py-5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {payments
                                    .filter(p => p.is_financed_by_team && !p.reimbursed_to_team)
                                    .filter(p => players.find(player => player.id === p.player_id)?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(payment => {
                                        const player = players.find(p => p.id === payment.player_id);
                                        return (
                                            <tr key={payment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700">
                                                            {player?.avatar_url ? (
                                                                <img src={player.avatar_url} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="text-gray-400" size={20} />
                                                            )}
                                                        </div>
                                                        <span className="font-display font-bold text-gray-900 dark:text-white uppercase tracking-tight">{player?.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-left">
                                                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                                                        {new Date(0, payment.month - 1).toLocaleString('es-AR', { month: 'long' })} {payment.year}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right font-display font-black text-amber-500 text-lg">
                                                    {formatCurrency(payment.amount_total)}
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200/50">
                                                            Pendiente de Devolución
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-400">
                                                            Financiado el {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('es-AR') : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <button
                                                        onClick={() => handleMarkAsReimbursed(payment.id)}
                                                        className="bg-green-500/10 text-green-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all border border-green-500/20"
                                                    >
                                                        Marcar como Devuelto
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                {payments.filter(p => p.is_financed_by_team && !p.reimbursed_to_team).length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <CheckCircle2 size={48} />
                                                <p className="font-display font-bold uppercase tracking-widest text-xl">No hay deudas internas pendientes</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal: Detalle de Cuenta Corriente */}
            <BottomSheet
                isOpen={!!selectedPlayerForDetail}
                onClose={() => setSelectedPlayerForDetail(null)}
                title="Estado de Cuenta"
            >
                {selectedPlayerForDetail && (
                    <>
                        <div className="flex items-center gap-6 mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 bg-gray-200 dark:bg-gray-800 flex-shrink-0">
                                {selectedPlayerForDetail.avatar_url ? (
                                    <img src={selectedPlayerForDetail.avatar_url} className="w-full h-full object-cover" />
                                ) : <User className="text-gray-400 m-auto w-8 h-8 mt-4" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight">{selectedPlayerForDetail.full_name}</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Socio desde: {new Date(selectedPlayerForDetail.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-3xl border border-red-100 dark:border-red-900/20">
                                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Deuda Acumulada</p>
                                <h4 className="text-2xl font-display font-black text-red-500">{formatCurrency(calculatePlayerAccount(selectedPlayerForDetail).totalDebt)}</h4>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-3xl border border-blue-100 dark:border-blue-900/20">
                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Pagos Financiados</p>
                                <h4 className="text-2xl font-display font-black text-blue-500">{formatCurrency(calculatePlayerAccount(selectedPlayerForDetail).financedDebt)}</h4>
                            </div>
                        </div>

                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Historial Mensual</h5>
                        <div className="space-y-3">
                            {calculatePlayerAccount(selectedPlayerForDetail).monthlyStatus.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl group hover:bg-white dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${s.status === 'paid' ? 'bg-green-100 text-green-600' :
                                            s.status === 'financed' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-500'
                                            }`}>
                                            {s.month < 10 ? `0${s.month}` : s.month}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-gray-900 dark:text-white tracking-widest">
                                                {new Date(0, s.month - 1).toLocaleString('es-AR', { month: 'long' })} {s.year}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Cuota Esperada: {formatCurrency(s.expected)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-black ${s.status === 'paid' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                                            {s.status === 'paid' ? formatCurrency(s.paid) : `Debe ${formatCurrency(s.expected - s.paid)}`}
                                        </p>
                                        <div className="flex items-center justify-end gap-2">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${s.status === 'paid' ? 'text-green-500' :
                                                s.status === 'financed' ? 'text-blue-500' : 'text-red-500'
                                                }`}>
                                                {s.status === 'paid' ? 'Completado' : s.status === 'financed' ? 'Financiado' : 'Pendiente'}
                                            </span>
                                            {s.paid > 0 && (
                                                <div className="flex gap-1">
                                                    {payments
                                                        .filter(p => p.player_id === selectedPlayerForDetail.id && p.month === s.month && p.year === s.year)
                                                        .map(p => (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => handleEditPayment(p)}
                                                                className="text-gray-400 hover:text-primary transition-colors p-1"
                                                            >
                                                                <Pencil size={12} />
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </BottomSheet>

            {/* Modal: Configuración de Cuotas */}
            <BottomSheet
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                title={`Cuotas ${viewDate.month}/${viewDate.year}`}
            >
                <form onSubmit={handleSaveConfig} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        {Object.keys(configForm).map((cat) => (
                            <div key={cat}>
                                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Valor {cat}</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="number"
                                        value={configForm[cat as keyof typeof configForm]}
                                        onChange={(e) => setConfigForm({ ...configForm, [cat]: Number(e.target.value) })}
                                        className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all font-black text-lg shadow-inner"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <label className="flex items-center gap-3 cursor-pointer group p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary/30 transition-all">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={configGroupPayment}
                                    onChange={(e) => setConfigGroupPayment(e.target.checked)}
                                    className="w-6 h-6 rounded-lg border-2 border-gray-200 dark:border-gray-800 appearance-none checked:bg-primary checked:border-primary transition-all"
                                />
                                {configGroupPayment && <CheckCircle2 className="absolute top-0.5 left-0.5 text-secondary" size={20} />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors">Pago Grupal al Club</span>
                                <span className="text-[10px] text-gray-400 font-medium">Si se activa, el equipo ahorra 1 cuota "Activo".</span>
                            </div>
                        </label>
                    </div>
                    <button type="submit" className="w-full bg-primary text-secondary font-display font-black text-xl py-5 rounded-[2rem] uppercase tracking-[0.2em] shadow-xl shadow-primary/30 mt-4 hover:scale-[1.02] active:scale-95 transition-all">
                        <span className="flex items-center justify-center gap-2">
                            <Save size={20} /> Guardar
                        </span>
                    </button>
                </form>
            </BottomSheet>

            {/* Modal: Cargar Pago */}
            <BottomSheet
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title={editingPaymentId ? 'Editar Cobro' : 'Cargar Pago'}
            >
                <form onSubmit={handleSavePayment} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Jugador a Imputar</label>
                        <select
                            required
                            value={paymentForm.player_id}
                            onChange={(e) => setPaymentForm({ ...paymentForm, player_id: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none font-bold text-sm appearance-none shadow-inner"
                        >
                            <option value="">Seleccionar Jugador...</option>
                            {players.map(p => (
                                <option key={p.id} value={p.id}>{p.full_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Monto Recibido</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="number"
                                    required
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-4 text-gray-800 dark:text-white font-black text-lg shadow-inner"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Fecha</label>
                            <input
                                type="date"
                                value={paymentForm.date}
                                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-gray-800 dark:text-white font-bold shadow-inner"
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Mes de Imputación</label>
                            <select
                                value={paymentForm.month}
                                onChange={(e) => setPaymentForm({ ...paymentForm, month: Number(e.target.value) })}
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-gray-800 dark:text-white font-bold shadow-inner"
                            >
                                {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col justify-center">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={paymentForm.financed}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, financed: e.target.checked })}
                                        className="w-6 h-6 rounded-lg border-2 border-gray-200 dark:border-gray-800 appearance-none checked:bg-primary checked:border-primary transition-all"
                                    />
                                    {paymentForm.financed && <CheckCircle2 className="absolute top-0.5 left-0.5 text-secondary" size={20} />}
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Financiado</span>
                            </label>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-[#8CD696] text-secondary font-display font-black text-xl py-5 rounded-[2rem] uppercase tracking-[0.2em] shadow-xl shadow-[#8CD696]/30 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                    >
                        Confirmar Cobro
                    </button>
                </form>
            </BottomSheet>

            {/* Modal: Cierre Mensual al Club */}
            <BottomSheet
                isOpen={isClubModalOpen}
                onClose={() => setIsClubModalOpen(false)}
                title={`Cierre ${viewDate.month}/${viewDate.year}`}
            >
                <form onSubmit={handleSaveClubClosing} className="space-y-8">
                    <div className="bg-gray-50 dark:bg-gray-900/30 p-6 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 shadow-inner">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Análisis</p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-500 uppercase tracking-tighter">Bruto:</span>
                                <span className="font-black text-gray-900 dark:text-white">{formatCurrency(monthlyStats.totalCollected)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-amber-600 uppercase tracking-tighter">Financiado:</span>
                                <span className="font-black text-amber-600">-{formatCurrency(monthlyStats.totalFinancedThisMonth)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                                <span className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-tighter">Cash Real:</span>
                                <span className="text-sm font-black text-[#8CD696]">{formatCurrency(monthlyStats.totalCollected - monthlyStats.totalFinancedThisMonth)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Pago Final Club</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="number"
                                    required
                                    value={clubForm.amount_paid}
                                    onChange={(e) => setClubForm({ ...clubForm, amount_paid: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-4 text-gray-800 dark:text-white font-black text-lg shadow-inner"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Notas</label>
                            <textarea
                                value={clubForm.notes}
                                onChange={(e) => setClubForm({ ...clubForm, notes: e.target.value })}
                                rows={3}
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-gray-800 dark:text-white font-medium text-sm shadow-inner resize-none"
                                placeholder="..."
                            ></textarea>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSavingClub}
                        className="w-full bg-secondary text-white font-display font-black text-xl py-5 rounded-[2rem] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSavingClub ? <Loader2 className="animate-spin" size={24} /> : 'Confirmar Cierre'}
                    </button>
                </form>
            </BottomSheet>
        </div>
    );
};

export default Treasury;