import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Shield,
    CircleDollarSign,
    UserCircle,
    BarChart3
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export const BottomNav: React.FC = () => {
    const { userRole } = useAuth();
    const isAdminOrDT = userRole === 'admin' || userRole === 'dt';

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-card-dark border-t border-gray-200 dark:border-gray-800 px-6 pb-safe pt-2 z-[60] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center h-14 max-w-md mx-auto">
                <BottomNavItem
                    to={isAdminOrDT ? "/panel-control" : "/"}
                    icon={<LayoutDashboard size={24} />}
                    label="Home"
                />

                <BottomNavItem
                    to="/tactics"
                    icon={<ShieldIcon size={24} />}
                    label="Pizarra"
                />

                {isAdminOrDT && (
                    <BottomNavItem
                        to="/treasury"
                        icon={<CircleDollarSign size={24} />}
                        label="Caja"
                    />
                )}

                <BottomNavItem
                    to="/rankings"
                    icon={<BarChart3 size={24} />}
                    label="Rankings"
                />

                <BottomNavItem
                    to="/mi-panel"
                    icon={<UserCircle size={24} />}
                    label="Yo"
                />
            </div>
        </nav>
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

const ShieldIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
    </svg>
);
