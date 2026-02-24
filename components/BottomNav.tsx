import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    CircleDollarSign,
    UserCircle,
    BarChart3,
    MoreHorizontal,
    Users,
    CalendarDays,
    X,
    Settings
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export const BottomNav: React.FC = () => {
    const { userRole } = useAuth();
    const isAdminOrDT = userRole === 'admin' || userRole === 'dt';
    const [showMore, setShowMore] = useState(false);
    const navigate = useNavigate();

    const handleAdminNav = (path: string) => {
        setShowMore(false);
        navigate(path);
    };

    return (
        <>
            {/* Admin "Más" overlay */}
            {showMore && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] lg:hidden"
                        onClick={() => setShowMore(false)}
                    />
                    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-card-dark rounded-t-[2rem] z-[80] lg:hidden animate-slide-up shadow-2xl pb-safe">
                        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-white">Gestión</h3>
                            <button
                                onClick={() => setShowMore(false)}
                                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-4 py-4 space-y-2">
                            <AdminMenuItem
                                icon={<Users size={22} />}
                                label="Gestión de Plantel"
                                desc="Jugadores, roles y estados"
                                onClick={() => handleAdminNav('/squad')}
                            />
                            <AdminMenuItem
                                icon={<CalendarDays size={22} />}
                                label="Gestión de Partidos"
                                desc="Crear, editar y gestionar fechas"
                                onClick={() => handleAdminNav('/admin')}
                            />
                            <AdminMenuItem
                                icon={<CircleDollarSign size={22} />}
                                label="Tesorería"
                                desc="Cuotas, pagos y cierres"
                                onClick={() => handleAdminNav('/treasury')}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-card-dark border-t border-gray-200 dark:border-gray-800 px-4 pb-safe pt-2 z-[60] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                <div className="flex justify-around items-center h-14 max-w-md mx-auto">
                    <BottomNavItem
                        to={isAdminOrDT ? "/panel-control" : "/"}
                        icon={<LayoutDashboard size={22} />}
                        label="Home"
                    />

                    <BottomNavItem
                        to="/tactics"
                        icon={<ShieldIcon size={22} />}
                        label="Pizarra"
                    />

                    <BottomNavItem
                        to="/rankings"
                        icon={<BarChart3 size={22} />}
                        label="Rankings"
                    />

                    <BottomNavItem
                        to="/mi-panel"
                        icon={<UserCircle size={22} />}
                        label="Yo"
                    />

                    {isAdminOrDT && (
                        <button
                            onClick={() => setShowMore(true)}
                            className={`flex flex-col items-center justify-center gap-1 transition-all text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300`}
                        >
                            <div className="transition-transform active:scale-90">
                                <MoreHorizontal size={22} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                Más
                            </span>
                        </button>
                    )}
                </div>
            </nav>
        </>
    );
};

interface BottomNavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
}

const BottomNavItem: React.FC<BottomNavItemProps> = ({ to, icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) => `
            flex flex-col items-center justify-center gap-1 transition-all
            ${isActive
                ? 'text-primary'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}
        `}
    >
        <div className="transition-transform active:scale-90">
            {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
            {label}
        </span>
    </NavLink>
);

interface AdminMenuItemProps {
    icon: React.ReactNode;
    label: string;
    desc: string;
    onClick: () => void;
}

const AdminMenuItem: React.FC<AdminMenuItemProps> = ({ icon, label, desc, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-[0.98] text-left"
    >
        <div className="p-3 bg-primary/10 rounded-xl text-primary flex-shrink-0">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-white">{label}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{desc}</p>
        </div>
    </button>
);

const ShieldIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
    </svg>
);
