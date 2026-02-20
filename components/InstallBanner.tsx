import React, { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

export const InstallBanner: React.FC = () => {
    const { isInstallable, triggerInstall } = usePWAInstall();
    const [dismissed, setDismissed] = useState(false);

    // Only render if the browser fired 'beforeinstallprompt' and user hasn't dismissed
    if (!isInstallable || dismissed) return null;

    return (
        <div
            className="relative flex items-center gap-4 p-4 rounded-[1.5rem] overflow-hidden border border-[#00FF9D]/20 shadow-lg shadow-[#00FF9D]/5 animate-fade-in"
            style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #0d1a2d 100%)' }}
        >
            {/* Glow blob */}
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-[#00FF9D]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -right-0 w-24 h-24 bg-[#00FF9D]/5 rounded-full blur-2xl pointer-events-none" />

            {/* Icon */}
            <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(0,255,157,0.12)', border: '1px solid rgba(0,255,157,0.2)' }}>
                <Smartphone size={22} style={{ color: '#00FF9D' }} />
            </div>

            {/* Text */}
            <div className="relative z-10 flex-1 min-w-0">
                <p className="text-white font-display font-black text-sm uppercase tracking-tight leading-tight">
                    Instalar App del Club
                </p>
                <p className="text-gray-400 text-[11px] font-medium mt-0.5">
                    Acceso rápido desde tu pantalla de inicio
                </p>
            </div>

            {/* Install Button */}
            <button
                id="pwa-install-btn"
                onClick={triggerInstall}
                className="relative z-10 flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 hover:brightness-110 shadow-lg"
                style={{
                    background: '#00FF9D',
                    color: '#0A0F1E',
                    boxShadow: '0 4px 20px rgba(0,255,157,0.35)',
                }}
            >
                <Download size={14} strokeWidth={3} />
                Instalar
            </button>

            {/* Dismiss Button */}
            <button
                id="pwa-dismiss-btn"
                onClick={() => setDismissed(true)}
                aria-label="Cerrar"
                className="relative z-10 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
            >
                <X size={16} />
            </button>
        </div>
    );
};
