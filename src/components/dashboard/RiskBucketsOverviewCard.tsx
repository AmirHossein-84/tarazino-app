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
      barColor: 'bg-gradient-to-r from-emerald-500 to-teal-400',
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
      barColor: 'bg-gradient-to-r from-purple-500 to-fuchsia-400',
    },
  ];

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            سبدهای سه‌گانه مدیریت ریسک
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>تقسیم بهینه دارایی بر مبنای سن و تحمل ریسک شخصی</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
              فرمول سنی ({toPersianDigits(config?.userAge ?? 25)} سال)
            </span>
          </p>
        </div>

        {onNavigateToHoldings && (
          <button
            type="button"
            onClick={onNavigateToHoldings}
            className="text-xs font-bold text-amber-600 dark:text-gold-400 hover:underline flex items-center gap-0.5 shrink-0 whitespace-nowrap pt-1"
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl border shrink-0 ${b.badgeClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {b.title}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        ({b.subtitle})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <span className="dir-ltr tabular-nums">{formatToman(b.value)}</span>{' '}
                      <span className="text-[10px] font-medium text-slate-400">تومان</span>
                    </span>
                  </div>
                </div>

                <div className="text-left shrink-0">
                  <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums dir-ltr leading-none">
                    {formatPercent(b.actual)}
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap inline-block mt-1">
                    هدف: <span className="dir-ltr tabular-nums">{formatPercent(b.target)}</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar: Actual vs Target Marker */}
              <div className="relative w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700/60">
                <div
                  className={`h-full ${b.barColor} rounded-full shadow-sm transition-all duration-700`}
                  style={{ width: `${Math.min(100, Math.max(0, b.actual))}%` }}
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-slate-900 dark:bg-white shadow ring-1 ring-white/50 dark:ring-slate-900/50"
                  style={{ right: `${Math.min(100, Math.max(0, b.target))}%` }}
                  title={`هدف: ${formatPercent(b.target)}`}
                />
              </div>

              {/* Status Hint */}
              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                <span className="whitespace-nowrap">
                  {Math.abs(diff) <= 2
                    ? 'متوازن و منطبق بر هدف'
                    : diff > 0
                    ? `بیش از وزن هدف (${toPersianDigits(Math.abs(diff))}٪+)`
                    : `کمتر از وزن هدف (${toPersianDigits(Math.abs(diff))}٪-)`}
                </span>
                <span className="whitespace-nowrap">سهم از کل سبد: {totalNetWorthTomans > 0 ? formatPercent(b.actual) : '۰٪'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
