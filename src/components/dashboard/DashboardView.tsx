import React, { useState } from 'react';
import {
  TrendingUp,
  Wallet,
  Coins,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  PieChart,
  ShieldCheck,
  ChevronLeft,
  DollarSign,
} from 'lucide-react';
import {
  CryptoAsset,
  CalculationResult,
  AppSettings,
  CalculatedCryptoBuy,
} from '../../types/investment';
import { PortfolioDonutChart, DonutChartItem } from '../common/PortfolioDonutChart';
import { PullToRefreshContainer } from '../common/PullToRefreshContainer';
import { CapitalInputCard } from './CapitalInputCard';
import { GoldBuyCard } from '../calculation/GoldBuyCard';
import { formatToman, formatPercent, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';

interface DashboardViewProps {
  totalInputAmount: number;
  setTotalInputAmount: (val: number) => void;
  calculationResult: CalculationResult;
  cryptoAssets: CryptoAsset[];
  goldHoldingValue: number;
  physicalGoldValue?: number;
  bourseGoldValue?: number;
  propertiesValue?: number;
  totalCryptoValue: number;
  totalPortfolioValue: number;
  tomanCashBalance: number;
  activeGoldFund: string;
  setActiveGoldFund: (fund: string) => void;
  goldEtfUnitPrice: number;
  goldEtfUnitChange: number;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  isRefreshing: boolean;
  currencyMode?: CurrencyDisplayMode;
  usdtRateTomans?: number;
  toggleCurrencyMode?: () => void;
  formatCurrency?: (amountTomans: number, showUnit?: boolean) => string;
  toDisplayValue?: (amountTomans: number) => number;
  onRefreshAll: () => Promise<void>;
  onApplyPurchases: () => void;
  onNavigateToTab: (tab: any) => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  totalInputAmount,
  setTotalInputAmount,
  calculationResult,
  cryptoAssets,
  goldHoldingValue,
  physicalGoldValue = 0,
  bourseGoldValue = 0,
  propertiesValue = 0,
  totalCryptoValue,
  totalPortfolioValue,
  tomanCashBalance,
  activeGoldFund,
  setActiveGoldFund,
  goldEtfUnitPrice,
  goldEtfUnitChange,
  settings,
  updateSettings,
  isRefreshing,
  currencyMode = 'toman',
  usdtRateTomans = 93000,
  toggleCurrencyMode = () => {},
  formatCurrency = (v) => `${formatToman(v)} تومان`,
  toDisplayValue = (v) => v,
  onRefreshAll,
  onApplyPurchases,
  onNavigateToTab,
  onNotify,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const goldPercentActual = totalPortfolioValue > 0 ? (goldHoldingValue / totalPortfolioValue) * 100 : 0;
  const cryptoPercentActual = totalPortfolioValue > 0 ? (totalCryptoValue / totalPortfolioValue) * 100 : 0;
  const cashPercentActual = totalPortfolioValue > 0 ? (tomanCashBalance / totalPortfolioValue) * 100 : 0;

  // Calculate Total Crypto Profit / Loss from cryptoAssets
  let totalCryptoCostTomans = 0;
  let hasCryptoCostData = false;

  for (const asset of cryptoAssets) {
    if (asset.currentAmount && asset.currentAmount > 0) {
      if (asset.totalCostTomans !== undefined && asset.totalCostTomans > 0) {
        totalCryptoCostTomans += asset.totalCostTomans;
        hasCryptoCostData = true;
      } else if (asset.averageBuyPrice && asset.averageBuyPrice > 0) {
        totalCryptoCostTomans += asset.currentAmount * asset.averageBuyPrice;
        hasCryptoCostData = true;
      }
    }
  }

  const totalCryptoProfitTomans = hasCryptoCostData && totalCryptoCostTomans > 0
    ? totalCryptoValue - totalCryptoCostTomans
    : undefined;

  const totalCryptoProfitPercent = hasCryptoCostData && totalCryptoCostTomans > 0 && totalCryptoProfitTomans !== undefined
    ? (totalCryptoProfitTomans / totalCryptoCostTomans) * 100
    : undefined;

  // Donut chart items: Distinct radiant gold for physical, rich amber gold for bourse
  const chartItems: DonutChartItem[] = [];

  if (physicalGoldValue > 0) {
    chartItems.push({
      id: 'physical_gold',
      label: 'طلای فیزیکی و سکه',
      value: toDisplayValue(physicalGoldValue),
      color: '#FBBF24', // Radiant Golden Yellow
      sublabel: 'طلا و مسکوکات',
    });
  }

  if (bourseGoldValue > 0) {
    chartItems.push({
      id: 'bourse_gold',
      label: 'صندوق‌های طلای بورس',
      value: toDisplayValue(bourseGoldValue),
      color: '#D97706', // Rich Amber Gold
      sublabel: 'صندوق‌های ETF طلا',
    });
  }

  // Fallback if neither sub-value is set independently but goldHoldingValue > 0
  if (chartItems.length === 0 && goldHoldingValue > 0) {
    chartItems.push({
      id: 'gold',
      label: 'طلا و صندوق‌های بورسی',
      value: toDisplayValue(goldHoldingValue),
      color: '#D4AF37',
      sublabel: `هدف: ${toPersianDigits(settings.goldPercent)}%`,
      targetPercent: settings.goldPercent,
    });
  }

  chartItems.push({
    id: 'crypto',
    label: 'ارزهای دیجیتال',
    value: toDisplayValue(totalCryptoValue),
    color: '#6366F1',
    sublabel: `هدف: ${toPersianDigits(settings.cryptoPercent)}%`,
    targetPercent: settings.cryptoPercent,
  });

  if (tomanCashBalance > 0) {
    chartItems.push({
      id: 'cash',
      label: 'موجودی نقدی نوبیتکس',
      value: toDisplayValue(tomanCashBalance),
      color: '#10B981',
      sublabel: 'نقد ریالی',
    });
  }

  const handleCopy = (id: string, text: string, msg: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onNotify?.(msg, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Check balance health
  const isGoldUnderweight = goldPercentActual < settings.goldPercent - 2;
  const isCryptoUnderweight = cryptoPercentActual < settings.cryptoPercent - 2;

  const totalPortfolioWithCash = totalPortfolioValue + tomanCashBalance;

  return (
    <PullToRefreshContainer onRefresh={onRefreshAll} isRefreshing={isRefreshing} className="space-y-5 pb-24">
      
      {/* 1. HERO NET WORTH CARD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-700/80 shadow-2xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/20 text-gold-400 flex items-center justify-center font-bold text-lg border border-gold-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 block">ارزش کل دارایی‌ها (سبد سرمایه)</span>
                {currencyMode === 'usd' && (
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    USD ($)
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5 dir-ltr text-right sm:text-right">
                {formatCurrency(totalPortfolioWithCash)}
              </h2>
              {currencyMode === 'usd' && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  نرخ مبنا: ۱ تتر = {formatToman(usdtRateTomans)} تومان
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Currency Mode Switch Button */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                toggleCurrencyMode();
              }}
              className={`px-3 py-2 rounded-2xl border text-xs font-black transition-all flex items-center gap-1.5 interactive-tap shadow-sm touch-target ${
                currencyMode === 'usd'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/80 shadow-emerald-500/10'
                  : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:text-gold-300 hover:border-gold-500/50'
              }`}
              title={currencyMode === 'usd' ? 'تغییر نمایش به تومان' : 'تغییر نمایش به دلار (بر مبنای نرخ تتر)'}
            >
              {currencyMode === 'usd' ? (
                <>
                  <span>🪙</span>
                  <span>نمایش به تومان</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>نمایش به دلار ($)</span>
                </>
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefreshAll}
              disabled={isRefreshing}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-gold-300 border border-slate-700 transition-all touch-target"
              title="به‌روزرسانی قیمت‌ها و دارایی‌ها"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-gold-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Breakdown chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
          
          {/* Physical Gold Chip (if present) */}
          {physicalGoldValue > 0 && (
            <div
              onClick={() => onNavigateToTab('holdings')}
              className="p-3 rounded-2xl bg-slate-950/80 border border-amber-400/40 hover:border-amber-400/70 transition-all cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-bold text-amber-300">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>طلای فیزیکی</span>
                </span>
                <span className="text-amber-300 font-bold">
                  {totalPortfolioValue > 0 ? formatPercent((physicalGoldValue / totalPortfolioValue) * 100) : '۰٪'}
                </span>
              </div>
              <div className="text-sm font-black text-slate-100 dir-ltr text-right">
                {formatCurrency(physicalGoldValue)}
              </div>
            </div>
          )}

          {/* Bourse Gold Chip (if present) */}
          {bourseGoldValue > 0 && (
            <div
              onClick={() => onNavigateToTab('gold')}
              className="p-3 rounded-2xl bg-slate-950/80 border border-amber-600/40 hover:border-amber-500/70 transition-all cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>طلای بورس</span>
                </span>
                <span className="text-amber-400 font-bold">
                  {totalPortfolioValue > 0 ? formatPercent((bourseGoldValue / totalPortfolioValue) * 100) : '۰٪'}
                </span>
              </div>
              <div className="text-sm font-black text-slate-100 dir-ltr text-right">
                {formatCurrency(bourseGoldValue)}
              </div>
            </div>
          )}

          {/* Single Gold Chip (fallback if neither sub-value > 0) */}
          {physicalGoldValue === 0 && bourseGoldValue === 0 && (
            <div
              onClick={() => onNavigateToTab('gold')}
              className="p-3 rounded-2xl bg-slate-950/80 border border-gold-500/30 hover:border-gold-500/60 transition-all cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-bold text-gold-400">
                  <Coins className="w-3.5 h-3.5" />
                  <span>مجموع طلا ({toPersianDigits(settings.goldPercent)}%)</span>
                </span>
                <span className="text-gold-300 font-bold">{formatPercent(goldPercentActual)}</span>
              </div>
              <div className="text-sm font-black text-slate-100 dir-ltr text-right">
                {formatCurrency(goldHoldingValue)}
              </div>
            </div>
          )}

          {/* Crypto Chip */}
          <div
            onClick={() => onNavigateToTab('crypto')}
            className="p-3 rounded-2xl bg-slate-950/80 border border-indigo-500/30 hover:border-indigo-500/60 transition-all cursor-pointer space-y-1"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-bold text-indigo-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>کریپتو ({toPersianDigits(settings.cryptoPercent)}%)</span>
              </span>
              <span className="text-indigo-300 font-bold">{formatPercent(cryptoPercentActual)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <div className="text-sm font-black text-slate-100 dir-ltr text-right">
                {formatCurrency(totalCryptoValue)}
              </div>
              {totalCryptoProfitTomans !== undefined && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-md dir-ltr inline-flex items-center gap-0.5 ${
                    totalCryptoProfitTomans >= 0
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {totalCryptoProfitTomans >= 0 ? '+' : ''}
                  {totalCryptoProfitPercent !== undefined ? formatPercent(totalCryptoProfitPercent, 1) : ''}
                </span>
              )}
            </div>
            {totalCryptoProfitTomans !== undefined && (
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">سود/زیان خالص:</span>
                <span
                  className={`font-bold dir-ltr ${
                    totalCryptoProfitTomans >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {totalCryptoProfitTomans >= 0 ? '+' : ''}
                  {formatCurrency(totalCryptoProfitTomans)}
                </span>
              </div>
            )}
          </div>

          {/* Real Estate / Properties Chip */}
          {propertiesValue > 0 && (
            <div
              onClick={() => onNavigateToTab('properties')}
              className="p-3 rounded-2xl bg-slate-950/80 border border-teal-500/30 hover:border-teal-500/60 transition-all cursor-pointer space-y-1 col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-bold text-teal-400">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>املاک و مستغلات</span>
                </span>
                <span className="text-teal-300 font-bold">
                  {totalPortfolioValue + propertiesValue > 0
                    ? formatPercent((propertiesValue / (totalPortfolioValue + propertiesValue)) * 100)
                    : '۰٪'}
                </span>
              </div>
              <div className="text-sm font-black text-slate-100 dir-ltr text-right">
                {formatCurrency(propertiesValue)}
              </div>
            </div>
          )}

          {/* Nobitex Cash Chip */}
          {tomanCashBalance > 0 && (
            <div
              onClick={() => onNavigateToTab('crypto')}
              className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer space-y-1 col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-bold text-emerald-400">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>نقد نوبیتکس</span>
                </span>
                <span className="text-emerald-300 font-bold">{formatPercent(cashPercentActual)}</span>
              </div>
              <div className="text-sm font-black text-slate-100 dir-ltr text-right">
                {formatCurrency(tomanCashBalance)}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 2. PORTFOLIO 80/20 ALLOCATION DONUT CHART */}
      <div className="glass-card p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center font-bold text-sm">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100">ترکیب سبد دارایی و وضعیت تعادل</h3>
              <p className="text-[11px] text-slate-400">
                هدف: {toPersianDigits(settings.goldPercent)}% طلا و مسکوکات / {toPersianDigits(settings.cryptoPercent)}% ارزهای دیجیتال
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('settings')}
            className="text-[11px] text-slate-400 hover:text-gold-400 font-bold transition-colors"
          >
            تغییر نسبت‌ها
          </button>
        </div>

        <PortfolioDonutChart
          items={chartItems}
          centerTitle="ارزش کل سبد"
          formattedTotalValue={formatCurrency(totalPortfolioValue)}
          centerSubtitle={
            currencyMode === 'toman' && usdtRateTomans > 0
              ? `≈ $${toPersianDigits(Number((totalPortfolioValue / usdtRateTomans).toFixed(1)))}`
              : undefined
          }
          size={210}
          strokeWidth={22}
        />

        {/* Health status banner */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            isGoldUnderweight
              ? 'bg-amber-950/30 border-gold-500/40 text-gold-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isGoldUnderweight ? 'bg-gold-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span>
              طلا: {formatPercent(goldPercentActual)} {isGoldUnderweight && '📉 نیاز به خرید'}
            </span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            isCryptoUnderweight
              ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isCryptoUnderweight ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span>
              کریپتو: {formatPercent(cryptoPercentActual)} {isCryptoUnderweight && '📉 نیاز به خرید'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. CAPITAL INPUT CARD */}
      <CapitalInputCard
        inputAmount={totalInputAmount}
        setInputAmount={setTotalInputAmount}
        settings={settings}
        updateSettings={updateSettings}
        totalSavingsAmount={calculationResult.totalSavingsAmount}
        goldBuyAmount={calculationResult.goldBuyAmount}
        cryptoBuyAmount={calculationResult.cryptoBuyAmount}
      />

      {/* 4. BUYING RECOMMENDATIONS */}
      {totalInputAmount > 0 && calculationResult.totalSavingsAmount > 0 && (
        <div className="space-y-4 animate-fadeIn">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-400" />
                <span>پیشنهاد هوشمند خرید دارایی‌ها</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                بر اساس فرمول بازتعادل جهت رسیدن سبد به نسبت {toPersianDigits(settings.goldPercent)} / {toPersianDigits(settings.cryptoPercent)}
              </p>
            </div>

            <button
              onClick={() => {
                triggerHaptic('medium');
                onApplyPurchases();
              }}
              className="self-start sm:self-auto px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-gold-500 hover:from-amber-300 hover:to-gold-400 text-slate-950 font-black text-xs transition-all shadow-gold-glow interactive-tap shrink-0"
            >
              ثبت همه خریدها
            </button>
          </div>

          {/* Gold Buy Card */}
          <GoldBuyCard
            goldBuyAmount={calculationResult.goldBuyAmount}
            goldPercent={settings.goldPercent}
          />

          {/* Crypto Buy Cards */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>ارزهای دیجیتال پیشنهادی برای خرید:</span>
              </h4>
              {totalCryptoProfitTomans !== undefined && (
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-lg dir-ltr inline-flex items-center gap-1 ${
                    totalCryptoProfitTomans >= 0
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <span>سود کل کریپتو:</span>
                  <span>{totalCryptoProfitTomans >= 0 ? '+' : ''}{formatCurrency(totalCryptoProfitTomans)}</span>
                  <span>({totalCryptoProfitPercent !== undefined ? formatPercent(totalCryptoProfitPercent, 1) : '0%'})</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {calculationResult.cryptoBuys.map((buy) => {
                const isCopied = copiedId === buy.id;
                return (
                  <div
                    key={buy.id}
                    className={`p-4 rounded-3xl border transition-all ${
                      buy.suggestedBuy > 0
                        ? 'bg-slate-900 border-indigo-500/40 shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: buy.color }}
                        />
                        <span className="font-black text-sm text-slate-100">{buy.symbol}</span>
                        <span className="text-[10px] text-slate-400">{buy.name}</span>
                      </div>

                      <span className="text-[11px] font-bold text-indigo-400">
                        وزن هدف: {toPersianDigits(buy.targetPercent)}%
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">مبلغ خرید پیشنهادی:</span>
                        <span className={`text-sm font-black dir-ltr text-right ${buy.suggestedBuy > 0 ? 'text-indigo-300' : 'text-slate-500'}`}>
                          {formatCurrency(buy.suggestedBuy)}
                        </span>
                      </div>

                      {buy.suggestedBuy > 0 && (
                        <button
                          onClick={() => handleCopy(buy.id, String(buy.suggestedBuy), `مبلغ ${buy.symbol} کپی شد`)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-300 border border-slate-700 transition-all touch-target"
                          title="کپی مبلغ"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </PullToRefreshContainer>
  );
};
