import React, { useState, useEffect, useMemo } from 'react';
import { Banknote, Calendar, Check, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import { BottomSheetModal } from '../common/BottomSheetModal';
import { InlinePersianDatePicker } from '../common/InlinePersianDatePicker';
import { PhysicalGoldBuyLot, PhysicalGoldItem, PhysicalGoldType } from '../../types/investment';
import { calculateGoldItemPnl } from '../../utils/goldPnlCalculators';
import {
  formatPercent,
  formatToman,
  getPersianFormattedDate,
  parseNumberInput,
  toEnglishDigits,
  toPersianDigits,
} from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';

interface SellPhysicalGoldModalProps {
  item: PhysicalGoldItem | null;
  goldBuyLots?: PhysicalGoldBuyLot[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmSale: (
    id: PhysicalGoldType,
    quantitySold: number,
    saleUnitPriceTomans: number,
    notes?: string,
    persianSaleDate?: string
  ) => void;
}

export const SellPhysicalGoldModal: React.FC<SellPhysicalGoldModalProps> = ({
  item,
  goldBuyLots = [],
  isOpen,
  onClose,
  onConfirmSale,
}) => {
  const [sellQtyStr, setSellQtyStr] = useState('');
  const [salePriceStr, setSalePriceStr] = useState('');
  const [saleDate, setSaleDate] = useState(() => toEnglishDigits(getPersianFormattedDate(new Date())));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (item && isOpen) {
      setSellQtyStr(String(item.quantity));
      setSalePriceStr(item.unitPriceTomans > 0 ? String(item.unitPriceTomans) : '');
      setSaleDate(toEnglishDigits(getPersianFormattedDate(new Date())));
      setShowDatePicker(false);
      setNotes('');
      setErrorText('');
    }
  }, [item, isOpen]);

  const pnlSnapshot = useMemo(() => {
    if (!item) return null;
    return calculateGoldItemPnl(item, goldBuyLots);
  }, [item, goldBuyLots]);

  if (!isOpen || !item) return null;

  const isCoin = item.unit === 'عدد' || item.id.startsWith('coin_');
  const maxQty = Number(item.quantity) || 0;
  const parsedQty = parseFloat(toEnglishDigits(sellQtyStr).replace(/,/g, '')) || 0;
  const clampedQty = Math.min(maxQty, Math.max(0, parsedQty));
  const parsedUnitPrice = parseNumberInput(salePriceStr) || item.unitPriceTomans || 0;

  const estimatedProceeds = Math.round(clampedQty * parsedUnitPrice);
  const avgCostUnit = pnlSnapshot?.weightedAverageCostTomans || item.averageBuyPriceTomans || 0;
  const hasCostBasis = Boolean(avgCostUnit > 0);
  const estimatedCost = Math.round(clampedQty * avgCostUnit);
  const estimatedPnl = hasCostBasis ? estimatedProceeds - estimatedCost : 0;
  const estimatedPnlPercent = hasCostBasis && estimatedCost > 0 ? (estimatedPnl / estimatedCost) * 100 : 0;
  const isFullSale = maxQty - clampedQty <= 0.0001 && clampedQty > 0;

  const handleSetPercent = (pct: number) => {
    triggerHaptic('light');
    if (pct >= 1) {
      setSellQtyStr(String(maxQty));
    } else if (isCoin) {
      const nextCoin = Math.max(1, Math.min(maxQty, Math.floor(maxQty * pct)));
      setSellQtyStr(String(nextCoin));
    } else {
      const nextGram = Number((maxQty * pct).toFixed(3));
      setSellQtyStr(String(nextGram));
    }
    setErrorText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedQty <= 0) {
      setErrorText('لطفاً مقدار معتبر برای فروش وارد کنید');
      return;
    }
    if (parsedQty > maxQty + 0.0001) {
      setErrorText(`حداکثر موجودی قابل فروش ${toPersianDigits(maxQty)} ${item.unit} است`);
      return;
    }
    if (parsedUnitPrice <= 0) {
      setErrorText('لطفاً قیمت فروش هر واحد را به تومان وارد کنید');
      return;
    }

    triggerHaptic('medium');
    onConfirmSale(
      item.id,
      clampedQty,
      parsedUnitPrice,
      notes.trim() || undefined,
      toEnglishDigits(saleDate)
    );
    onClose();
  };

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title={`ثبت فروش ${item.title}`}
      subtitle={`موجودی فعلی: ${toPersianDigits(maxQty)} ${item.unit}`}
      icon={<Banknote className="w-5 h-5 text-emerald-500" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pb-2">
        {/* Quick Percentage Chips */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              مقدار قابل فروش ({item.unit})
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: '۲۵٪', val: 0.25 },
                { label: '۵۰٪', val: 0.5 },
                { label: '۱۰۰٪ (فروش کامل)', val: 1 },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSetPercent(chip.val)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={sellQtyStr}
            onChange={(e) => {
              setSellQtyStr(toEnglishDigits(e.target.value));
              setErrorText('');
            }}
            placeholder={isCoin ? 'مثلاً 1' : 'مثلاً 2.5'}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black text-base text-left dir-ltr tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          {isFullSale && (
            <p className="mt-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
              با فروش کل موجودی، این دارایی به صورت کامل از فهرست دارایی‌ها حذف و در دفتر فروش ثبت می‌شود.
            </p>
          )}
        </div>

        {/* Unit Sale Price */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              نرخ فروش هر {item.unit} (تومان)
            </label>
            {item.unitPriceTomans > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSalePriceStr(String(item.unitPriceTomans));
                }}
                className="text-[11px] font-bold text-amber-600 dark:text-gold-400 hover:underline"
              >
                استفاده از نرخ لحظه‌ای ({formatToman(item.unitPriceTomans)})
              </button>
            )}
          </div>
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={salePriceStr ? formatToman(parseNumberInput(salePriceStr)) : ''}
            onChange={(e) => {
              setSalePriceStr(toEnglishDigits(e.target.value).replace(/,/g, ''));
              setErrorText('');
            }}
            placeholder="قیمت فروش به تومان"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black text-base text-left dir-ltr tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Jalali Sale Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            تاریخ فروش (شمسی)
          </label>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowDatePicker((v) => !v);
            }}
            className="w-full touch-target px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>انتخاب تاریخ فروش</span>
            </span>
            <span className="dir-ltr tabular-nums font-black text-emerald-700 dark:text-emerald-300">
              {toPersianDigits(saleDate)}
            </span>
          </button>

          {showDatePicker && (
            <div className="mt-2">
              <InlinePersianDatePicker
                isOpen={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                selectedDate={saleDate}
                onSelectDate={(d) => setSaleDate(toEnglishDigits(d))}
                title="تاریخ فروش طلا"
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>توضیحات (اختیاری)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثلاً فروش پلکانی یا تبدیل به نقدینگی"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Realized Proceeds & P&L Preview */}
        <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-bold">مبلغ دریافتی فروش:</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400 dir-ltr tabular-nums">
              {formatToman(estimatedProceeds)} تومان
            </span>
          </div>
          {hasCostBasis && clampedQty > 0 && (
            <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-600 dark:text-slate-400 font-bold">سود/زیان تخمینی (FIFO):</span>
              <span
                className={`inline-flex items-center gap-1 font-black dir-ltr tabular-nums ${
                  estimatedPnl >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {estimatedPnl >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {estimatedPnl >= 0 ? '+' : ''}
                  {formatToman(estimatedPnl)} ت ({formatPercent(Math.abs(estimatedPnlPercent))})
                </span>
              </span>
            </div>
          )}
        </div>

        {errorText && (
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
            {errorText}
          </p>
        )}

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="touch-target px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex-1"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="touch-target interactive-tap px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex-[2] flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <Check className="w-4 h-4" />
            <span>{isFullSale ? 'تایید فروش کامل و حذف' : 'ثبت فروش و کسر از موجودی'}</span>
          </button>
        </div>
      </form>
    </BottomSheetModal>
  );
};
