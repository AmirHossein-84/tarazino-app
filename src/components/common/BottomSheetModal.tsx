import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'max-w-lg',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef(0);
  const currentTranslateYRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      triggerHaptic('light');
      onClose();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;
    if (diff > 0 && sheetRef.current) {
      // Dragging downward
      currentTranslateYRef.current = diff;
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (currentTranslateYRef.current > 120) {
      triggerHaptic('medium');
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(0px)';
    }
    currentTranslateYRef.current = 0;
  };

  const modalContent = (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] max-h-[90dvh] flex flex-col transition-transform duration-200 ease-out`}
      >
        {/* Mobile Drag Handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing sm:hidden shrink-0"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700/80" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-gold-500/15 border border-amber-200 dark:border-gold-500/30 flex items-center justify-center text-amber-700 dark:text-gold-400 shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 transition-all touch-target shrink-0"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className={`p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 ${footer ? 'pb-4' : 'pb-[max(2rem,env(safe-area-inset-bottom))]'}`}>
          {children}
        </div>

        {/* Optional Fixed Bottom Footer */}
        {footer && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
