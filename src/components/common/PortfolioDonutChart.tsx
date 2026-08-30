import React, { useState } from 'react';
import { formatToman, formatPercent, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';

export interface DonutChartItem {
  id: string;
  label: string;
  value: number; // Value in Tomans
  color: string;
  sublabel?: string;
  targetPercent?: number;
}

interface PortfolioDonutChartProps {
  items: DonutChartItem[];
  centerTitle?: string;
  centerSubtitle?: string;
  formattedTotalValue?: string;
  emptyLabel?: string;
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
}

export const PortfolioDonutChart: React.FC<PortfolioDonutChartProps> = React.memo(({
  items,
  centerTitle = 'مجموع ارزش',
  centerSubtitle,
  formattedTotalValue,
  emptyLabel = 'داده‌ای برای نمایش وجود ندارد',
  size = 220,
  strokeWidth = 24,
  showLegend = true,
}) => {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Filter valid positive items
  const validItems = items.filter((item) => item.value > 0);
  const totalValue = validItems.reduce((acc, item) => acc + item.value, 0);

  if (totalValue <= 0 || validItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
        <div
          style={{ width: size, height: size }}
          className="relative flex items-center justify-center rounded-full border-4 border-dashed border-slate-300 dark:border-slate-800"
        >
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-4">{emptyLabel}</span>
        </div>
      </div>
    );
  }

  // Calculate SVG arc paths
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;
  const slices = validItems.map((item) => {
    const percent = (item.value / totalValue) * 100;
    const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
    // Start at -90deg (top center) + accumulated rotation
    const rotation = (accumulatedPercent / 100) * 360;
    accumulatedPercent += percent;

    return {
      ...item,
      percent,
      strokeDasharray,
      rotation,
    };
  });

  const activeItem = slices.find((s) => s.id === activeItemId);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG Donut */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="var(--donut-track, rgba(226, 232, 240, 0.9))"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slices.map((slice) => {
            const isSelected = activeItemId === slice.id;

            return (
              <circle
                key={slice.id}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={0}
                transform={`rotate(${slice.rotation} ${center} ${center})`}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  filter: isSelected ? `drop-shadow(0 0 8px ${slice.color})` : 'none',
                }}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveItemId(activeItemId === slice.id ? null : slice.id);
                }}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          {activeItem ? (
            <div className="animate-fadeIn space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate max-w-[120px]">
                {activeItem.label}
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-slate-100 block dir-ltr">
                {formatPercent(activeItem.percent, 1)}
              </span>
              <span className="text-[10px] text-amber-700 dark:text-gold-400 font-bold block dir-ltr">
                {formatToman(activeItem.value)} ت
              </span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                {centerTitle}
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 block dir-ltr">
                {formattedTotalValue || `${formatToman(totalValue)} ت`}
              </span>
              {centerSubtitle && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  {centerSubtitle}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend & Target Comparison */}
      {showLegend && (
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
          {slices.map((slice) => {
            const isSelected = activeItemId === slice.id;

            return (
              <div
                key={slice.id}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveItemId(activeItemId === slice.id ? null : slice.id);
                }}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer space-y-1 interactive-tap ${
                  isSelected
                    ? 'bg-amber-50 dark:bg-slate-900 border-gold-500/80 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate">
                    {slice.label}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-1 text-[11px] pt-0.5">
                  <span className="font-black text-slate-900 dark:text-slate-100 dir-ltr">
                    {formatPercent(slice.percent, 1)}
                  </span>
                  {slice.targetPercent !== undefined && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      هدف: {toPersianDigits(slice.targetPercent)}%
                    </span>
                  )}
                </div>

                {slice.sublabel && (
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                    {slice.sublabel}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
