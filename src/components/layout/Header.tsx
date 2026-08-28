import React from 'react';
import { Sun, Moon, Shield, DollarSign } from 'lucide-react';
import { getPersianFormattedDate } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  currencyMode?: CurrencyDisplayMode;
  toggleCurrencyMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  toggleTheme,
  currencyMode = 'toman',
  toggleCurrencyMode,
}) => {
  const todayPersian = getPersianFormattedDate(new Date()).split('ساعت')[0];

  const handleToggleTheme = () => {
    triggerHaptic('medium');
    toggleTheme();
  };

  const handleToggleCurrency = () => {
    triggerHaptic('medium');
    toggleCurrencyMode?.();
  };

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-2xl bg-white/90 dark:bg-slate-950/85 border-b border-slate-200 dark:border-slate-800/80 transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center">
            <img
              src="/favicon.png"
              alt="لوگوی مدیریت سرمایه"
              className="w-full h-full object-cover rounded-2xl"
            />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                مدیریت سبد <span className="gold-gradient-text">طلا و کریپتو</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {todayPersian}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          
          {/* Currency Toggle Button (USD / Toman) */}
          {toggleCurrencyMode && (
            <button
              onClick={handleToggleCurrency}
              className={`px-3 py-2 rounded-2xl border text-xs font-black transition-all flex items-center gap-1.5 interactive-tap touch-target shadow-sm ${
                currencyMode === 'usd'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/80 shadow-emerald-500/10'
                  : 'bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:text-gold-500 dark:hover:text-gold-300 hover:border-gold-500/40'
              }`}
              title={currencyMode === 'usd' ? 'تغییر نمایش کل اپلیکیشن به تومان' : 'تغییر نمایش کل اپلیکیشن به دلار ($)'}
            >
              {currencyMode === 'usd' ? (
                <>
                  <span className="text-[11px]">🪙</span>
                  <span>تومان</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>دلار ($)</span>
                </>
              )}
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={handleToggleTheme}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-gold-500 dark:hover:text-gold-400 transition-all interactive-tap touch-target"
            aria-label="تغییر تم"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

        </div>

      </div>
    </header>
  );
};
