import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);

    const pullThreshold = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].pageY;
        } else {
            startY.current = -1;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startY.current === -1 || isRefreshing) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        if (diff > 0 && containerRef.current?.scrollTop === 0) {
            // Apply resistance
            const distance = Math.min(diff * 0.4, pullThreshold + 20);
            setPullDistance(distance);
            if (distance > pullThreshold) {
                // e.preventDefault(); // Might need to be passive: false
            }
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance > pullThreshold && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(pullThreshold);
            await onRefresh();
            setIsRefreshing(false);
        }
        setPullDistance(0);
    };

    return (
        <div
            ref={containerRef}
            className="h-full overflow-y-auto pull-to-refresh-content custom-scrollbar"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div
                className="flex items-center justify-center bg-primary/10 overflow-hidden transition-all duration-200"
                style={{
                    height: pullDistance > 0 ? `${pullDistance}px` : '0px',
                    opacity: pullDistance / pullThreshold
                }}
            >
                <RefreshCw
                    size={24}
                    className={`text-primary transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
                    style={{ transform: `rotate(${pullDistance * 3}deg)` }}
                />
            </div>
            {children}
        </div>
    );
};
