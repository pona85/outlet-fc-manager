import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
    isOpen,
    onClose,
    title,
    children
}) => {
    const [shouldRender, setShouldRender] = useState(isOpen);

    useEffect(() => {
        if (isOpen) setShouldRender(true);
    }, [isOpen]);

    const handleAnimationEnd = () => {
        if (!isOpen) setShouldRender(false);
    };

    if (!shouldRender) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Sheet/Modal */}
            <div
                onTransitionEnd={handleAnimationEnd}
                className={`
                    relative w-full max-w-lg bg-white dark:bg-card-dark shadow-2xl transition-transform duration-300 ease-out
                    lg:rounded-[2.5rem] lg:mb-0
                    rounded-t-[2.5rem] pb-safe
                    ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-full lg:scale-95 lg:translate-y-0'}
                `}
            >
                {/* Drag Indicator for Mobile */}
                <div className="lg:hidden w-full pt-4 pb-2 flex justify-center" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-8 py-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-display font-black text-gray-900 dark:text-white uppercase tracking-wider italic">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};
