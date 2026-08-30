import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface PullToRefreshContainerProps {
  onRefresh: () => Promise<void> | void;
  isRefreshing?: boolean;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number;
}

export const PullToRefreshContainer: React.FC<PullToRefreshContainerProps> = ({
  onRefresh,
  isRefreshing: externalIsRefreshing = false,
  children,
  className = '',
  pullThreshold = 65,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isRefreshing = externalIsRefreshing || internalRefreshing;

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow pull to refresh when scrolled to the very top
    if (window.scrollY <= 2 && !isRefreshing) {
      touchStartYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;

    if (diff > 0 && window.scrollY <= 2) {
      // Damped pull distance curve
      const damped = Math.min(diff * 0.45, 90);
      setPullDistance(damped);

      // Trigger light haptic when crossing threshold
      if (damped >= pullThreshold && pullDistance < pullThreshold) {
        triggerHaptic('light');
      }
    } else {
      isPullingRef.current = false;
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= pullThreshold && !isRefreshing) {
      triggerHaptic('medium');
      setInternalRefreshing(true);
      setPullDistance(45); // Keep spinner visible during refresh

      try {
        await onRefresh();
      } catch (err) {
        console.error('Pull to refresh failed:', err);
      } finally {
        setInternalRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  // Reset pull distance when external refresh finishes
  useEffect(() => {
    if (!externalIsRefreshing && !internalRefreshing) {
      setPullDistance(0);
    }
  }, [externalIsRefreshing, internalRefreshing]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative min-h-full ${className}`}
    >
      {/* Pull Indicator Area */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 10 ? Math.min(pullDistance / pullThreshold, 1) : 0,
        }}
      >
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-md">
          <RefreshCw
            className={`w-3.5 h-3.5 text-amber-600 dark:text-gold-400 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${pullDistance * 4}deg)`,
            }}
          />
          <span>
            {isRefreshing
              ? 'در حال به‌روزرسانی اطلاعات...'
              : pullDistance >= pullThreshold
              ? 'رها کنید تا به‌روزرسانی شود'
              : 'به پایین بکشید'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
};
