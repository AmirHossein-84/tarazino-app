import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, TrendingUp, Layers, ChevronDown } from 'lucide-react';
import { useMarketData } from '../../hooks/useMarketData';
import { formatToman, formatPercent, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { MarketInstrument, MarketQuote } from '../../services/marketData/types';

interface GoldBuyCardProps {
  goldBuyAmount: number;
  goldPercent: number;
}

// Built-in popular TSETMC Gold Funds for immediate selection if user hasn't added one yet
const DEFAULT_GOLD_ETFS: { symbol: string; name: string; insCode: string }[] = [
  { symbol: 'عیار', name: 'صندوق س. پشتوانه طلای لوتوس', insCode: '34144395039913458' },
  { symbol: 'طلا', name: 'صندوق س. پشتوانه طلای زرافشان', insCode: '26656708390708948' },
  { symbol: 'کهربا', name: 'صندوق س. طلا کهربا', insCode: '35700344742885862' },
  { symbol: 'زر', name: 'صندوق س. زرین آگاه', insCode: '58774780517865203' },
  { symbol: 'گوهر', name: 'صندوق س. گوهر نفیس', insCode: '31388527814418318' },
];

export const GoldBuyCard: React.FC<GoldBuyCardProps> = ({
  goldBuyAmount,
  goldPercent,
}) => {
  const { instruments, quotes, refreshQuotes } = useMarketData();

  // Find all gold ETFs available in user holdings or defaults
  const userGoldInstruments = instruments.filter(
    (i) =>
      i.assetType === 'etf' ||
      i.symbol.includes('عیار') ||
      i.symbol.includes('طلا') ||
      i.symbol.includes('کهربا') ||
      i.symbol.includes('زر')
  );

  const availableGoldList = userGoldInstruments.length > 0
    ? userGoldInstruments
    : DEFAULT_GOLD_ETFS.map((g) => ({
        id: `default_${g.symbol}`,
        provider: 'tsetmc' as const,
        providerInstrumentId: g.insCode,
        symbol: g.symbol,
        name: g.name,
        assetType: 'etf' as const,
        createdAt: '',
        updatedAt: '',
      }));

  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    availableGoldList[0]?.symbol || 'عیار'
  );
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedUnits, setCopiedUnits] = useState(false);

  const currentInstrument = availableGoldList.find((g) => g.symbol === selectedSymbol) || availableGoldList[0];
  const quote: MarketQuote | undefined = currentInstrument ? quotes[currentInstrument.id] : undefined;

  // Fallback price if quote not loaded yet (e.g. 35,000 Tomans)
  const unitPriceTomans = quote && quote.lastPriceTomans > 0 ? quote.lastPriceTomans : 35000;
  const unitsToBuy = unitPriceTomans > 0 ? Math.floor(goldBuyAmount / unitPriceTomans) : 0;
  const exactBuyValue = unitsToBuy * unitPriceTomans;

  const handleCopyAmount = () => {
    triggerHaptic('success');
    navigator.clipboard.writeText(String(exactBuyValue > 0 ? exactBuyValue : goldBuyAmount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleCopyUnits = () => {
    triggerHaptic('success');
    navigator.clipboard.writeText(String(unitsToBuy));
    setCopiedUnits(true);
    setTimeout(() => setCopiedUnits(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-950 border border-gold-400/40 dark:border-gold-500/40 shadow-sm dark:shadow-lg relative overflow-hidden space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-gold-500 to-yellow-600 p-[2px]">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center text-xl">
              🥇
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                خرید پیشنهادی <span className="gold-gradient-text">صندوق طلای بورس (TSETMC)</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 dark:bg-amber-500/20 text-amber-800 dark:text-gold-300 border border-amber-500/30 dark:border-gold-500/30 font-bold">
                {toPersianDigits(goldPercent)}٪ سهم پس‌انداز
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              محاسبه زنده بر اساس نرخ تابلو بورس تهران (صندوق منتخب: {selectedSymbol})
            </p>
          </div>
        </div>

        {/* Gold ETF Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium ml-1">صندوق طلا:</span>
          {availableGoldList.map((etf) => (
            <button
              key={etf.symbol}
              onClick={() => {
                triggerHaptic('light');
                setSelectedSymbol(etf.symbol);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all interactive-tap ${
                selectedSymbol === etf.symbol
                  ? 'bg-amber-500/20 text-amber-800 dark:text-gold-300 border border-gold-500/50'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {etf.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Main Amounts Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Toman Value Box */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-950/90 border border-amber-200 dark:border-amber-500/30 flex items-center justify-between shadow-sm dark:shadow-none">
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              مبلغ کل خرید طلا به تومان
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-gold-400 dir-ltr">
              {formatToman(goldBuyAmount)}{' '}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تومان</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 dir-ltr font-medium">
                نرخ واحد: <strong className="text-slate-800 dark:text-slate-200">{formatToman(unitPriceTomans)} ت</strong>
              </span>
              {quote && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-md dir-ltr ${
                    quote.priceChangePercent >= 0
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {quote.priceChangePercent >= 0 ? '+' : ''}{formatPercent(quote.priceChangePercent)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleCopyAmount}
            className={`p-3 rounded-2xl border transition-all interactive-tap touch-target ${
              copiedAmount
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 hover:text-amber-700 dark:text-slate-300 dark:hover:text-gold-400 border border-slate-200 dark:border-slate-700/80'
            }`}
            title="کپی مبلغ به تومان"
          >
            {copiedAmount ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Calculated Units Box */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-950/90 border border-amber-200 dark:border-amber-500/30 flex items-center justify-between shadow-sm dark:shadow-none">
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400" />
              <span>تعداد واحد / برگه قابل سفارش در کارگزاری</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 dir-ltr">
              {toPersianDigits(new Intl.NumberFormat('en-US').format(unitsToBuy))}{' '}
              <span className="text-xs font-bold text-amber-700 dark:text-gold-400">واحد {selectedSymbol}</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              مبلغ دقیق سفارش: {formatToman(exactBuyValue)} تومان
            </span>
          </div>
          <button
            onClick={handleCopyUnits}
            className={`p-3 rounded-2xl border transition-all interactive-tap touch-target ${
              copiedUnits
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 hover:text-amber-700 dark:text-slate-300 dark:hover:text-gold-400 border border-slate-200 dark:border-slate-700/80'
            }`}
            title="کپی تعداد واحد جهت ثبت در کارگزاری"
          >
            {copiedUnits ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

      </div>

      {/* TSETMC Live Tip Footer */}
      <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20 flex items-center gap-2.5">
        <TrendingUp className="w-4 h-4 text-amber-600 dark:text-gold-400 shrink-0" />
        <p className="leading-relaxed">
          کافیست در ایزی‌تریدر یا کارگزاری خود نماد <strong>{selectedSymbol}</strong> را سرچ کرده و <strong>{toPersianDigits(unitsToBuy)} واحد</strong> با قیمت <strong>{formatToman(unitPriceTomans)} تومان</strong> سفارش خرید ثبت کنید.
        </p>
      </div>

    </div>
  );
};
