import React, { useState, useEffect } from 'react';
import { Coins, TrendingUp, Sparkles, RotateCcw, Wallet } from 'lucide-react';
import { AppSettings } from '../../types/investment';
import { formatToman, formatPercent, parseNumberInput, toPersianDigits } from '../../utils/formatters';
import { numberToPersianWords } from '../../utils/numberToPersianWords';
import { triggerHaptic } from '../../utils/haptics';

interface CapitalInputCardProps {
  inputAmount: number;
  setInputAmount: (amount: number) => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  totalSavingsAmount: number;
  goldBuyAmount: number;
  cryptoBuyAmount: number;
}

export const CapitalInputCard: React.FC<CapitalInputCardProps> = ({
  inputAmount,
  setInputAmount,
  settings,
  updateSettings,
  totalSavingsAmount,
  goldBuyAmount,
  cryptoBuyAmount,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    inputAmount > 0 ? new Intl.NumberFormat('en-US').format(inputAmount) : ''
  );

  const isDirect = settings.capitalInputMode === 'direct';

  const handleModeChange = (mode: 'direct' | 'income') => {
    triggerHaptic('light');
    updateSettings({ capitalInputMode: mode });
  };

  useEffect(() => {
    setDisplayValue(inputAmount > 0 ? new Intl.NumberFormat('en-US').format(inputAmount) : '');
  }, [inputAmount]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseNumberInput(raw);
    setInputAmount(parsed);
    setDisplayValue(parsed > 0 ? new Intl.NumberFormat('en-US').format(parsed) : '');
  };

  const handleQuickAdd = (addAmount: number) => {
    triggerHaptic('light');
    const newVal = (inputAmount || 0) + addAmount;
    setInputAmount(newVal);
  };

  const handleClear = () => {
    triggerHaptic('medium');
    setInputAmount(0);
  };

  const persianWords = inputAmount > 0 ? numberToPersianWords(inputAmount, 'تومان') : '';

  return (
    <div className="glass-card p-5 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-4 relative overflow-hidden">
      
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-gold-500/15 text-amber-700 dark:text-gold-400 border border-amber-500/30 dark:border-gold-500/30 flex items-center justify-center font-bold text-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              سرمایه ورودی جدید (محاسبه تخصیص پس‌انداز)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isDirect
                ? `تخصیص ۱۰۰٪ مستقیم مبلغ ورودی بین طلا (${toPersianDigits(settings.goldPercent)}%) و کریپتو (${toPersianDigits(settings.cryptoPercent)}%)`
                : `محاسبه هوشمند سهم طلا (${toPersianDigits(settings.goldPercent)}%) و کریپتو (${toPersianDigits(settings.cryptoPercent)}%)`}
            </p>
          </div>
        </div>

        {inputAmount > 0 && (
          <button
            onClick={handleClear}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 transition-all text-[11px] flex items-center gap-1 touch-target"
            title="پاک کردن مبلغ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">پاک کردن</span>
          </button>
        )}
      </div>

      {/* Allocation Mode Switcher (100% Direct vs Savings Percent from Income) */}
      <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center gap-1 text-xs select-none">
        <button
          type="button"
          onClick={() => handleModeChange('direct')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 interactive-tap ${
            isDirect
              ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-gold-300 shadow-sm border border-amber-500/30 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>سرمایه‌گذاری مستقیم (۱۰۰٪)</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('income')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 interactive-tap ${
            !isDirect
              ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-500/30 font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 text-indigo-500" />
          <span>سهم پس‌انداز از درآمد ({toPersianDigits(settings.savingsPercent)}%)</span>
        </button>
      </div>

      {/* Numeric Amount Input */}
      <div className="space-y-1.5">
        <div className="relative flex items-center">
          <input
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleInputChange}
            placeholder="مثال: ۲۵,۰۰۰,۰۰۰"
            className="w-full bg-slate-50 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-700/90 rounded-2xl px-4 py-3.5 text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:bg-white dark:focus:bg-slate-950 focus:border-gold-500 transition-all font-mono pl-16 text-right"
          />
          <span className="absolute left-4 text-xs font-bold text-slate-500 dark:text-slate-400 pointer-events-none">
            تومان
          </span>
        </div>

        {/* Persian Words Readout (Quality of Life) */}
        {persianWords && (
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-gold-500/10 border border-amber-500/20 dark:border-gold-500/20 text-xs font-bold text-amber-800 dark:text-gold-300 animate-fadeIn">
            {persianWords}
          </div>
        )}
      </div>

      {/* Quick-Add Chips */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {[
          { label: '+۱ م', title: '+۱ میلیون تومان', value: 1000000 },
          { label: '+۵ م', title: '+۵ میلیون تومان', value: 5000000 },
          { label: '+۱۰ م', title: '+۱۰ میلیون تومان', value: 10000000 },
          { label: '+۵۰ م', title: '+۵۰ میلیون تومان', value: 50000000 },
          { label: '+۱۰۰ م', title: '+۱۰۰ میلیون تومان', value: 100000000 },
        ].map((chip) => (
          <button
            key={chip.value}
            type="button"
            title={chip.title}
            onClick={() => handleQuickAdd(chip.value)}
            className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 text-slate-700 hover:text-amber-700 dark:text-slate-300 dark:hover:text-gold-300 border border-slate-200 dark:border-slate-800 text-xs font-black transition-all interactive-tap touch-target text-center"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Calculated Savings Split Preview */}
      {totalSavingsAmount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800/80 animate-fadeIn">
          
          {/* 100% Direct or 30% Savings */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                <Wallet className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>
                  {isDirect
                    ? 'بودجه کل (۱۰۰٪ مستقیم)'
                    : `سهم پس‌انداز (${toPersianDigits(settings.savingsPercent)}%)`}
                </span>
              </span>
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">
              {formatToman(totalSavingsAmount)} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">ت</span>
            </div>
          </div>

          {/* 80% Gold Buy */}
          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-slate-950/80 border border-gold-400/40 dark:border-gold-500/30 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 font-bold text-amber-800 dark:text-gold-400">
                <Coins className="w-3.5 h-3.5" />
                <span>خرید طلا ({toPersianDigits(settings.goldPercent)}%)</span>
              </span>
            </div>
            <div className="text-sm font-black text-amber-700 dark:text-gold-300">
              {formatToman(goldBuyAmount)} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">ت</span>
            </div>
          </div>

          {/* 20% Crypto Buy */}
          <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-slate-950/80 border border-indigo-200 dark:border-indigo-500/30 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 font-bold text-indigo-800 dark:text-indigo-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>خرید کریپتو ({toPersianDigits(settings.cryptoPercent)}%)</span>
              </span>
            </div>
            <div className="text-sm font-black text-indigo-700 dark:text-indigo-300">
              {formatToman(cryptoBuyAmount)} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">ت</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
