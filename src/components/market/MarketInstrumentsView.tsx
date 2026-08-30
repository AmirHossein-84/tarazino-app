import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import { useMarketData, CombinedMarketItem } from '../../hooks/useMarketData';
import { PortfolioDonutChart, DonutChartItem } from '../common/PortfolioDonutChart';
import { PullToRefreshContainer } from '../common/PullToRefreshContainer';
import { CardSkeleton } from '../common/SkeletonLoader';
import { formatToman, formatPercent, toPersianDigits, getPersianFormattedDate } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { AddMarketInstrumentModal } from './AddMarketInstrumentModal';
import { EditMarketHoldingModal } from './EditMarketHoldingModal';
import { AssetType } from '../../services/marketData/types';
import { PhysicalGoldItem } from '../../types/investment';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';

function getAssetTypeBadge(type: AssetType, symbol: string): { label: string; bg: string; text: string; border: string } {
  if (
    symbol.includes('عیار') ||
    symbol.includes('طلا') ||
    symbol.includes('کهربا') ||
    symbol.includes('زر') ||
    symbol.includes('گوهر') ||
    symbol.includes('زرفام')
  ) {
    return { label: 'صندوق طلا', bg: 'bg-amber-500/10 dark:bg-amber-500/10', text: 'text-amber-800 dark:text-gold-400', border: 'border-amber-400/40 dark:border-gold-500/30' };
  }
  switch (type) {
    case 'etf':
      return { label: 'صندوق ETF', bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-500/30' };
    case 'bond':
      return { label: 'اوراق بهادار', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/30' };
    case 'commodity':
      return { label: 'کالایی', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' };
    case 'stock':
    default:
      return { label: 'سهام بورس', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
  }
}

interface MarketInstrumentsViewProps {
  physicalGoldItems?: PhysicalGoldItem[];
  totalPhysicalGoldValueTomans?: number;
  currencyMode?: CurrencyDisplayMode;
  formatCurrency?: (amountTomans: number, options?: any) => string;
  toDisplayValue?: (amountTomans: number) => number;
  onNavigateToHoldings?: () => void;
}

export const MarketInstrumentsView: React.FC<MarketInstrumentsViewProps> = ({
  physicalGoldItems = [],
  totalPhysicalGoldValueTomans = 0,
  currencyMode = 'toman',
  formatCurrency = (v, opts) => `${formatToman(v)} ${opts?.isTomanSuffix ? 'ت' : 'تومان'}`,
  toDisplayValue = (v) => v,
  onNavigateToHoldings,
}) => {
  const {
    combinedItems,
    marketStatus,
    isLoading,
    isRefreshing,
    lastRefreshedAt,
    totalMarketValueTomans,
    totalMarketCostTomans,
    addInstrumentAndHolding,
    updateHolding,
    removeHolding,
    refreshQuotes,
  } = useMarketData();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CombinedMarketItem | null>(null);

  const handleManualRefresh = async () => {
    triggerHaptic('light');
    await refreshQuotes(true);
  };

  const totalProfitTomans = totalMarketCostTomans > 0 ? totalMarketValueTomans - totalMarketCostTomans : undefined;
  const totalProfitPct = totalMarketCostTomans > 0 ? (totalProfitTomans! / totalMarketCostTomans) * 100 : undefined;

  const refreshTimeStr = new Date(lastRefreshedAt).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const totalCombinedGoldAndMarketValue = totalMarketValueTomans + totalPhysicalGoldValueTomans;

  // Donut chart items: Distinct radiant gold for physical, rich amber gold for bourse
  const physicalDonutItems: DonutChartItem[] = physicalGoldItems
    .filter((item) => item.quantity > 0 && item.unitPriceTomans > 0)
    .map((item, idx) => {
      const radiantGolds = ['#FBBF24', '#F59E0B', '#FDE047', '#FEF08A'];
      const rawVal = item.quantity * item.unitPriceTomans;
      return {
        id: `phys_${item.id}`,
        label: item.title,
        value: toDisplayValue(rawVal),
        color: radiantGolds[idx % radiantGolds.length],
        sublabel: `${toPersianDigits(item.quantity)} ${item.unit} (طلای فیزیکی)`,
      };
    });

  const bourseDonutItems: DonutChartItem[] = combinedItems
    .filter((item) => (item.currentValueTomans || 0) > 0)
    .map((item, idx) => {
      const amberGolds = ['#D97706', '#B45309', '#D4AF37', '#92400E'];
      return {
        id: item.instrument.symbol,
        label: item.instrument.name,
        value: toDisplayValue(item.currentValueTomans || 0),
        color: amberGolds[idx % amberGolds.length],
        sublabel: `${item.holding ? toPersianDigits(item.holding.quantity) + ' واحد' : ''} (صندوق بورسی)`,
      };
    });

  const allDonutItems: DonutChartItem[] = [...physicalDonutItems, ...bourseDonutItems];

  return (
    <PullToRefreshContainer onRefresh={handleManualRefresh} isRefreshing={isRefreshing} className="space-y-4 pb-24">
      
      {/* 1. Header & Market Status Card */}
      <div className="glass-card p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        
        {/* Top bar: Title + Market Status Pill + Refresh button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-400/40 dark:border-gold-500/30 flex items-center justify-center text-amber-700 dark:text-gold-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                  بازار بورس و صندوق‌های طلا (TSETMC)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  پایش قیمت‌های زنده و آخرین معاملات رسمی بورس تهران
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Market Session Status Badge */}
            <div
              className={`px-3 py-1.5 rounded-2xl text-[11px] font-bold border flex items-center gap-1.5 ${
                marketStatus?.isOpen
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40'
                  : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30'
              }`}
              title={marketStatus?.message}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  marketStatus?.isOpen ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-amber-500 dark:bg-amber-400'
                }`}
              />
              <span>
                {marketStatus?.isOpen ? '🟢 بازار باز است (زنده)' : '🟡 بازار بسته — آخرین قیمت'}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-gold-600 dark:text-slate-300 dark:hover:text-gold-300 border border-slate-200 dark:border-slate-700/80 transition-all touch-target"
              title="به‌روزرسانی قیمت‌ها"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600 dark:text-gold-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Portfolio Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
              ارزش کل بورس و طلا
            </span>
            <div className="text-sm sm:text-base font-black text-amber-700 dark:text-gold-400 dir-ltr text-right">
              {formatCurrency(totalCombinedGoldAndMarketValue)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
              سود / زیان کل بورسی
            </span>
            {totalProfitTomans !== undefined ? (
              <div
                className={`text-sm sm:text-base font-black flex items-center gap-1 dir-ltr text-right ${
                  totalProfitTomans >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                <span>{formatCurrency(Math.abs(totalProfitTomans))}</span>
                <span className="text-[10px] font-bold">
                  ({totalProfitPct !== undefined ? formatPercent(totalProfitPct) : '0%'})
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">ثبت نشده</span>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
              آخرین استعلام بورس
            </span>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
              <span>{refreshTimeStr}</span>
            </div>
          </div>

        </div>

      </div>

      {/* 2. GOLD HOLDINGS DONUT CHART (TWO-TONE: RADIANT GOLD FOR PHYSICAL & AMBER GOLD FOR BOURSE) */}
      {allDonutItems.length > 0 && (
        <div className="glass-card p-5 border border-gold-400/40 dark:border-gold-500/30 shadow-md dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-gold-500/20 text-amber-700 dark:text-gold-400 flex items-center justify-center font-bold text-sm">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  ترکیب دارایی‌های طلا و بورس
                </h3>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>طلای فیزیکی ({formatCurrency(totalPhysicalGoldValueTomans, { isTomanSuffix: true })})</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    <span>طلای بورس ({formatCurrency(totalMarketValueTomans, { isTomanSuffix: true })})</span>
                  </span>
                </div>
              </div>
            </div>

            <span className="text-xs font-black text-amber-700 dark:text-gold-400 dir-ltr">
              {formatCurrency(totalCombinedGoldAndMarketValue)}
            </span>
          </div>

          <PortfolioDonutChart
            items={allDonutItems}
            centerTitle="مجموع دارایی طلا"
            formattedTotalValue={formatCurrency(totalCombinedGoldAndMarketValue)}
            size={210}
            strokeWidth={22}
          />
        </div>
      )}

      {/* 3. Instruments Section Header + Add Button */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            نمادها و دارایی‌های بورسی تحت نظر
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            برای ویرایش تعداد واحدها یا حذف، روی هر کارت ضربه بزنید
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsAddModalOpen(true);
          }}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-gold-500 hover:from-amber-300 hover:to-gold-400 text-slate-950 font-black text-xs transition-all interactive-tap shadow-gold-glow touch-target whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن نماد</span>
        </button>
      </div>

      {/* 4. Instruments Grid or Skeleton */}
      {isLoading && combinedItems.length === 0 ? (
        <CardSkeleton count={4} />
      ) : combinedItems.length === 0 ? (
        <div className="text-center py-10 px-4 glass-card border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Coins className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">هنوز نمادی در بورس ثبت نکرده‌اید</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            با زدن دکمه «افزودن نماد»، هر سهم یا صندوق بورس (عیار، طلا، فملی، شستا و...) را جستجو و اضافه کنید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {combinedItems.map((item) => {
            const { instrument, holding, quote, currentValueTomans } = item;
            const priceTomans = quote?.lastPriceTomans || 0;
            const priceChangePct = quote?.priceChangePercent || 0;
            const isPositive = priceChangePct >= 0;
            const badge = getAssetTypeBadge(instrument.assetType, instrument.symbol);

            return (
              <div
                key={instrument.id || instrument.providerInstrumentId || instrument.symbol}
                onClick={() => {
                  triggerHaptic('light');
                  setEditingItem(item);
                }}
                className="group relative p-4 rounded-3xl bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-gold-400/60 dark:hover:border-gold-500/40 transition-all cursor-pointer shadow-sm dark:shadow-lg space-y-3 interactive-tap"
              >
                {/* Card Top: Symbol + Asset Badge + Price + Change Chip */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900 dark:text-slate-100">
                        {instrument.symbol}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5" title={instrument.name}>
                      {instrument.name}
                    </span>
                  </div>

                  <div className="text-left shrink-0 space-y-0.5">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100 dir-ltr text-right">
                      {priceTomans > 0 ? (
                        <span>{formatCurrency(priceTomans, { isUnitPrice: true, isTomanSuffix: true })}</span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">در حال دریافت...</span>
                      )}
                    </div>

                    {quote && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 dir-ltr ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        <span>{formatPercent(Math.abs(priceChangePct))}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Middle: Status / Time Indicator */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="flex items-center gap-1">
                    {quote?.isStale ? (
                      <span className="text-rose-600 dark:text-rose-400 font-medium">🔴 اطلاعات آفلاین</span>
                    ) : marketStatus?.isOpen ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">🟢 نرخ لحظه‌ای</span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300 font-medium">🟡 آخرین معامله (بازار بسته)</span>
                    )}
                  </span>
                  {quote?.tradeTime && (
                    <span className="text-slate-400 dark:text-slate-500 dir-ltr">
                      ساعت معامله: {quote.tradeTime}
                    </span>
                  )}
                </div>

                {/* Card Bottom: User Holdings Valuation */}
                {holding ? (
                  <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">موجودی شما:</span>
                      <span className="font-black text-slate-800 dark:text-slate-200">
                        {toPersianDigits(holding.quantity)} واحد
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">ارزش فعلی:</span>
                      <span className="font-black text-amber-700 dark:text-gold-400 dir-ltr text-right">
                        {formatCurrency(currentValueTomans || 0, { isTomanSuffix: true })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                    بدون ثبت موجودی (فقط پایش قیمت)
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Add Instrument Modal */}
      <AddMarketInstrumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(inst, qty, avgPrice) => {
          addInstrumentAndHolding(inst, qty, avgPrice);
        }}
      />

      {/* Edit Holding Modal */}
      <EditMarketHoldingModal
        item={editingItem}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={(holdingId, qty, avgPrice) => {
          updateHolding(holdingId, qty, avgPrice);
        }}
        onDelete={(holdingId) => {
          removeHolding(holdingId);
        }}
      />

    </PullToRefreshContainer>
  );
};
