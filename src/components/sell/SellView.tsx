import React, { useState, useMemo } from 'react';
import {
  ArrowDownCircle,
  Coins,
  TrendingUp,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  PieChart,
  ShieldCheck,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { AppSettings, CryptoAsset, PhysicalGoldItem, PhysicalGoldType } from '../../types/investment';
import { CombinedMarketItem } from '../../hooks/useMarketData';
import { calculateOptimalSales, SellCalculationResult } from '../../utils/sellCalculator';
import { formatToman, formatPercent, toPersianDigits, parseNumberInput } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';
import { BottomSheetModal } from '../common/BottomSheetModal';

interface SellViewProps {
  cryptoAssets: CryptoAsset[];
  bourseItems: CombinedMarketItem[];
  physicalGoldItems: PhysicalGoldItem[];
  totalPortfolioValue: number;
  settings: AppSettings;
  currencyMode?: CurrencyDisplayMode;
  usdtRateTomans?: number;
  formatCurrency?: (amountTomans: number, options?: any) => string;
  toDisplayValue?: (amountTomans: number) => number;
  onDeductBourseGold: (symbol: string, unitsToDeduct: number) => void;
  onDeductPhysicalGold: (id: PhysicalGoldType, quantityToDeduct: number) => void;
  onDeductCrypto?: (id: string, amountToDeduct: number) => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const SellView: React.FC<SellViewProps> = ({
  cryptoAssets,
  bourseItems,
  physicalGoldItems,
  totalPortfolioValue,
  settings,
  currencyMode = 'toman',
  usdtRateTomans = 93000,
  formatCurrency = (v, opts) => `${formatToman(v)} ${opts?.isTomanSuffix ? 'ت' : 'تومان'}`,
  toDisplayValue = (v) => v,
  onDeductBourseGold,
  onDeductPhysicalGold,
  onDeductCrypto,
  onNotify,
}) => {
  const [inputAmount, setInputAmount] = useState<number>(0);
  const [displayInput, setDisplayInput] = useState<string>('');
  const [sellMode, setSellMode] = useState<'balanced' | 'custom'>('balanced');
  const [includePhysicalGold, setIncludePhysicalGold] = useState<boolean>(false);
  const [includeBourseGold, setIncludeBourseGold] = useState<boolean>(true);
  const [includeCrypto, setIncludeCrypto] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Convert input if user is in USD mode
  const rawInputTomans = useMemo(() => {
    if (currencyMode === 'usd') {
      const rate = usdtRateTomans > 0 ? usdtRateTomans : 93000;
      return Math.round(inputAmount * rate);
    }
    return inputAmount;
  }, [inputAmount, currencyMode, usdtRateTomans]);

  const handleInputChange = (text: string) => {
    const numeric = parseNumberInput(text);
    setInputAmount(numeric);
    setDisplayInput(numeric > 0 ? new Intl.NumberFormat('en-US').format(numeric) : '');
  };

  const handleQuickPercent = (pct: number) => {
    triggerHaptic('light');
    const targetTomans = Math.round(totalPortfolioValue * (pct / 100));
    if (currencyMode === 'usd') {
      const rate = usdtRateTomans > 0 ? usdtRateTomans : 93000;
      const usdVal = Number((targetTomans / rate).toFixed(2));
      setInputAmount(usdVal);
      setDisplayInput(new Intl.NumberFormat('en-US').format(usdVal));
    } else {
      setInputAmount(targetTomans);
      setDisplayInput(new Intl.NumberFormat('en-US').format(targetTomans));
    }
  };

  const calculationResult: SellCalculationResult = useMemo(() => {
    return calculateOptimalSales(
      rawInputTomans,
      cryptoAssets,
      bourseItems,
      physicalGoldItems,
      settings,
      {
        includePhysicalGold: sellMode === 'custom' ? includePhysicalGold : false,
        includeBourseGold: sellMode === 'custom' ? includeBourseGold : true,
        includeCrypto: sellMode === 'custom' ? includeCrypto : true,
      }
    );
  }, [
    rawInputTomans,
    cryptoAssets,
    bourseItems,
    physicalGoldItems,
    settings,
    sellMode,
    includePhysicalGold,
    includeBourseGold,
    includeCrypto,
  ]);

  const handleCopy = (id: string, text: string, msg: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onNotify?.(msg, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExecuteGoldDeductions = () => {
    triggerHaptic('medium');
    let deductedCount = 0;

    // Deduct bourse gold units
    for (const item of calculationResult.bourseGoldSales) {
      if (item.unitsToSell > 0) {
        onDeductBourseGold(item.symbol, item.unitsToSell);
        deductedCount++;
      }
    }

    // Deduct physical gold quantities
    for (const item of calculationResult.physicalGoldSales) {
      if (item.quantityToSell > 0) {
        onDeductPhysicalGold(item.id as PhysicalGoldType, item.quantityToSell);
        deductedCount++;
      }
    }

    // Deduct crypto amounts if handler provided
    if (onDeductCrypto) {
      for (const item of calculationResult.cryptoSales) {
        if (item.amountToSell > 0) {
          onDeductCrypto(item.id, item.amountToSell);
          deductedCount++;
        }
      }
    }

    setIsConfirmModalOpen(false);
    setInputAmount(0);
    setDisplayInput('');
    onNotify?.(
      `تعداد ${toPersianDigits(deductedCount)} قلم از دارایی‌های مشخص‌شده با موفقیت از موجودی کسر شدند.`,
      'success'
    );
  };

  const hasSales =
    calculationResult.bourseGoldSales.length > 0 ||
    calculationResult.cryptoSales.length > 0 ||
    calculationResult.physicalGoldSales.length > 0;

  return (
    <div className="space-y-5 pb-24 animate-fadeIn">
      
      {/* 1. Header Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border border-rose-500/30 shadow-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-lg border border-rose-500/30 shrink-0">
            <ArrowDownCircle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-100">
              فروش و نقد کردن هوشمند <span className="text-rose-400 text-xs">(Sell & Rebalance)</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              مبلغ مورد نیاز برای نقد کردن را وارد کنید تا بهترین ترکیب فروش با حفظ توازن سبد محاسبه شود.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Amount Input Card */}
      <div className="glass-card p-4 sm:p-5 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200">
            مبلغ مورد نیاز برای فروش ({currencyMode === 'usd' ? 'دلار $' : 'تومان'}):
          </label>
          <span className="text-[11px] text-slate-400">
            کل دارایی سبد: <strong className="text-gold-300 dir-ltr">{formatCurrency(totalPortfolioValue)}</strong>
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={displayInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={currencyMode === 'usd' ? 'مثال: 500' : 'مثال: ۵۰,۰۰۰,۰۰۰'}
            className="w-full bg-slate-950/90 border border-slate-700/80 rounded-2xl px-4 py-3 text-base sm:text-lg font-black text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-all dir-ltr text-right pl-20"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300">
            {currencyMode === 'usd' ? 'USD $' : 'تومان'}
          </div>
        </div>

        {/* Quick Percent Buttons */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[10, 25, 50, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handleQuickPercent(pct)}
              className="py-2 px-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/40 text-xs font-bold text-slate-300 hover:text-rose-300 transition-all interactive-tap touch-target"
            >
              {pct === 100 ? 'کل سبد' : `${toPersianDigits(pct)}%`}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Selling Mode Selector */}
      <div className="glass-card p-4 sm:p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            <span>استراتژی انتخاب دارایی‌ها برای فروش:</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Mode 1: Balanced (Bourse Gold + Crypto) */}
          <div
            onClick={() => {
              triggerHaptic('light');
              setSellMode('balanced');
            }}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-1 ${
              sellMode === 'balanced'
                ? 'bg-rose-950/30 border-rose-500/50 shadow-md'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                <span>⚡</span>
                <span>فروش هوشمند متعادل (پیش‌فرض)</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold">
                پیشنهادی
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              فروش همزمان از <strong>صندوق‌های طلای بورس</strong> و <strong>رمزارزها</strong> جهت حفظ نسبت {toPersianDigits(settings.goldPercent)}/{toPersianDigits(settings.cryptoPercent)}. طلای فیزیکی حفظ می‌شود.
            </p>
          </div>

          {/* Mode 2: Custom Selection */}
          <div
            onClick={() => {
              triggerHaptic('light');
              setSellMode('custom');
            }}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-1 ${
              sellMode === 'custom'
                ? 'bg-rose-950/30 border-rose-500/50 shadow-md'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                <span>🎯</span>
                <span>انتخاب دستی بخش‌های فروش</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              تعیین دستی اینکه فروش از طلای فیزیکی، صندوق‌های بورس یا کریپتو انجام شود.
            </p>
          </div>
        </div>

        {/* Custom Mode Checkboxes */}
        {sellMode === 'custom' && (
          <div className="pt-2 grid grid-cols-3 gap-2 animate-fadeIn">
            <label className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="checkbox"
                checked={includeBourseGold}
                onChange={(e) => setIncludeBourseGold(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 bg-slate-950 border-slate-700 focus:ring-0"
              />
              <span>صندوق‌های بورس</span>
            </label>

            <label className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="checkbox"
                checked={includeCrypto}
                onChange={(e) => setIncludeCrypto(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 bg-slate-950 border-slate-700 focus:ring-0"
              />
              <span>ارزهای دیجیتال</span>
            </label>

            <label className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="checkbox"
                checked={includePhysicalGold}
                onChange={(e) => setIncludePhysicalGold(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 bg-slate-950 border-slate-700 focus:ring-0"
              />
              <span>طلای فیزیکی</span>
            </label>
          </div>
        )}
      </div>

      {/* 4. Results & Selling Recommendations */}
      {rawInputTomans > 0 && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Resulting Portfolio Simulation Bar */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-gold-400" />
                <span>شبیه‌سازی وضعیت سبد پس از فروش:</span>
              </span>
              <span className="text-rose-400 font-black dir-ltr">
                مجموع فروش: {formatCurrency(calculationResult.actualTotalSaleTomans)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">ارزش باقی‌مانده سبد:</span>
                <span className="font-black text-slate-100 dir-ltr block text-right mt-0.5">
                  {formatCurrency(calculationResult.resultingPortfolioValue)}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-gold-500/30">
                <span className="text-[10px] text-slate-400 block">سهم طلا بعد از فروش:</span>
                <span className="font-black text-gold-300 block text-right mt-0.5">
                  {formatPercent(calculationResult.resultingGoldPercent)} (هدف: {toPersianDigits(settings.goldPercent)}%)
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block">سهم کریپتو بعد از فروش:</span>
                <span className="font-black text-indigo-300 block text-right mt-0.5">
                  {formatPercent(calculationResult.resultingCryptoPercent)} (هدف: {toPersianDigits(settings.cryptoPercent)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Item Cards */}
          {hasSales ? (
            <div className="space-y-4">
              
              {/* 4.1 Bourse Gold Items */}
              {calculationResult.bourseGoldSales.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-gold-400">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      <span>صندوق‌های بورس برای فروش:</span>
                    </span>
                    <span className="dir-ltr text-gold-300 font-black">
                      جمع: {formatCurrency(calculationResult.bourseGoldSales.reduce((s, i) => s + i.totalTomans, 0))}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {calculationResult.bourseGoldSales.map((item) => {
                      const isCopied = copiedId === `bourse_${item.id}`;
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-slate-900 border border-gold-500/40 shadow-md space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-100 text-sm">{item.symbol}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-gold-400 font-bold border border-gold-500/30">
                                  صندوق طلا
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5 truncate max-w-[180px]">
                                {item.name}
                              </span>
                            </div>

                            <button
                              onClick={() => handleCopy(`bourse_${item.id}`, String(item.unitsToSell), `تعداد ${toPersianDigits(item.unitsToSell)} واحد ${item.symbol} کپی شد`)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-gold-300 border border-slate-700 transition-all touch-target"
                              title="کپی تعداد واحد"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block">تعداد واحد برای فروش:</span>
                              <span className="text-sm font-black text-rose-400">
                                {toPersianDigits(item.unitsToSell)} واحد
                              </span>
                            </div>

                            <div className="text-left">
                              <span className="text-[10px] text-slate-400 block">مبلغ معادل:</span>
                              <span className="text-xs font-black text-slate-200 dir-ltr text-right">
                                {formatCurrency(item.totalTomans)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4.2 Crypto Items */}
              {calculationResult.cryptoSales.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4" />
                      <span>ارزهای دیجیتال برای فروش (نوبیتکس):</span>
                    </span>
                    <span className="dir-ltr text-indigo-300 font-black">
                      جمع: {formatCurrency(calculationResult.cryptoSaleTomans)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {calculationResult.cryptoSales.map((item) => {
                      const isCopied = copiedId === `crypto_${item.id}`;
                      const copyText = item.amountToSell > 0 ? String(item.amountToSell) : String(item.totalTomans);
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-md space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: item.color }}
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-slate-100 text-sm">{item.symbol}</span>
                                  <span className="text-[10px] text-slate-400">{item.name}</span>
                                </div>
                                <span className="text-[10px] text-indigo-300 font-bold block">
                                  وزن هدف: {toPersianDigits(item.targetPercent)}%
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleCopy(`crypto_${item.id}`, copyText, `مقدار فروش ${item.symbol} کپی شد`)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-300 border border-slate-700 transition-all touch-target"
                              title="کپی مقدار کوین"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block">مقدار کوین برای فروش:</span>
                              <span className="text-xs font-black text-rose-400 dir-ltr text-right">
                                {toPersianDigits(item.amountToSell)} {item.symbol}
                              </span>
                            </div>

                            <div className="text-left">
                              <span className="text-[10px] text-slate-400 block">مبلغ فروش:</span>
                              <span className="text-xs font-black text-slate-200 dir-ltr text-right">
                                {formatCurrency(item.totalTomans)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4.3 Physical Gold Items (if any) */}
              {calculationResult.physicalGoldSales.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                    <span className="flex items-center gap-1.5">
                      <span>🥇</span>
                      <span>طلای فیزیکی و سکه برای فروش:</span>
                    </span>
                    <span className="dir-ltr text-amber-300 font-black">
                      جمع: {formatCurrency(calculationResult.physicalGoldSaleTomans)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {calculationResult.physicalGoldSales.map((item) => {
                      const isCopied = copiedId === `phys_${item.id}`;
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-md space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                              <span>🪙</span>
                              <span>{item.title}</span>
                            </h4>

                            <button
                              onClick={() => handleCopy(`phys_${item.id}`, String(item.quantityToSell), `مقدار ${item.title} کپی شد`)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition-all touch-target"
                              title="کپی مقدار"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block">مقدار فروش:</span>
                              <span className="text-xs font-black text-rose-400">
                                {toPersianDigits(item.quantityToSell)} {item.unit}
                              </span>
                            </div>

                            <div className="text-left">
                              <span className="text-[10px] text-slate-400 block">مبلغ معادل:</span>
                              <span className="text-xs font-black text-slate-200 dir-ltr text-right">
                                {formatCurrency(item.totalTomans)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4.4 Apply Sales Button (Deduct Gold Holdings) */}
              {(calculationResult.bourseGoldSales.length > 0 || calculationResult.physicalGoldSales.length > 0) && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setIsConfirmModalOpen(true);
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-sm transition-all shadow-lg interactive-tap flex items-center justify-center gap-2 touch-target"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ثبت و اعمال کسر از موجودی طلا و بورس</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1.5">
                    💡 توجه: موجودی رمزارزها از طریق ارتباط با نوبیتکس به‌روز می‌شود و نیازی به کسر دستی ندارد.
                  </p>
                </div>
              )}

            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              با این مبلغ، نیازی به فروش اقلام فوق نیست یا موجودی کافی انتخاب نشده است.
            </div>
          )}

        </div>
      )}

      {/* Confirmation Modal */}
      <BottomSheetModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="تایید کسر از موجودی طلا و بورس"
        subtitle="کسر مستقیم واحدهای فروخته‌شده از موجودی سبد سرمایه‌گذاری"
        icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
        maxWidth="max-w-sm"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all interactive-tap touch-target"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleExecuteGoldDeductions}
              className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all interactive-tap touch-target shadow-lg"
            >
              بله، کسر شود
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-300 leading-relaxed">
            آیا از کسر مقادیر محاسبه‌شده از موجودی صندوق‌های طلای بورس و طلای فیزیکی خود اطمینان دارید؟
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            {calculationResult.bourseGoldSales.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-slate-300">
                <span>{item.symbol}:</span>
                <span className="font-bold text-rose-400">کسر {toPersianDigits(item.unitsToSell)} واحد</span>
              </div>
            ))}
            {calculationResult.physicalGoldSales.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-slate-300">
                <span>{item.title}:</span>
                <span className="font-bold text-rose-400">کسر {toPersianDigits(item.quantityToSell)} {item.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </BottomSheetModal>

    </div>
  );
};
