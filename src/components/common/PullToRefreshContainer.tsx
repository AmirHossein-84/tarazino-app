import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

type PtrPhase = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'settling';

interface PullToRefreshContainerProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  pullThreshold?: number;
  disabled?: boolean;
  isRefreshing?: boolean;
  className?: string;
}

const DEADZONE_PX = 6;
const MAX_PULL_PX = 104;
const SPRING_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

function isGestureBlockedByTarget(
  target: EventTarget | null,
  boundary: HTMLElement | null
): boolean {
  if (!(target instanceof HTMLElement)) return false;

  // Never intercept interactions inside open dialogs/modals, inputs, sliders, or explicit opt-outs
  if (
    target.closest(
      '[role="dialog"], [aria-modal="true"], [data-ptr-ignore], input, textarea, select, [contenteditable="true"]'
    )
  ) {
    return true;
  }

  // Also avoid engaging if any visible modal backdrop overlay is mounted in document.body
  if (typeof document !== 'undefined' && document.querySelector('[data-modal-open="true"]')) {
    return true;
  }

  let el: HTMLElement | null = target;
  while (el && el !== boundary) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight + 2 &&
      el.scrollTop > 1
    ) {
      return true;
    }
    const overflowX = style.overflowX;
    if (
      (overflowX === 'auto' || overflowX === 'scroll') &&
      el.scrollWidth > el.clientWidth + 2 &&
      el.dataset.ptrAllowHorizontal !== 'true'
    ) {
      // Let horizontal scrollers handle touch events unless scrollLeft won't absorb horizontal drags
      // Horizontal vs vertical axis lock below handles the direction decisively.
    }
    el = el.parentElement;
  }

  return false;
}

export const PullToRefreshContainer: React.FC<PullToRefreshContainerProps> = ({
  onRefresh,
  children,
  pullThreshold = 65,
  disabled = false,
  isRefreshing: externalRefreshing = false,
  className = '',
}) => {
  const [phase, setPhase] = useState<PtrPhase>('idle');

  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const phaseRef = useRef<PtrPhase>('idle');
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const pullDistanceRef = useRef<number>(0);
  const draggingRef = useRef<boolean>(false);
  const axisLockRef = useRef<'none' | 'vertical' | 'horizontal'>('none');
  const thresholdCrossedRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setPhaseSync = useCallback((next: PtrPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const applyVisualDisplacement = useCallback(
    (distance: number, animate: boolean) => {
      const reduced = prefersReducedMotion();
      const useAnim = animate && !reduced;
      const contentEl = contentRef.current;
      const indicatorEl = indicatorRef.current;
      const pillEl = pillRef.current;
      const iconEl = iconRef.current;

      const clamped = Math.max(0, Math.min(distance, MAX_PULL_PX));
      const progress = Math.min(clamped / pullThreshold, 1);

      if (contentEl) {
        contentEl.style.transition = useAnim
          ? `transform 300ms ${SPRING_EASING}`
          : 'none';
        contentEl.style.transform = `translate3d(0, ${clamped}px, 0)`;
        contentEl.style.willChange = clamped > 0 || animate ? 'transform' : 'auto';
      }

      if (indicatorEl) {
        indicatorEl.style.transition = useAnim
          ? `transform 300ms ${SPRING_EASING}, opacity 200ms ease`
          : 'none';
        const indicatorOffset = Math.max(-48, Math.min(clamped - 44, 18));
        indicatorEl.style.transform = `translate3d(0, ${indicatorOffset}px, 0)`;
        indicatorEl.style.opacity = clamped > 4 || phaseRef.current === 'refreshing' ? '1' : '0';
      }

      if (pillEl) {
        pillEl.style.transform = `scale(${0.88 + progress * 0.12})`;
      }

      if (iconEl && phaseRef.current !== 'refreshing') {
        iconEl.style.transform = `rotate(${clamped * 4}deg)`;
      }
    },
    [pullThreshold]
  );

  const scheduleFrameUpdate = useCallback(
    (distance: number) => {
      pullDistanceRef.current = distance;
      if (rafIdRef.current !== null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        applyVisualDisplacement(pullDistanceRef.current, false);
      });
    },
    [applyVisualDisplacement]
  );

  const settleToIdle = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
    }
    setPhaseSync('settling');
    pullDistanceRef.current = 0;
    thresholdCrossedRef.current = false;
    applyVisualDisplacement(0, true);

    const delay = prefersReducedMotion() ? 20 : 310;
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      applyVisualDisplacement(0, false);
      setPhaseSync('idle');
    }, delay);
  }, [applyVisualDisplacement, setPhaseSync]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled) return;
      if (phaseRef.current === 'refreshing' || phaseRef.current === 'settling') return;
      if (e.touches.length !== 1) return;
      if (window.scrollY > 2) return;
      if (isGestureBlockedByTarget(e.target, el)) return;

      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      pullDistanceRef.current = 0;
      axisLockRef.current = 'none';
      thresholdCrossedRef.current = false;
      draggingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current || disabled) return;
      if (phaseRef.current === 'refreshing') return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      if (axisLockRef.current === 'none') {
        const dist = Math.hypot(dx, dy);
        if (dist < DEADZONE_PX) return;

        // Horizontal drags or upward scroll immediately yield cleanly to native scrolling
        if (Math.abs(dx) >= Math.abs(dy) || dy <= 0 || window.scrollY > 2) {
          axisLockRef.current = 'horizontal';
          draggingRef.current = false;
          return;
        }
        axisLockRef.current = 'vertical';
        setPhaseSync('pulling');
      }

      if (axisLockRef.current !== 'vertical') return;

      if (dy <= DEADZONE_PX) {
        scheduleFrameUpdate(0);
        if (phaseRef.current !== 'idle') {
          setPhaseSync('idle');
        }
        return;
      }

      if (e.cancelable) {
        e.preventDefault();
      }

      const effectiveDrag = dy - DEADZONE_PX;
      const damped = MAX_PULL_PX * (1 - Math.exp(-effectiveDrag / 130));
      scheduleFrameUpdate(damped);

      const reachedReady = damped >= pullThreshold;
      if (reachedReady && !thresholdCrossedRef.current) {
        thresholdCrossedRef.current = true;
        triggerHaptic('light');
        setPhaseSync('ready');
      } else if (!reachedReady && thresholdCrossedRef.current) {
        thresholdCrossedRef.current = false;
        setPhaseSync('pulling');
      }
    };

    const handleTouchEnd = async () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;

      if (axisLockRef.current !== 'vertical') {
        axisLockRef.current = 'none';
        return;
      }
      axisLockRef.current = 'none';

      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      const finalPull = pullDistanceRef.current;
      if (finalPull >= pullThreshold && !disabled) {
        setPhaseSync('refreshing');
        triggerHaptic('medium');
        pullDistanceRef.current = 58;
        applyVisualDisplacement(58, true);

        try {
          await onRefreshRef.current();
        } catch (err) {
          console.error('PTR refresh error:', err);
        } finally {
          settleToIdle();
        }
      } else {
        settleToIdle();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [
    disabled,
    pullThreshold,
    applyVisualDisplacement,
    scheduleFrameUpdate,
    setPhaseSync,
    settleToIdle,
  ]);

  const isRefreshing = phase === 'refreshing' || externalRefreshing;
  const isReady = phase === 'ready';

  return (
    <div ref={containerRef} className={`relative min-h-screen overscroll-y-contain ${className}`}>
      {/* GPU-composited Pull-To-Refresh Pill Indicator */}
      <div
        ref={indicatorRef}
        aria-hidden={phase === 'idle' && !isRefreshing}
        style={{
          transform: isRefreshing ? 'translate3d(0, 12px, 0)' : 'translate3d(0, -48px, 0)',
          opacity: isRefreshing ? 1 : 0,
        }}
        className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-0 right-0 z-30 flex items-center justify-center pointer-events-none"
      >
        <div
          ref={pillRef}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 shadow-lg text-xs font-bold text-slate-700 dark:text-slate-300"
        >
          <div ref={iconRef}>
            <RefreshCw
              className={`w-4 h-4 text-amber-600 dark:text-gold-400 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            />
          </div>
          <span>
            {isRefreshing
              ? 'در حال به‌روزرسانی اطلاعات...'
              : isReady
              ? 'رها کنید تا به‌روزرسانی شود'
              : 'به پایین بکشید'}
          </span>
        </div>
      </div>

      {/* Main Content Translated via GPU translate3d */}
      <div ref={contentRef}>{children}</div>
    </div>
  );
};
