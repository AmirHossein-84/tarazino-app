import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  Search,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Coins,
  Sparkles,
  Sliders,
  DollarSign,
  Activity,
  ShieldCheck,
  Pencil,
} from 'lucide-react';
import { CryptoAsset } from '../../types/investment';
import { useNobitex } from '../../hooks/useNobitex';
import { NobitexMarketStat } from '../../services/nobitex/types';
import { nobitexService } from '../../services/nobitex';
import { PortfolioDonutChart, DonutChartItem } from '../common/PortfolioDonutChart';
import { PullToRefreshContainer } from '../common/PullToRefreshContainer';
import { CardSkeleton } from '../common/SkeletonLoader';
import { NobitexIntegrationCard } from './NobitexIntegrationCard';
import { EditAssetModal } from '../holdings/EditAssetModal';
import { formatToman, formatPercent, toPersianDigits, getPersianFormattedDate } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';
import { redactSecrets, toSafeNumber } from '../../utils/security';

interface CryptoMarketViewProps {
  cryptoAssets: CryptoAsset[];
  activeProfileId?: string | null;
  currencyMode?: CurrencyDisplayMode;
  formatCurrency?: (amountTomans: number, options?: any) => string;
  toDisplayValue?: (amountTomans: number) => number;
  onAssetsUpdated: (assets: CryptoAsset[]) => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

const POPULAR_TICKERS = [
  { symbol: 'btc', name: 'بیت‌کوین', enName: 'Bitcoin', color: '#F7931A' },
  { symbol: 'eth', name: 'اتریوم', enName: 'Ethereum', color: '#627EEA' },
  { symbol: 'sol', name: 'سولانا', enName: 'Solana', color: '#14F195' },
  { symbol: 'xrp', name: 'ریپل', enName: 'XRP', color: '#23292F' },
  { symbol: 'usdt', name: 'تتر', enName: 'Tether USD', color: '#26A17B' },
  { symbol: 'bnb', name: 'بایننس‌کوین', enName: 'BNB', color: '#F3BA2F' },
  { symbol: 'doge', name: 'دوج‌کوین', enName: 'Dogecoin', color: '#C2A633' },
  { symbol: 'trx', name: 'ترون', enName: 'TRON', color: '#FF0013' },
  { symbol: 'ada', name: 'کاردانو', enName: 'Cardano', color: '#0033AD' },
  { symbol: 'pol', name: 'پالیگان', enName: 'Polygon', color: '#8247E5' },
  { symbol: 'dot', name: 'پولکادات', enName: 'Polkadot', color: '#E6007A' },
  { symbol: 'avax', name: 'آوالانچ', enName: 'Avalanche', color: '#E84142' },
  { symbol: 'sui', name: 'سویی', enName: 'Sui', color: '#2A82E4' },
  { symbol: 'near', name: 'نیر پروتکل', enName: 'NEAR Protocol', color: '#00C08B' },
  { symbol: 'link', name: 'چین‌لینک', enName: 'Chainlink', color: '#375BD2' },
  { symbol: 'not', name: 'نات‌کوین', enName: 'Notcoin', color: '#EAB308' },
];

export const CryptoMarketView: React.FC<CryptoMarketViewProps> = ({
  cryptoAssets,
  activeProfileId,
  currencyMode = 'toman',
  formatCurrency = (v, opts) => `${formatToman(v)} ${opts?.isTomanSuffix ? 'ت' : 'تومان'}`,
  toDisplayValue = (v) => v,
  onAssetsUpdated,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [marketStats, setMarketStats] = useState<Record<string, NobitexMarketStat>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [editingAsset, setEditingAsset] = useState<CryptoAsset | null>(null);

  const { isConfigured, isSyncing, syncWithNobitex, tomanCashBalance } = useNobitex(activeProfileId);

  const cryptoAssetsRef = useRef(cryptoAssets);
  cryptoAssetsRef.current = cryptoAssets;

  const onAssetsUpdatedRef = useRef(onAssetsUpdated);
  onAssetsUpdatedRef.current = onAssetsUpdated;

  const activeProfileIdRef = useRef<string | null | undefined>(activeProfileId);
  activeProfileIdRef.current = activeProfileId;

  const isMountedRef = useRef(true);
  const statsAbortRef = useRef<AbortController | null>(null);
  const fetchGenRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      statsAbortRef.current?.abort();
    };
  }, []);

  // Fetch live market stats for all coins
  const fetchMarketStats = useCallback(async () => {
    statsAbortRef.current?.abort();
    const controller = new AbortController();
    statsAbortRef.current = controller;

    const reqGen = ++fetchGenRef.current;
    const reqProfileId = activeProfileIdRef.current ?? null;

    setIsLoadingStats(true);
    try {
      const stats = await nobitexService.getMarketStats(undefined, 'rls', controller.signal);
      if (
        !isMountedRef.current ||
        controller.signal.aborted ||
        reqGen !== fetchGenRef.current ||
        (activeProfileIdRef.current ?? null) !== reqProfileId
      ) {
        return;
      }

      setMarketStats(stats);
      setLastUpdated(new Date());

      // Also update unit prices of existing crypto assets using latest profile snapshot
      const latestAssets = cryptoAssetsRef.current;
      let hasPriceChanges = false;
      const updatedAssets = latestAssets.map((asset) => {
        const sym = asset.symbol.toLowerCase();
        const stat = stats[`${sym}-rls`];
        if (stat && stat.latest) {
          const parsedRials = Number.parseFloat(stat.latest);
          if (!Number.isFinite(parsedRials) || parsedRials <= 0) {
            return asset;
          }
          const priceTomans = Math.round(parsedRials / 10);
          const holdingVal =
            asset.currentAmount !== undefined && Number.isFinite(asset.currentAmount)
              ? Math.round(asset.currentAmount * priceTomans)
              : toSafeNumber(asset.currentHoldingValue, 0);

          const totalCost =
            asset.totalCostTomans && Number.isFinite(asset.totalCostTomans)
              ? asset.totalCostTomans
              : asset.averageBuyPrice && asset.currentAmount
              ? Math.round(asset.currentAmount * asset.averageBuyPrice)
              : undefined;
          const profitTomans =
            totalCost !== undefined && totalCost > 0 ? holdingVal - totalCost : undefined;
          const profitPercent =
            totalCost !== undefined && totalCost > 0
              ? ((holdingVal - totalCost) / totalCost) * 100
              : undefined;

          if (
            asset.unitPrice !== priceTomans ||
            asset.currentHoldingValue !== holdingVal ||
            asset.profitTomans !== profitTomans
          ) {
            hasPriceChanges = true;
          }

          return {
            ...asset,
            unitPrice: priceTomans,
            currentHoldingValue: holdingVal,
            profitTomans,
            profitPercent,
          };
        }
        return asset;
      });

      if (hasPriceChanges) {
        onAssetsUpdatedRef.current(updatedAssets);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      console.warn('Failed to fetch Nobitex market stats:', redactSecrets(e?.message || String(e)));
    } finally {
      if (isMountedRef.current && reqGen === fetchGenRef.current) {
        setIsLoadingStats(false);
      }
    }
  }, []);

  useEffect(() => {
    setEditingAsset(null);
    fetchMarketStats();
    const interval = setInterval(fetchMarketStats, 60000);
    return () => {
      clearInterval(interval);
      statsAbortRef.current?.abort();
    };
  }, [activeProfileId, fetchMarketStats]);

  const handleRefresh = async () => {
    triggerHaptic('light');
    const tasks: Promise<unknown>[] = [fetchMarketStats()];
    if (isConfigured) {
      tasks.push(syncWithNobitex(cryptoAssetsRef.current, onAssetsUpdatedRef.current));
    }
    const results = await Promise.allSettled(tasks);
    const hasFailure = results.some((r) => r.status === 'rejected');
    onNotify?.(
      hasFailure
        ? 'به‌روزرسانی بخشی از اطلاعات با خطا مواجه شد'
        : 'قیمت‌های بازار و سوابق معاملات رمزارز به‌روزرسانی شدند',
      hasFailure ? 'warning' : 'success'
    );
  };

  const totalCryptoValue = cryptoAssets.reduce(
    (sum, a) => sum + (a.currentHoldingValue || 0),
    0
  );

  // User's owned active crypto assets
  const userOwnedAssets = cryptoAssets.filter(
    (a) => (a.currentHoldingValue || 0) > 0 || (a.currentAmount || 0) > 0
  );

  // Compute Total Cost & Profit across owned crypto
  const totalCryptoCost = userOwnedAssets.reduce((sum, a) => {
    if (a.totalCostTomans !== undefined && a.totalCostTomans > 0) {
      return sum + a.totalCostTomans;
    }
    if (a.averageBuyPrice && a.currentAmount) {
      return sum + Math.round(a.currentAmount * a.averageBuyPrice);
    }
    return sum;
  }, 0);

  const hasCostData = totalCryptoCost > 0;
  const totalCryptoProfitTomans = hasCostData ? totalCryptoValue - totalCryptoCost : undefined;
  const totalCryptoProfitPercent = hasCostData ? (totalCryptoProfitTomans! / totalCryptoCost) * 100 : undefined;

  // Build Donut Items from user owned crypto assets
  const donutItems: DonutChartItem[] = cryptoAssets
    .filter((a) => (a.currentHoldingValue || 0) > 0)
    .map((a) => ({
      id: a.id,
      label: a.name,
      value: toDisplayValue(a.currentHoldingValue || 0),
      color: a.color,
      sublabel: a.isHoldingOnly
        ? `${a.symbol} (فقط نگهداری)`
        : `${a.symbol} (${toPersianDigits(a.targetPercent)}%)`,
    }));

  // Filter ticker list by search query
  const filteredTickers = POPULAR_TICKERS.filter((ticker) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      ticker.name.toLowerCase().includes(q) ||
      ticker.symbol.toLowerCase().includes(q) ||
      ticker.enName.toLowerCase().includes(q)
    );
  });

  const handleSaveAsset = (id: string, updates: Partial<CryptoAsset>) => {
    const updated = cryptoAssets.map((a) => (a.id === id ? { ...a, ...updates } : a));
    onAssetsUpdated(updated);
    onNotify?.('تغییرات دارایی با موفقیت ذخیره شد', 'success');
  };

  const handleDeleteAsset = (id: string) => {
    const updated = cryptoAssets.filter((a) => a.id !== id);
    onAssetsUpdated(updated);
    onNotify?.('ارز مورد نظر از سبد حذف شد', 'info');
  };

  return (
    <>
      <PullToRefreshContainer onRefresh={handleRefresh} isRefreshing={isLoadingStats || isSyncing} className="space-y-5 min-w-0">
        
        {/* 1. NOBITEX INTEGRATION HERO */}
        <NobitexIntegrationCard
          cryptoAssets={cryptoAssets}
          onAssetsUpdated={onAssetsUpdated}
          onNotify={onNotify}
        />

        {/* 2. PORTFOLIO P&L SUMMARY BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1 min-w-0">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">
              ارزش کل دارایی‌های کریپتو
            </span>
            <div className="text-xs sm:text-base font-black text-indigo-700 dark:text-indigo-400 dir-ltr text-right tabular-nums truncate">
              {formatCurrency(totalCryptoValue)}
            </div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1 min-w-0">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">
              سود / زیان کل کریپتو
            </span>
            {totalCryptoProfitTomans !== undefined ? (
              <div
                className={`text-xs sm:text-base font-black flex flex-wrap items-center gap-1 dir-ltr text-right tabular-nums min-w-0 ${
                  totalCryptoProfitTomans >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                <span className="truncate">{totalCryptoProfitTomans >= 0 ? '+' : ''}{formatCurrency(totalCryptoProfitTomans)}</span>
                <span className="text-[10px] font-bold shrink-0">
                  ({totalCryptoProfitPercent !== undefined ? formatPercent(totalCryptoProfitPercent) : '0%'})
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block truncate">
                {userOwnedAssets.length > 0 ? 'برای محاسبه روی ارزها بزنید' : 'بدون دارایی فعال'}
              </span>
            )}
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1 col-span-2 sm:col-span-1 min-w-0">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">
              موجودی نقد نوبیتکس
            </span>
            <div className="text-xs sm:text-base font-black text-emerald-700 dark:text-emerald-400 dir-ltr text-right tabular-nums truncate">
              {formatCurrency(tomanCashBalance)}
            </div>
          </div>
        </div>

        {/* 3. CRYPTO PORTFOLIO DONUT CHART (Above Holdings) */}
        {donutItems.length > 0 && (
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-500/30 shadow-md dark:shadow-xl space-y-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                  ترکیب دارایی‌های کریپتو
                </h3>
              </div>
              <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 dir-ltr tabular-nums shrink-0">
                مجموع: {formatCurrency(totalCryptoValue, { isTomanSuffix: true })}
              </span>
            </div>

            <PortfolioDonutChart
              items={donutItems}
              centerTitle="مجموع رمزارزها"
              formattedTotalValue={formatCurrency(totalCryptoValue)}
              size={200}
              strokeWidth={22}
            />
          </div>
        )}

        {/* 4. USER OWNED CRYPTO HOLDINGS WITH PROFIT / LOSS */}
        {userOwnedAssets.length > 0 && (
          <div className="glass-card p-4 sm:p-5 border border-indigo-200 dark:border-indigo-500/30 shadow-md dark:shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  موجودی و سود/زیان دارایی‌های شما
                </h3>
              </div>
              <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 dir-ltr">
                {toPersianDigits(userOwnedAssets.length)} ارز در سبد
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {userOwnedAssets.map((asset) => {
                const profitPct = asset.profitPercent;
                const profitVal = asset.profitTomans;
                const hasProfit = profitPct !== undefined && profitVal !== undefined;
                const isProfitPositive = (profitPct || 0) >= 0;

                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setEditingAsset(asset);
                    }}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all space-y-2.5 cursor-pointer interactive-tap group shadow-sm dark:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: asset.color }}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 dark:text-slate-100 text-sm leading-none">{asset.symbol}</span>
                            {asset.isHoldingOnly ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold leading-none shrink-0">
                                فقط نگهداری
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold leading-none shrink-0">
                                وزن: {toPersianDigits(asset.targetPercent)}%
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate pt-0.5">
                            {asset.currentAmount !== undefined && asset.currentAmount > 0
                              ? `${toPersianDigits(asset.currentAmount.toFixed(4))} ${asset.symbol}`
                              : asset.name}
                          </span>
                        </div>
                      </div>

                      {/* Profit/Loss Badge */}
                      {hasProfit ? (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md inline-flex items-center gap-0.5 dir-ltr shrink-0 ${
                            isProfitPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                          }`}
                        >
                          {isProfitPositive ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          <span>{isProfitPositive ? '+' : ''}{formatPercent(profitPct, 1)}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 shrink-0 inline-flex items-center gap-1">
                          <Pencil className="w-3 h-3" />
                          <span>ثبت قیمت خرید</span>
                        </span>
                      )}
                    </div>

                    {/* Pricing & Valuation Details */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/80 flex items-start justify-between gap-2 text-xs min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">ارزش فعلی:</span>
                        <span className="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-300 dir-ltr text-right tabular-nums truncate block">
                          {formatCurrency(asset.currentHoldingValue, { isTomanSuffix: true })}
                        </span>
                      </div>

                      <div className="text-left shrink-0 max-w-[48%] min-w-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                          {asset.averageBuyPrice ? 'میانگین خرید:' : 'نرخ روز:'}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 dir-ltr text-right tabular-nums truncate block">
                          {asset.averageBuyPrice
                            ? formatCurrency(asset.averageBuyPrice, { isUnitPrice: true, isTomanSuffix: true })
                            : asset.unitPrice
                            ? formatCurrency(asset.unitPrice, { isUnitPrice: true, isTomanSuffix: true })
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Net Profit amount */}
                    {hasProfit && (
                      <div className={`flex items-center justify-between gap-2 text-[11px] px-2 py-1 rounded-lg border min-w-0 ${
                        isProfitPositive
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-rose-500/10 border-rose-500/20'
                      }`}>
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">سود / زیان خالص:</span>
                        <span className={`font-black dir-ltr tabular-nums truncate min-w-0 ${isProfitPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                          {isProfitPositive ? '+' : ''}{formatCurrency(profitVal, { isTomanSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. LIVE MARKET TICKERS & WATCHLIST */}
        <div className="space-y-3">
          
          {/* Search & Filter */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                قیمت لحظه‌ای بازار نوبیتکس
              </h3>
            </div>

            {lastUpdated && (
              <span className="text-[10px] text-slate-500">
                بروزرسانی: {getPersianFormattedDate(lastUpdated)}
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام یا نماد رمزارز (بیت‌کوین، ETH, SOL...)"
              className="w-full bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 pl-10"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Tickers Grid or Skeleton */}
          {isLoadingStats && Object.keys(marketStats).length === 0 ? (
            <CardSkeleton count={6} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredTickers.map((ticker) => {
                const statKey = `${ticker.symbol}-rls`;
                const stat = marketStats[statKey];
                const priceTomans = stat?.latest ? Math.round(parseFloat(stat.latest) / 10) : 0;
                const dayChange = stat?.dayChange ? parseFloat(stat.dayChange) : 0;
                const isPositive = dayChange >= 0;

                // Check if user owns this coin
                const userAsset = cryptoAssets.find((a) => a.symbol.toLowerCase() === ticker.symbol);
                const userCoinAmount = userAsset?.currentAmount || 0;

                return (
                  <div
                    key={ticker.symbol}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-indigo-300 dark:hover:border-slate-700 transition-all space-y-2 shadow-sm dark:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                          style={{ backgroundColor: `${ticker.color}25`, color: ticker.color }}
                        >
                          {ticker.symbol.toUpperCase().slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                              {ticker.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {ticker.symbol.toUpperCase()}
                            </span>
                          </div>
                          {userCoinAmount > 0 && (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block truncate">
                              موجودی شما: {toPersianDigits(userCoinAmount)} {ticker.symbol.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left space-y-0.5 shrink-0 max-w-[46%] min-w-0">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 block dir-ltr text-right tabular-nums truncate">
                          {priceTomans > 0
                            ? formatCurrency(priceTomans, { isUnitPrice: true, isTomanSuffix: true })
                            : 'در حال دریافت...'}
                        </span>
                        {stat?.dayChange !== undefined && (
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
                            <span>{formatPercent(Math.abs(dayChange))}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </PullToRefreshContainer>

      {/* Edit Crypto Asset Modal */}
      <EditAssetModal
        asset={editingAsset}
        isOpen={Boolean(editingAsset)}
        onClose={() => setEditingAsset(null)}
        onSave={handleSaveAsset}
        onDelete={handleDeleteAsset}
      />
    </>
  );
};
