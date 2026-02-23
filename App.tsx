import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Treasury from './pages/Treasury';
import Tactics from './pages/Tactics';
import MatchAdmin from './pages/MatchAdmin';
import Rankings from './pages/Rankings';
import SquadManagement from './pages/SquadManagement';
import Login from './pages/Login';
import PlayerDashboard from './pages/PlayerDashboard';
import { Moon, Sun, Loader2 } from 'lucide-react';
import MatchHistory from './pages/MatchHistory';
import { AuthProvider, useAuth } from './lib/AuthContext';

// 2. Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-dark text-primary">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

// 3. Admin/DT Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session, userRole, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-dark text-primary">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    if (userRole !== 'admin' && userRole !== 'dt') {
        return <Navigate to="/mi-panel" replace />;
    }

    return <>{children}</>;
};

// 4. Root Redirect Component
const RootRedirect: React.FC = () => {
    const { session, userRole, loading } = useAuth();

    if (loading) return null;

    if (!session) return <Navigate to="/login" replace />;

    if (userRole === 'admin' || userRole === 'dt') {
        return <Navigate to="/panel-control" replace />;
    }

    return <Navigate to="/mi-panel" replace />;
};

// 5. Layout Component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const isLoginPage = location.pathname === '/login';

    if (isLoginPage) return <>{children}</>;

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-background-light dark:bg-background-dark overflow-hidden relative">
            {/* Background Blobs */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 dark:bg-primary/5 rounded-full blur-[120px] animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
                <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
            </div>

            <Sidebar />
            {/* min-h-0 is critical on Android: without it, flex children ignore overflow and expand past the screen */}
            <main className="flex-1 min-h-0 min-w-0 flex flex-col transition-all duration-300 relative z-10 pb-24 lg:pb-8 pt-safe overflow-y-auto">
                {children}
            </main>
            <BottomNav />
        </div>
    );
};

const ThemeToggle = () => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            setIsDark(true);
        }
    };

    return (
        <div className="fixed bottom-4 left-4 z-[60]">
            <button
                onClick={toggleTheme}
                className="bg-secondary dark:bg-white text-white dark:text-secondary p-3 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-transparent dark:border-gray-200"
            >
                {isDark ? <Sun size={24} /> : <Moon size={24} />}
            </button>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Router>
                <Layout>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={<RootRedirect />} />
                        <Route path="/panel-control" element={<AdminRoute><Dashboard /></AdminRoute>} />
                        <Route path="/mi-panel" element={<ProtectedRoute><PlayerDashboard /></ProtectedRoute>} />
                        <Route path="/treasury" element={<AdminRoute><Treasury /></AdminRoute>} />
                        <Route path="/tactics" element={<ProtectedRoute><Tactics /></ProtectedRoute>} />
                        <Route path="/admin" element={<AdminRoute><MatchAdmin /></AdminRoute>} />
                        <Route path="/rankings" element={<ProtectedRoute><Rankings /></ProtectedRoute>} />
                        <Route path="/squad" element={<AdminRoute><SquadManagement /></AdminRoute>} />
                        <Route path="/history" element={<ProtectedRoute><MatchHistory /></ProtectedRoute>} />
                    </Routes>
                </Layout>
                <ThemeToggle />
            </Router>
        </AuthProvider>
    );
};

export default App;