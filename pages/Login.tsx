import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LogIn, User, Lock, Loader2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (user) {
                // Fetch role to decide where to navigate
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single() as { data: { role: string } | null };

                if (profile && (profile.role === 'admin' || profile.role === 'dt')) {
                    navigate('/panel-control');
                } else {
                    navigate('/mi-panel');
                }
            } else {
                navigate('/');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[80px]"></div>

            <div className="w-full max-w-md animate-fade-in z-10">
                <div className="bg-secondary-light/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden p-10">
                    <div className="text-center mb-10">
                        {/* Logo Placeholder - If real logo exists, use <img src="/outlet.jpg" /> */}
                        <div className="w-24 h-24 rounded-3xl mx-auto mb-6 overflow-hidden shadow-lg shadow-primary/20 rotate-3">
                            <img src="/icon-512x512.png" alt="Outlet FC" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter mb-2">Ingresar al Club</h1>
                        <p className="text-gray-400 font-medium">Gestión de Jugadores Outlet FC</p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-start gap-3 animate-shake">
                            <ShieldAlert size={20} className="flex-shrink-0 mt-1" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Usuario / Email</label>
                            <div className="relative group">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ej: messi@outlet.com"
                                    className="w-full bg-secondary border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={20} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-secondary border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white placeholder:text-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-secondary font-display font-black text-2xl py-5 rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin m-auto" size={32} />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Entrar <LogIn size={24} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Outlet Fútbol Club &copy; 2026</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
