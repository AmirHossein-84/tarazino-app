import React from 'react';
import {
  Percent,
  Scale,
  RefreshCw,
  Layers,
  CheckCircle2,
  Sliders,
  Plus,
  Minus,
  PieChart,
  Sparkles,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { AppSettings, CryptoAsset } from '../../types/investment';
import { formatPercent, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { NobitexIntegrationCard } from '../crypto/NobitexIntegrationCard';

interface PercentagesConfigProps {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  cryptoAssets: CryptoAsset[];
  updateCryptoAssets: (assets: CryptoAsset[]) => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

// Initial strategy target percentages
const DEFAULT_STRATEGY_WEIGHTS: Record<string, number> = {
  eth: 25,
  btc: 19,
  bnb: 15,
  ada: 9,
  dot: 9,
  trx: 8,
  xrp: 8,
  doge: 5,
  pol: 2,
  sol: 10,
  avax: 5,
  link: 5,
  sui: 5,
  near: 5,
  not: 5,
};

// Clean duplicate parentheses from coin names
function cleanCoinName(name: string, symbol: string): { faName: string; enName: string } {
  const match = name.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (match) {
    return {
      faName: match[1].trim() || symbol,
      enName: match[2].trim() || symbol.toUpperCase(),
    };
  }
  const faMatch = name.match(/[\u0600-\u06FF\s]+/);
  const faName = faMatch ? faMatch[0].trim() : name;
  return {
    faName: faName || symbol,
    enName: symbol.toUpperCase(),
  };
}

export const PercentagesConfig: React.FC<PercentagesConfigProps> = ({
  settings,
  updateSettings,
  cryptoAssets,
  updateCryptoAssets,
  onNotify,
}) => {
  const totalCryptoTargetSum = cryptoAssets.reduce((sum, a) => sum + (a.targetPercent || 0), 0);
  const isCryptoSum100 = Math.abs(totalCryptoTargetSum - 100) < 0.2;

  // 1. Suggested Strategy Balance (ETH 25%, BTC 19%, BNB 15%, ADA 9%, DOT 9%, TRX 8%, XRP 8%, DOGE 5%, POL 2%)
  const handleSuggestedStrategyBalance = () => {
    triggerHaptic('success');
    if (cryptoAssets.length === 0) return;

    // Apply baseline weights
    let updated = cryptoAssets.map((a) => {
      const sym = a.symbol.toLowerCase();
      const weight = DEFAULT_STRATEGY_WEIGHTS[sym] || 5;
      return {
        ...a,
        targetPercent: weight,
      };
    });

    // Normalize if the sum doesn't match 100 (e.g. if user has fewer or more coins)
    const currentSum = updated.reduce((s, a) => s + a.targetPercent, 0);
    if (currentSum > 0 && Math.abs(currentSum - 100) > 0.1) {
      const factor = 100 / currentSum;
      updated = updated.map((a) => ({
        ...a,
        targetPercent: Math.round(a.targetPercent * factor * 10) / 10,
      }));
    }

    updateCryptoAssets(updated);
    onNotify?.('تراز پیشنهادی استراتژی (ETH 25%, BTC 19%, ...) اعمال شد', 'success');
  };

  // 2. Proportional Auto-Normalize current numbers to 100%
  const handleNormalizeCryptoPercents = () => {
    triggerHaptic('success');
    if (totalCryptoTargetSum <= 0) return;
    const factor = 100 / totalCryptoTargetSum;
    const updated = cryptoAssets.map((a) => ({
      ...a,
      targetPercent: Math.round(a.targetPercent * factor * 10) / 10,
    }));
    updateCryptoAssets(updated);
    onNotify?.('درصدهای فعلی روی ۱۰۰٪ تراز شدند', 'info');
  };

  // 3. Equal Split across all coins
  const handleEqualSplit = () => {
    triggerHaptic('medium');
    if (cryptoAssets.length === 0) return;
    const equalVal = Math.round((100 / cryptoAssets.length) * 10) / 10;
    const updated = cryptoAssets.map((a) => ({
      ...a,
      targetPercent: equalVal,
    }));
    updateCryptoAssets(updated);
    onNotify?.(`درصدها به صورت مساوی (${toPersianDigits(equalVal)}٪) تقسیم شدند`, 'info');
  };

  // Adjust specific coin percentage
  const handleCryptoPercentChange = (id: string, newPercent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newPercent * 10) / 10));
    const updated = cryptoAssets.map((a) =>
      a.id === id ? { ...a, targetPercent: clamped } : a
    );
    updateCryptoAssets(updated);
  };

  const handleStepCryptoPercent = (id: string, delta: number) => {
    triggerHaptic('light');
    const asset = cryptoAssets.find((a) => a.id === id);
    if (!asset) return;
    handleCryptoPercentChange(id, (asset.targetPercent || 0) + delta);
  };

  const handleGoldSplitChange = (goldVal: number) => {
    const gold = Math.max(0, Math.min(100, goldVal));
    const crypto = 100 - gold;
    updateSettings({ goldPercent: gold, cryptoPercent: crypto });
  };

  return (
    <div className="space-y-4 pb-24">
      
      {/* 1. TOP-LEVEL SAVINGS PERCENTAGE (30% DEFAULT) */}
      <div className="glass-card p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                درصد کل پس‌انداز از سرمایه ورودی
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                سهم کل پس‌انداز ماهانه (پیش‌فرض: ۳۰٪)
              </p>
            </div>
          </div>
          <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
            {formatPercent(settings.savingsPercent)}
          </span>
        </div>

        {/* Quick Ratio Chips */}
        <div className="flex items-center gap-2 pt-1">
          {[15, 20, 25, 30, 40, 50].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                updateSettings({ savingsPercent: pct });
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                settings.savingsPercent === pct
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs font-black'
                  : 'bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {toPersianDigits(pct)}٪
            </button>
          ))}
        </div>

        {/* Range Slider */}
        <div className="pt-1">
          <input
            type="range"
            min="5"
            max="100"
            step="1"
            value={settings.savingsPercent}
            onChange={(e) => updateSettings({ savingsPercent: parseInt(e.target.value) })}
            className="custom-range-slider"
            style={{ accentColor: '#10B981' }}
          />
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <span>۵٪ (حداقل)</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">۳۰٪ (پیشنهادی)</span>
            <span>۱۰۰٪ (کل مبلغ)</span>
          </div>
        </div>
      </div>

      {/* 2. GOLD VS CRYPTO SPLIT (80% / 20% DEFAULT) */}
      <div className="glass-card p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-gold-400 flex items-center justify-center font-bold text-sm">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                نسبت تقسیم پس‌انداز بین طلا و کریپتو
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                تقسیم مبلغ پس‌انداز (پیش‌فرض: ۸۰٪ طلا و ۲۰٪ رمزارزها)
              </p>
            </div>
          </div>
        </div>

        {/* Ratio Badges */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-gold-500/30 flex items-center justify-between">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">سهم طلا:</span>
            <span className="text-sm font-black text-amber-700 dark:text-gold-400">
              {formatPercent(settings.goldPercent)}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-between">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">سهم رمزارزها:</span>
            <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">
              {formatPercent(settings.cryptoPercent)}
            </span>
          </div>
        </div>

        {/* Quick Ratio Presets - Compact and Untruncated */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {[
            { gold: 80, crypto: 20, label: '۸۰ / ۲۰', sub: 'پیشنهادی' },
            { gold: 70, crypto: 30, label: '۷۰ / ۳۰', sub: 'متعادل' },
            { gold: 50, crypto: 50, label: '۵۰ / ۵۰', sub: 'مساوی' },
            { gold: 90, crypto: 10, label: '۹۰ / ۱۰', sub: 'کم‌ریسک' },
          ].map((preset) => (
            <button
              key={preset.gold}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                handleGoldSplitChange(preset.gold);
              }}
              className={`py-2 px-1 rounded-2xl text-center transition-all interactive-tap touch-target border ${
                settings.goldPercent === preset.gold
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 dark:from-amber-500 dark:to-gold-400 text-slate-950 border-amber-500 dark:border-gold-400 shadow-xs font-black'
                  : 'bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-black dir-ltr text-center">
                {preset.label}
              </div>
              <div className={`text-[9px] mt-0.5 font-medium ${
                settings.goldPercent === preset.gold ? 'text-slate-950' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {preset.sub}
              </div>
            </button>
          ))}
        </div>

        {/* Linked Slider */}
        <div className="pt-1">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={settings.goldPercent}
            onChange={(e) => handleGoldSplitChange(parseInt(e.target.value))}
            className="custom-range-slider"
            style={{ accentColor: '#D4AF37' }}
          />
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <span>۰٪ طلا / ۱۰۰٪ کریپتو</span>
            <span className="text-amber-700 dark:text-gold-400 font-bold">۸۰٪ طلا / ۲۰٪ کریپتو</span>
            <span>۱۰۰٪ طلا / ۰٪ کریپتو</span>
          </div>
        </div>
      </div>

      {/* 3. NOBITEX API AUTO-SYNC CARD */}
      <NobitexIntegrationCard
        cryptoAssets={cryptoAssets}
        onAssetsUpdated={updateCryptoAssets}
        onNotify={onNotify}
      />

      {/* 4. CALCULATION ENGINE MODE */}
      <div className="glass-card p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3.5">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-0.5">
            الگوریتم و نحوه محاسبه خرید
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            انتخاب نحوه تخصیص سرمایه جدید بر اساس سبد فعلی شما
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Rebalance Mode */}
          <div
            onClick={() => {
              triggerHaptic('medium');
              updateSettings({ calculationMode: 'rebalance' });
            }}
            className={`p-3.5 rounded-2xl border transition-all interactive-tap ${
              settings.calculationMode === 'rebalance'
                ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-gold-500/50'
                : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-700 dark:text-gold-400" />
                <span className="font-black text-xs text-slate-900 dark:text-slate-100">
                  توازن هوشمند سبد (پیشنهادی)
                </span>
              </div>
              {settings.calculationMode === 'rebalance' && (
                <CheckCircle2 className="w-4 h-4 text-amber-700 dark:text-gold-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
              خریدهای جدید طوری تقسیم می‌شوند که کل سبد (دارایی قبلی + خرید جدید) دقیقاً به نسبت ۸۰ به ۲۰ برسد.
            </p>
          </div>

          {/* Direct Mode */}
          <div
            onClick={() => {
              triggerHaptic('medium');
              updateSettings({ calculationMode: 'direct' });
            }}
            className={`p-3.5 rounded-2xl border transition-all interactive-tap ${
              settings.calculationMode === 'direct'
                ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/50'
                : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                <span className="font-black text-xs text-slate-900 dark:text-slate-100">
                  تقسیم مستقیم درصدی
                </span>
              </div>
              {settings.calculationMode === 'direct' && (
                <CheckCircle2 className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
              مبلغ پس‌انداز جدید مستقیماً به نسبت ۸۰٪ طلا و ۲۰٪ رمزارز تقسیم می‌شود بدون بررسی مانده قبلی.
            </p>
          </div>
        </div>
      </div>

      {/* 5. INDIVIDUAL CRYPTO WEIGHTS CONFIG */}
      <div className="glass-card p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        
        {/* Header & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                درصدهای هدف هر رمزارز
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              مجموع درصدهای هدف باید برابر ۱۰۰٪ باشد
            </p>
          </div>

          {/* Sum pill badge & quick action */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs px-3 py-1.5 rounded-2xl font-black border flex items-center gap-1.5 ${
                isCryptoSum100
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/40'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isCryptoSum100 ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-amber-600 dark:bg-amber-400 animate-pulse'}`} />
              <span>مجموع: {toPersianDigits(totalCryptoTargetSum.toFixed(1))}٪</span>
            </span>

            {!isCryptoSum100 && (
              <button
                type="button"
                onClick={handleNormalizeCryptoPercents}
                className="px-3 py-1.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all interactive-tap touch-target shadow-xs"
                title="تراز خودکار همه درصدها روی ۱۰۰٪"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تراز خودکار روی ۱۰۰٪</span>
              </button>
            )}
          </div>
        </div>

        {/* 1-Tap Quick Action Presets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Main Suggested Strategy Button */}
          <button
            type="button"
            onClick={handleSuggestedStrategyBalance}
            className="py-2.5 px-3 rounded-2xl bg-amber-50/80 hover:bg-amber-100/80 dark:bg-gradient-to-r dark:from-gold-500/20 dark:via-indigo-500/20 dark:to-gold-500/20 dark:hover:from-gold-500/30 dark:hover:to-indigo-500/30 text-amber-800 dark:text-gold-300 border border-amber-200 dark:border-gold-500/40 text-xs font-black flex items-center justify-center gap-1.5 transition-all interactive-tap touch-target shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-700 dark:text-gold-400" />
            <span>تراز پیشنهادی (استراتژی اولیه)</span>
          </button>

          {/* Equal Split */}
          <button
            type="button"
            onClick={handleEqualSplit}
            className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-tap touch-target"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>تقسیم مساوی ({toPersianDigits(cryptoAssets.length > 0 ? (100 / cryptoAssets.length).toFixed(0) : '0')}٪)</span>
          </button>

          {/* Proportional Normalize */}
          {!isCryptoSum100 && (
            <button
              type="button"
              onClick={handleNormalizeCryptoPercents}
              className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-tap touch-target"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
              <span>تراز خودکار فعلی</span>
            </button>
          )}
        </div>

        {/* Strategy Breakdown Tooltip / Explanation */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2">
          <span>ترکیب استراتژی پیشنهادی:</span>
          <span className="text-slate-800 dark:text-slate-300 font-bold text-[10px] dir-ltr text-right">
            ETH 25% • BTC 19% • BNB 15% • ADA 9% • DOT 9% • TRX 8% • XRP 8% • DOGE 5% • POL 2%
          </span>
        </div>

        {/* Crypto Items List */}
        <div className="space-y-2.5 pt-1">
          {cryptoAssets.map((asset) => {
            const { faName, enName } = cleanCoinName(asset.name, asset.symbol);

            return (
              <div
                key={asset.id}
                className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2.5 shadow-xs"
              >
                {/* Row Header: Coin Info + Stepper + Direct Input */}
                <div className="flex items-center justify-between gap-2">
                  
                  {/* Coin Info Badge */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                      style={{ backgroundColor: `${asset.color}25`, color: asset.color }}
                    >
                      {asset.symbol.toUpperCase().slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 dark:text-slate-100 text-xs truncate">
                          {faName}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {asset.symbol.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stepper Controls (- / Value / +) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Minus Button */}
                    <button
                      type="button"
                      onClick={() => handleStepCryptoPercent(asset.id, -1)}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:active:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center justify-center interactive-tap touch-target"
                      title="کاهش ۱ درصد"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    {/* Numeric Input */}
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={asset.targetPercent}
                        onChange={(e) =>
                          handleCryptoPercentChange(asset.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-12 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-1.5 text-center dir-ltr text-xs font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold pr-1">٪</span>
                    </div>

                    {/* Plus Button */}
                    <button
                      type="button"
                      onClick={() => handleStepCryptoPercent(asset.id, 1)}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:active:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center justify-center interactive-tap touch-target"
                      title="افزایش ۱ درصد"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                </div>

                {/* Sleek Gradient Range Slider */}
                <div className="px-1">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={asset.targetPercent}
                    onChange={(e) =>
                      handleCryptoPercentChange(asset.id, parseFloat(e.target.value) || 0)
                    }
                    className="custom-range-slider"
                    style={{ accentColor: asset.color }}
                  />
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
