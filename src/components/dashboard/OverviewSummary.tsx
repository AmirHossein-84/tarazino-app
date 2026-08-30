import React from 'react';
import { Wallet, Sparkles, TrendingUp, LineChart } from 'lucide-react';
import { CryptoAsset, GoldHolding } from '../../types/investment';
import { formatToman, formatWeight, toPersianDigits } from '../../utils/formatters';

interface OverviewSummaryProps {
  cryptoAssets: CryptoAsset[];
  goldHolding: GoldHolding;
  marketValueTomans?: number;
}

export const OverviewSummary: React.FC<OverviewSummaryProps> = ({
  cryptoAssets,
  goldHolding,
  marketValueTomans = 0,
}) => {
  const currentGoldVal = goldHolding.currentHoldingValue || 0;
  const currentCryptoVal = cryptoAssets.reduce((sum, a) => sum + (a.currentHoldingValue || 0), 0);
  const totalHoldingsVal = currentGoldVal + currentCryptoVal + marketValueTomans;

  const goldPercentNum = totalHoldingsVal > 0 ? (currentGoldVal / totalHoldingsVal) * 100 : 0;
  const cryptoPercentNum = totalHoldingsVal > 0 ? (currentCryptoVal / totalHoldingsVal) * 100 : 0;
  const marketPercentNum = totalHoldingsVal > 0 ? (marketValueTomans / totalHoldingsVal) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      
      {/* Total Portfolio Value Card */}
      <div className="sm:col-span-1 p-4 rounded-3xl bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مجموع دارایی‌ها (ارزش کل پرتفوی)</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mb-1.5 dir-ltr">
            {formatToman(totalHoldingsVal)} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تومان</span>
          </div>

          {/* Mini split bar */}
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex mb-1.5">
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${goldPercentNum}%` }}
              title="سهم طلای فیزیکی"
            />
            {marketValueTomans > 0 && (
              <div
                className="bg-amber-600 h-full transition-all duration-300"
                style={{ width: `${marketPercentNum}%` }}
                title="سهم دارایی‌های بورسی"
              />
            )}
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${cryptoPercentNum}%` }}
              title="سهم رمزارزها"
            />
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span className="text-amber-700 dark:text-gold-400 font-bold">طلا: {toPersianDigits((goldPercentNum + marketPercentNum).toFixed(0))}٪</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">کریپتو: {toPersianDigits(cryptoPercentNum.toFixed(0))}٪</span>
          </div>
        </div>
      </div>

      {/* Gold & Market Summary Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-950 border border-gold-400/40 dark:border-amber-500/30 shadow-sm dark:shadow-md relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300">موجودی طلا و بورس</span>
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-gold-400">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-gold-400 mb-1 dir-ltr">
            {formatToman(currentGoldVal + marketValueTomans)} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تومان</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
            {marketValueTomans > 0 ? (
              <span>شامل {formatToman(marketValueTomans)} ت دارایی بورسی</span>
            ) : (
              <span>معادل تقریبی: {formatWeight(goldHolding.currentGrams || 0)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Crypto Summary Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/40 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-950 border border-indigo-200 dark:border-indigo-500/30 shadow-sm dark:shadow-md relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">موجودی فعلی رمزارزها</span>
          <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 mb-1 dir-ltr">
            {formatToman(currentCryptoVal)} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تومان</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
            شامل {toPersianDigits(cryptoAssets.length)} نوع رمزارز در سبد
          </div>
        </div>
      </div>

    </div>
  );
};
