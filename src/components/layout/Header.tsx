import React from 'react';
import { Sun, Moon, Shield, DollarSign } from 'lucide-react';
import { getPersianFormattedDate } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';

interface HeaderProps {
  isDark: boolean;
  toggleTheme: (origin?: { clientX?: number; clientY?: number }) => void;
  currencyMode?: CurrencyDisplayMode;
  toggleCurrencyMode?: () => void;
  userName?: string;
  userColor?: string;
  onOpenProfileSwitcher?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  toggleTheme,
  currencyMode = 'toman',
  toggleCurrencyMode,
  userName,
  userColor,
  onOpenProfileSwitcher,
}) => {
  const todayPersian = getPersianFormattedDate(new Date()).split('ساعت')[0];

  const handleToggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic('medium');
    toggleTheme({ clientX: e.clientX, clientY: e.clientY });
  };

  const handleToggleCurrency = () => {
    triggerHaptic('medium');
    toggleCurrencyMode?.();
  };

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-2xl bg-white/90 dark:bg-slate-950/85 border-b border-slate-200 dark:border-slate-800/80 transition-colors pt-[env(safe-area-inset-top)]">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 min-w-0">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0">
            <img
              src="/favicon.png"
              alt="لوگوی ترازینو"
              className="w-full h-full object-cover rounded-2xl shadow-md border border-slate-200 dark:border-slate-700/80"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-slate-100 truncate">
                <span className="gold-gradient-text font-black text-base sm:text-lg">ترازینو</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono tracking-wider mr-1 hidden sm:inline">(Tarazino)</span>
              </h1>
            </div>
            <div className="leading-tight min-w-0">
              {userName && (
                onOpenProfileSwitcher ? (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onOpenProfileSwitcher();
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-gold-300 transition-colors max-w-[160px] sm:max-w-[240px] truncate"
                    title="تغییر یا مدیریت حساب کاربری"
                  >
                    {userColor && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: userColor }}
                      />
                    )}
                    <span className="truncate">سلام، {userName} 👋</span>
                  </button>
                ) : (
                  <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[160px] sm:max-w-[240px]">
                    سلام، {userName} 👋
                  </span>
                )
              )}
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{todayPersian}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Currency Toggle Button (USD / Toman) */}
          {toggleCurrencyMode && (
            <button
              onClick={handleToggleCurrency}
              className={`px-3 py-2 rounded-2xl border text-xs font-black transition-all flex items-center gap-1.5 interactive-tap touch-target shadow-sm ${
                currencyMode === 'usd'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-500/50 dark:hover:bg-emerald-900/80 shadow-emerald-500/10'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-gold-600 dark:hover:text-gold-300 hover:border-gold-500/40'
              }`}
              title={currencyMode === 'usd' ? 'تغییر نمایش کل اپلیکیشن به تومان' : 'تغییر نمایش کل اپلیکیشن به دلار'}
            >
              {currencyMode === 'usd' ? (
                <>
                  <span className="text-[11px]">🪙</span>
                  <span>تومان</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>دلار</span>
                </>
              )}
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={handleToggleTheme}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-gold-600 dark:hover:text-gold-400 transition-all interactive-tap touch-target shadow-sm"
            aria-label="تغییر تم"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

        </div>

      </div>
    </header>
  );
};
