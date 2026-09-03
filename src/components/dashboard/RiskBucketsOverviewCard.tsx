import React from 'react';
import { Shield, Scale, Rocket, ChevronRight, Info } from 'lucide-react';
import { RiskBucketsSummary, RiskBucketsConfig } from '../../types/investment';
import { formatToman, formatPercent, toPersianDigits } from '../../utils/formatters';

interface RiskBucketsOverviewCardProps {
  summary: RiskBucketsSummary;
  config?: RiskBucketsConfig;
  onNavigateToHoldings?: () => void;
}

export const RiskBucketsOverviewCard: React.FC<RiskBucketsOverviewCardProps> = ({
  summary,
  config,
  onNavigateToHoldings,
}) => {
  const { lowRisk, mediumRisk, highRisk, totalNetWorthTomans } = summary;

  const buckets = [
    {
      id: 'low',
      title: 'سبد کم‌ریسک',
      subtitle: 'ماشین، املاک، دلار نقدی',
      target: lowRisk.targetPercent,
      actual: lowRisk.actualPercent,
      value: lowRisk.currentValueTomans,
      icon: Shield,
      color: 'emerald',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      barColor: 'bg-emerald-500',
    },
    {
      id: 'medium',
      title: 'سبد ریسک متوسط',
      subtitle: 'طلا و سهام بورس',
      target: mediumRisk.targetPercent,
      actual: mediumRisk.actualPercent,
      value: mediumRisk.currentValueTomans,
      icon: Scale,
      color: 'amber',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      barColor: 'bg-gradient-to-r from-amber-500 to-yellow-500',
    },
    {
      id: 'high',
      title: 'سبد پرریسک',
      subtitle: 'ارزهای دیجیتال (کریپتو)',
      target: highRisk.targetPercent,
      actual: highRisk.actualPercent,
      value: highRisk.currentValueTomans,
      icon: Rocket,
      color: 'purple',
      badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      barColor: 'bg-purple-500',
    },
  ];

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              سبدهای سه‌گانه مدیریت ریسک
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              فرمول سنی ({toPersianDigits(config?.userAge ?? 25)} سال)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تقسیم بهینه دارایی بر مبنای سن و تحمل ریسک شخصی
          </p>
        </div>

        {onNavigateToHoldings && (
          <button
            type="button"
            onClick={onNavigateToHoldings}
            className="text-xs font-bold text-amber-600 dark:text-gold-400 hover:underline flex items-center gap-0.5"
          >
            <span>مدیریت دارایی‌ها</span>
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>

      {/* 3 Buckets Grid */}
      <div className="space-y-3.5">
        {buckets.map((b) => {
          const Icon = b.icon;
          const diff = Number((b.actual - b.target).toFixed(1));
          return (
            <div
              key={b.id}
              className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${b.badgeClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {b.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({b.subtitle})
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                      {toPersianDigits(formatToman(b.value))} تومان
                    </span>
                  </div>
                </div>

                <div className="text-left">
                  <div className="text-xs font-black text-slate-900 dark:text-white font-mono">
                    {toPersianDigits(formatPercent(b.actual))}%
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">
                    هدف: {toPersianDigits(formatPercent(b.target))}%
                  </div>
                </div>
              </div>

              {/* Progress Bar: Actual vs Target Marker */}
              <div className="relative w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
                <div
                  className={`h-full ${b.barColor} transition-all duration-700`}
                  style={{ width: `${Math.min(100, Math.max(0, b.actual))}%` }}
                />
              </div>

              {/* Status Hint */}
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  {Math.abs(diff) <= 2
                    ? 'متوازن و منطبق بر هدف'
                    : diff > 0
                    ? `بیش از وزن هدف (${toPersianDigits(Math.abs(diff))}٪+)`
                    : `کمتر از وزن هدف (${toPersianDigits(Math.abs(diff))}٪-)`}
                </span>
                <span>سهم از کل سبد: {totalNetWorthTomans > 0 ? toPersianDigits(formatPercent(b.actual)) : '۰'}٪</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
