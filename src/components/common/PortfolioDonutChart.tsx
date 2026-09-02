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

// Preset radiant gradients for financial asset categories
const ASSET_GRADIENTS: Record<string, { start: string; mid?: string; end: string }> = {
  physical_gold: { start: '#FDE047', mid: '#F59E0B', end: '#D97706' },
  bourse_gold: { start: '#FBBF24', mid: '#EA580C', end: '#B45309' },
  gold: { start: '#FDE047', mid: '#EAB308', end: '#CA8a04' },
  crypto: { start: '#818CF8', mid: '#6366F1', end: '#4338CA' },
  vehicles: { start: '#38BDF8', mid: '#3B82F6', end: '#1D4ED8' },
  properties: { start: '#2DD4BF', mid: '#0D9488', end: '#115E59' },
  cash: { start: '#34D399', mid: '#10B981', end: '#047857' },
};

export const PortfolioDonutChart: React.FC<PortfolioDonutChartProps> = React.memo(({
  items,
  centerTitle = 'مجموع ارزش',
  centerSubtitle,
  formattedTotalValue,
  emptyLabel = 'داده‌ای برای نمایش وجود ندارد',
  size = 230,
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

  // Calculate SVG geometry
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Spacing gap between slices (in pixels along circumference)
  const gapPx = validItems.length > 1 ? Math.min(8, circumference * 0.015) : 0;

  let accumulatedPercent = 0;
  const slices = validItems.map((item) => {
    const percent = (item.value / totalValue) * 100;
    const arcLength = Math.max(0, (percent / 100) * circumference - gapPx);
    const strokeDasharray = `${arcLength} ${circumference}`;

    // Rotation angle
    const rotation = (accumulatedPercent / 100) * 360;
    accumulatedPercent += percent;

    const grad = ASSET_GRADIENTS[item.id] || {
      start: item.color,
      mid: item.color,
      end: item.color,
    };

    return {
      ...item,
      percent,
      strokeDasharray,
      rotation,
      gradient: grad,
      gradientId: `grad_${item.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
    };
  });

  const activeItem = slices.find((s) => s.id === activeItemId);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG Donut Container */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        
        {/* Soft Ambient Glow Halo Behind Chart */}
        <div
          className="absolute inset-4 rounded-full blur-2xl opacity-20 dark:opacity-30 pointer-events-none transition-colors duration-300"
          style={{
            backgroundColor: activeItem ? activeItem.color : '#EAB308',
          }}
        />

        <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
          <defs>
            {slices.map((slice) => (
              <linearGradient
                key={slice.gradientId}
                id={slice.gradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={slice.gradient.start} />
                {slice.gradient.mid && <stop offset="50%" stopColor={slice.gradient.mid} />}
                <stop offset="100%" stopColor={slice.gradient.end} />
              </linearGradient>
            ))}
          </defs>

          {/* Background circle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="var(--donut-track, rgba(226, 232, 240, 0.9))"
            strokeWidth={strokeWidth}
          />

          {/* Glowing Slices with Rounded Caps */}
          {slices.map((slice) => {
            const isSelected = activeItemId === slice.id;

            return (
              <circle
                key={slice.id}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={`url(#${slice.gradientId})`}
                strokeWidth={isSelected ? strokeWidth + 5 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={0}
                strokeLinecap="round"
                transform={`rotate(${slice.rotation + (gapPx / circumference) * 180} ${center} ${center})`}
                className="transition-all duration-300 cursor-pointer"
                style={{
                  filter: isSelected
                    ? `drop-shadow(0 0 10px ${slice.color})`
                    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                  opacity: activeItemId && !isSelected ? 0.65 : 1,
                }}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveItemId(activeItemId === slice.id ? null : slice.id);
                }}
              />
            );
          })}
        </svg>

        {/* Center Glass Hub */}
        <div
          className="absolute inset-0 m-auto rounded-full flex flex-col items-center justify-center text-center px-4 pointer-events-none transition-all duration-200"
          style={{
            width: size - (strokeWidth * 2) - 16,
            height: size - (strokeWidth * 2) - 16,
          }}
        >
          <div className="w-full h-full rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-inner flex flex-col items-center justify-center p-3 select-none">
            {activeItem ? (
              <div className="animate-fadeIn space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate max-w-[110px]">
                  {activeItem.label}
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 block dir-ltr">
                  {formatPercent(activeItem.percent, 1)}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-gold-400 font-bold block dir-ltr">
                  {formatToman(activeItem.value)} ت
                </span>
              </div>
            ) : (
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                  {centerTitle}
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 block dir-ltr">
                  {formattedTotalValue || `${formatToman(totalValue)} ت`}
                </span>
                {centerSubtitle && (
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-medium">
                    {centerSubtitle}
                  </span>
                )}
              </div>
            )}
          </div>
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
                    ? 'bg-amber-50 dark:bg-slate-900 border-gold-500/80 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
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
