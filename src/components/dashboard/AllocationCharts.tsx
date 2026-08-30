import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { CalculatedCryptoBuy, CryptoAsset } from '../../types/investment';
import { formatToman, toPersianDigits } from '../../utils/formatters';

interface AllocationChartsProps {
  cryptoBuys: CalculatedCryptoBuy[];
  cryptoAssets: CryptoAsset[];
  goldBuyAmount: number;
  cryptoBuyAmount: number;
}

export const AllocationCharts: React.FC<AllocationChartsProps> = ({
  cryptoBuys,
  goldBuyAmount,
  cryptoBuyAmount,
}) => {
  const [chartView, setChartView] = useState<'crypto' | 'total'>('crypto');

  // Crypto chart data
  const cryptoData = cryptoBuys
    .filter((c) => c.suggestedBuy > 0 || c.targetPercent > 0)
    .map((c) => ({
      name: c.symbol,
      fullName: c.name,
      value: c.suggestedBuy > 0 ? c.suggestedBuy : c.targetPercent,
      color: c.color || '#627EEA',
      percent: c.targetPercent,
      suggestedBuy: c.suggestedBuy,
    }));

  // Top level chart data (Gold vs Crypto)
  const topData = [
    { name: 'طلا', value: goldBuyAmount > 0 ? goldBuyAmount : 80, color: '#D4AF37' },
    { name: 'ارزهای دیجیتال', value: cryptoBuyAmount > 0 ? cryptoBuyAmount : 20, color: '#627EEA' },
  ];

  const activeData = chartView === 'crypto' ? cryptoData : topData;
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className="glass-card p-4 sm:p-5 border border-slate-200 dark:border-slate-800">
      
      {/* Chart Header & Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <PieIcon className="w-4 h-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
            نمودار بصری تخصیص سرمایه
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
          <button
            onClick={() => setChartView('crypto')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              chartView === 'crypto'
                ? 'bg-white dark:bg-amber-500/20 text-amber-700 dark:text-gold-400 font-bold border border-slate-200 dark:border-gold-500/30 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            سبد رمزارزها
          </button>
          <button
            onClick={() => setChartView('total')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              chartView === 'total'
                ? 'bg-white dark:bg-amber-500/20 text-amber-700 dark:text-gold-400 font-bold border border-slate-200 dark:border-gold-500/30 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            طلا / کریپتو
          </button>
        </div>
      </div>

      {/* Donut Chart & Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        
        {/* Chart Viewport */}
        <div className="sm:col-span-5 h-48 w-full flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={activeData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {activeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={isDark ? '#0B0F17' : '#FFFFFF'}
                    className="stroke-white dark:stroke-[#0B0F17]"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl shadow-xl text-right text-xs">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                          <span>{data.name}</span>
                        </div>
                        {data.suggestedBuy !== undefined && (
                          <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                            خرید: {formatToman(data.suggestedBuy)} تومان
                          </div>
                        )}
                        {data.percent !== undefined && (
                          <div className="text-slate-500 dark:text-slate-400">
                            وزن هدف: {toPersianDigits(data.percent)}٪
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {chartView === 'crypto' ? 'سبد رمزارز' : 'کل پس‌انداز'}
            </span>
            <span className="text-xs font-bold text-amber-700 dark:text-gold-400">۱۰۰٪</span>
          </div>
        </div>

        {/* Legend Grid */}
        <div className="sm:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {chartView === 'crypto' ? (
            cryptoData.map((item) => (
              <div
                key={item.name}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                </div>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium mr-1">
                  {toPersianDigits(item.percent)}٪
                </span>
              </div>
            ))
          ) : (
            topData.map((item) => (
              <div
                key={item.name}
                className="col-span-1 sm:col-span-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                </div>
                <span className="font-bold text-amber-700 dark:text-gold-400">
                  {formatToman(item.value)} تومان
                </span>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
};
