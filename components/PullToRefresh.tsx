import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const pullThreshold = 80;

    // Find the nearest scrollable ancestor (the <main> tag)
    const getScrollParent = (): number => {
        let el: HTMLElement | null = wrapperRef.current?.parentElement ?? null;
        while (el) {
            const style = window.getComputedStyle(el);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                return el.scrollTop;
            }
            el = el.parentElement;
        }
        return 0;
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const scrollTop = getScrollParent();
        if (scrollTop === 0) {
            startY.current = e.touches[0].pageY;
        } else {
            startY.current = -1;
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (startY.current === -1 || isRefreshing) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        if (diff > 0 && getScrollParent() === 0) {
            const distance = Math.min(diff * 0.4, pullThreshold + 20);
            setPullDistance(distance);
        } else if (diff <= 0) {
            setPullDistance(0);
        }
    }, [isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance > pullThreshold && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(pullThreshold);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }
        setPullDistance(0);
    }, [pullDistance, isRefreshing, onRefresh]);

    return (
        <div
            ref={wrapperRef}
            className="pull-to-refresh-content w-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className="flex items-center justify-center bg-primary/10 overflow-hidden transition-all duration-200"
                style={{
                    height: pullDistance > 0 ? `${pullDistance}px` : '0px',
                    opacity: pullDistance / pullThreshold,
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
