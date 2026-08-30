import React, { useState, useEffect } from 'react';
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

interface CryptoMarketViewProps {
  cryptoAssets: CryptoAsset[];
  currencyMode?: CurrencyDisplayMode;
  formatCurrency?: (amountTomans: number, options?: any) => string;
  toDisplayValue?: (amountTomans: number) => number;
  onAssetsUpdated: (assets: CryptoAsset[]) => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void;
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

  const { isConfigured, isSyncing, syncWithNobitex, tomanCashBalance } = useNobitex();

  // Fetch live market stats for all coins
  const fetchMarketStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await nobitexService.getMarketStats(undefined, 'rls');
      setMarketStats(stats);
      setLastUpdated(new Date());

      // Also update unit prices of existing crypto assets
      const updatedAssets = cryptoAssets.map((asset) => {
        const sym = asset.symbol.toLowerCase();
        const stat = stats[`${sym}-rls`];
        if (stat && stat.latest) {
          const priceTomans = Math.round(parseFloat(stat.latest) / 10);
          const holdingVal =
            asset.currentAmount !== undefined
              ? Math.round(asset.currentAmount * priceTomans)
              : asset.currentHoldingValue;

          const totalCost = asset.totalCostTomans || (asset.averageBuyPrice && asset.currentAmount ? Math.round(asset.currentAmount * asset.averageBuyPrice) : undefined);
          const profitTomans = totalCost !== undefined && totalCost > 0 ? holdingVal - totalCost : undefined;
          const profitPercent = totalCost !== undefined && totalCost > 0 ? ((holdingVal - totalCost) / totalCost) * 100 : undefined;

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

      onAssetsUpdated(updatedAssets);
    } catch (e: any) {
      console.warn('Failed to fetch Nobitex market stats:', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchMarketStats();
    const interval = setInterval(fetchMarketStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    triggerHaptic('light');
    await fetchMarketStats();
    if (isConfigured) {
      await syncWithNobitex(cryptoAssets, onAssetsUpdated);
    }
    onNotify?.('قیمت‌های بازار و سوابق معاملات رمزارز به‌روزرسانی شدند', 'success');
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
      sublabel: `${a.symbol} (${toPersianDigits(a.targetPercent)}%)`,
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
      <PullToRefreshContainer onRefresh={handleRefresh} isRefreshing={isLoadingStats || isSyncing} className="space-y-5 pb-24">
        
        {/* 1. NOBITEX INTEGRATION HERO */}
        <NobitexIntegrationCard
          cryptoAssets={cryptoAssets}
          onAssetsUpdated={onAssetsUpdated}
          onNotify={onNotify}
        />

        {/* 2. PORTFOLIO P&L SUMMARY BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
              ارزش کل دارایی‌های کریپتو
            </span>
            <div className="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-400 dir-ltr text-right">
              {formatCurrency(totalCryptoValue)}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
              سود / زیان کل کریپتو
            </span>
            {totalCryptoProfitTomans !== undefined ? (
              <div
                className={`text-sm sm:text-base font-black flex items-center gap-1 dir-ltr text-right ${
                  totalCryptoProfitTomans >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                <span>{totalCryptoProfitTomans >= 0 ? '+' : ''}{formatCurrency(totalCryptoProfitTomans)}</span>
                <span className="text-[10px] font-bold">
                  ({totalCryptoProfitPercent !== undefined ? formatPercent(totalCryptoProfitPercent) : '0%'})
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                {userOwnedAssets.length > 0 ? 'برای محاسبه روی ارزها بزنید' : 'بدون دارایی فعال'}
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
              موجودی نقد نوبیتکس
            </span>
            <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 dir-ltr text-right">
              {formatCurrency(tomanCashBalance)}
            </div>
          </div>
        </div>

        {/* 3. CRYPTO PORTFOLIO DONUT CHART (Above Holdings) */}
        {donutItems.length > 0 && (
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-500/30 shadow-md dark:shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                  <Coins className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  ترکیب دارایی‌های کریپتو
                </h3>
              </div>
              <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 dir-ltr">
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
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold leading-none shrink-0">
                              وزن: {toPersianDigits(asset.targetPercent)}%
                            </span>
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
                        <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 shrink-0">
                          ثبت قیمت خرید ✏️
                        </span>
                      )}
                    </div>

                    {/* Pricing & Valuation Details */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">ارزش فعلی:</span>
                        <span className="font-black text-indigo-700 dark:text-indigo-300 dir-ltr text-right block">
                          {formatCurrency(asset.currentHoldingValue, { isTomanSuffix: true })}
                        </span>
                      </div>

                      <div className="text-left">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          {asset.averageBuyPrice ? 'میانگین خرید:' : 'نرخ روز:'}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 dir-ltr text-right block">
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
                      <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-500 dark:text-slate-400">سود / زیان خالص:</span>
                        <span className={`font-bold dir-ltr ${isProfitPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
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
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">
                              موجودی شما: {userCoinAmount} {ticker.symbol.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left space-y-0.5 shrink-0">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 block dir-ltr text-right">
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

                    {/* Additional 24h high/low stats if available */}
                    {stat && stat.dayHigh && stat.dayLow && (
                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span>
                          کف ۲۴ ساعته: <strong className="text-slate-700 dark:text-slate-300 dir-ltr">{formatCurrency(Math.round(parseFloat(stat.dayLow) / 10), { isUnitPrice: true, isTomanSuffix: true })}</strong>
                        </span>
                        <span>
                          سقف ۲۴ ساعته: <strong className="text-slate-700 dark:text-slate-300 dir-ltr">{formatCurrency(Math.round(parseFloat(stat.dayHigh) / 10), { isUnitPrice: true, isTomanSuffix: true })}</strong>
                        </span>
                      </div>
                    )}
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
