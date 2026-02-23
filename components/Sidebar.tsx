import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    CircleDollarSign,
    BarChart3,
    LogOut,
    Menu,
    X,
    Settings,
    UserCircle
} from 'lucide-react';
import { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const Sidebar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { session, userRole } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            if (session?.user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                setProfile(data);
            } else {
                setProfile(null);
            }
        };

        fetchProfile();
    }, [session]);

    const toggleSidebar = () => setIsOpen(!isOpen);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
            // Fallback navigate
            navigate('/login');
        }
    };

    return (
        <>
            {/* Sidebar is now hidden on mobile and only used with Bottom Nav */}

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
            fixed lg:sticky top-0 left-0 h-screen bg-card-light dark:bg-card-dark border-r border-gray-200 dark:border-gray-800 
            flex flex-col z-[80] transition-all duration-300 w-64
            ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
                {/* Logo Section */}
                <div className="h-20 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="relative w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden">
                        <img src="/icon-512x512.png" alt="Outlet FC" className="w-full h-full object-cover" />
                    </div>
                    <span className="ml-3 font-display font-bold text-xl tracking-tight text-gray-800 dark:text-white uppercase font-black">Outlet FC</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {(userRole === 'admin' || userRole === 'dt') && (
                        <NavItem to="/panel-control" icon={<LayoutDashboard size={20} />} label="Panel Control" onClick={() => setIsOpen(false)} />
                    )}

                    <NavItem to="/mi-panel" icon={<UserCircle size={20} />} label={userRole === 'player' ? "Mi Panel" : "Mi Perfil (Vista Jugador)"} onClick={() => setIsOpen(false)} />

                    <NavItem to="/tactics" icon={<Shield size={20} />} label="Pizarra Táctica" onClick={() => setIsOpen(false)} />

                    {(userRole === 'admin' || userRole === 'dt') && (
                        <>
                            <NavItem to="/squad" icon={<Users size={20} />} label="Gestión de Plantel" onClick={() => setIsOpen(false)} />
                            <NavItem to="/admin" icon={<CalendarDays size={20} />} label="Gestión Partidos" onClick={() => setIsOpen(false)} />
                            <NavItem to="/treasury" icon={<CircleDollarSign size={20} />} label="Tesorería" onClick={() => setIsOpen(false)} />
                        </>
                    )}

                    <NavItem to="/rankings" icon={<BarChart3 size={20} />} label="Rankings" onClick={() => setIsOpen(false)} />
                </nav>

                {/* Footer / User Profile */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    {profile && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" />
                                ) : <UserCircle className="text-gray-400" size={24} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">{profile.full_name}</p>
                                <p className="text-[9px] font-bold text-primary truncate uppercase tracking-widest">{profile.role}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest group"
                    >
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
    alert?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, alert, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) => `
            flex items-center px-4 py-3 rounded-xl group transition-all relative font-bold text-[10px] uppercase tracking-[0.1em]
            ${isActive
                ? 'bg-primary text-secondary shadow-lg shadow-primary/20'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }
        `}
    >
        <span className={`flex-shrink-0 transition-transform group-hover:scale-110`}>{icon}</span>
        <span className="ml-3 truncate">{label}</span>
        {alert && (
            <span className="ml-auto flex w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        )}
    </NavLink>
);

const Shield = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
    </svg>
);

