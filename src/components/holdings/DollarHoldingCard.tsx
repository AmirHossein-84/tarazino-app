import React, { useState } from 'react';
import { DollarSign, Edit3, TrendingUp, TrendingDown, RefreshCw, Check, X } from 'lucide-react';
import { DollarHolding } from '../../types/investment';
import { formatToman, formatPercent, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';

interface DollarHoldingCardProps {
  dollarHolding: DollarHolding;
  onUpdate: (updates: Partial<DollarHolding>) => void;
  usdtRateTomans?: number;
  formatCurrency?: (amountTomans: number) => string;
}

export const DollarHoldingCard: React.FC<DollarHoldingCardProps> = ({
  dollarHolding,
  onUpdate,
  usdtRateTomans = 93000,
  formatCurrency = (v) => `${formatToman(v)} تومان`,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [amountUsd, setAmountUsd] = useState(dollarHolding.amountUsd.toString());
  const [buyPrice, setBuyPrice] = useState(dollarHolding.averageBuyPriceTomans.toString());
  const [currentPrice, setCurrentPrice] = useState(dollarHolding.currentPriceTomans.toString());

  const currentRate = dollarHolding.currentPriceTomans || usdtRateTomans || 90000;
  const buyRate = dollarHolding.averageBuyPriceTomans || currentRate;
  const totalValuationTomans = Math.round(dollarHolding.amountUsd * currentRate);
  const totalCostTomans = Math.round(dollarHolding.amountUsd * buyRate);
  const pnlTomans = totalValuationTomans - totalCostTomans;
  const pnlPercent = totalCostTomans > 0 ? (pnlTomans / totalCostTomans) * 100 : 0;
  const isProfitable = pnlTomans >= 0;

  const handleSave = () => {
    triggerHaptic('success');
    const parsedAmount = Math.max(0, parseFloat(amountUsd) || 0);
    const parsedBuy = Math.max(0, parseInt(buyPrice.replace(/\D/g, ''), 10) || 0);
    const parsedCurrent = Math.max(0, parseInt(currentPrice.replace(/\D/g, ''), 10) || 0);

    onUpdate({
      amountUsd: parsedAmount,
      averageBuyPriceTomans: parsedBuy,
      currentPriceTomans: parsedCurrent,
      lastUpdated: Date.now(),
    });
    setIsEditing(false);
  };

  const handleSyncWithUsdt = () => {
    triggerHaptic('light');
    if (usdtRateTomans > 0) {
      setCurrentPrice(usdtRateTomans.toString());
      onUpdate({
        currentPriceTomans: usdtRateTomans,
        lastUpdated: Date.now(),
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Dollar Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-900/30 via-slate-900/60 to-slate-950/80 border border-emerald-500/20 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xl shadow-lg">
              $
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">دلار نقدی (اسکناس)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  کم‌ریسک (سپر نقدی)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                نرخ روز: {toPersianDigits(formatToman(currentRate))} تومان
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setAmountUsd(dollarHolding.amountUsd.toString());
              setBuyPrice(dollarHolding.averageBuyPriceTomans.toString());
              setCurrentPrice(dollarHolding.currentPriceTomans.toString());
              setIsEditing(!isEditing);
            }}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="ویرایش موجودی و نرخ"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Value Display */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
          <div>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
              موجودی اسکناس دلار
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ${toPersianDigits(dollarHolding.amountUsd.toLocaleString('en-US'))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
              ارزش روز به تومان
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {toPersianDigits(formatCurrency(totalValuationTomans))}
            </div>
          </div>
        </div>

        {/* PnL and Cost Basis Metrics */}
        {dollarHolding.amountUsd > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span>بهای تمام‌شده:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {toPersianDigits(formatToman(totalCostTomans))} تومان
              </span>
            </div>

            <div className={`flex items-center gap-1 font-bold ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isProfitable ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isProfitable ? '+' : ''}{toPersianDigits(formatPercent(pnlPercent))}%</span>
              <span>({toPersianDigits(formatToman(Math.abs(pnlTomans)))})</span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Form Modal/Card */}
      {isEditing && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-scaleUp">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              ویرایش دارایی دلاری
            </h4>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                تعداد دلار (اسکناس)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                placeholder="مثال: 1500"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                میانگین نرخ خرید هر دلار (تومان)
              </label>
              <input
                type="text"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="مثال: 88000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  نرخ روز هر دلار (تومان)
                </label>
                {usdtRateTomans > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncWithUsdt}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    تنظیم روی نرخ تتر ({toPersianDigits(formatToman(usdtRateTomans))})
                  </button>
                )}
              </div>
              <input
                type="text"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="مثال: 93500"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4" />
              ذخیره تغییرات
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
