import React, { useMemo } from 'react';
import {
  History,
  TrendingUp,
  TrendingDown,
  Trash2,
  Calendar,
  DollarSign,
  Coins,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { PhysicalGoldSaleRecord } from '../../types/investment';
import { formatToman, formatPercent, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { BottomSheetModal } from '../common/BottomSheetModal';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';

interface PhysicalGoldHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: PhysicalGoldSaleRecord[];
  currencyMode?: CurrencyDisplayMode;
  usdtRateTomans?: number;
  formatCurrency?: (amountTomans: number, options?: any) => string;
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
}

export const PhysicalGoldHistoryModal: React.FC<PhysicalGoldHistoryModalProps> = ({
  isOpen,
  onClose,
  sales,
  currencyMode = 'toman',
  usdtRateTomans = 93000,
  formatCurrency = (v) => `${formatToman(v)} تومان`,
  onDeleteRecord,
  onClearAll,
}) => {
  // Aggregate sales analytics
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    for (const s of sales) {
      totalRevenue += s.totalRevenueTomans || 0;
      totalCost += s.totalCostTomans || 0;
      totalProfit += s.realizedProfitTomans || 0;
    }

    const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitPercent,
      salesCount: sales.length,
    };
  }, [sales]);

  if (!isOpen) return null;

  const handleDelete = (id: string, title: string) => {
    triggerHaptic('medium');
    if (window.confirm(`آیا از حذف این سابقه فروش "${title}" اطمینان دارید؟`)) {
      onDeleteRecord(id);
    }
  };

  const handleClearAll = () => {
    triggerHaptic('heavy');
    if (window.confirm('آیا از پاک‌سازی کل تاریخچه فروش‌های طلا اطمینان دارید؟')) {
      onClearAll();
    }
  };

  const footerActions = (
    <div className="flex items-center justify-between w-full">
      {sales.length > 0 ? (
        <button
          type="button"
          onClick={handleClearAll}
          className="py-2.5 px-3.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all interactive-tap touch-target flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>پاک‌سازی تاریخچه</span>
        </button>
      ) : <div />}

      <button
        type="button"
        onClick={onClose}
        className="py-2.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all interactive-tap touch-target"
      >
        بستن
      </button>
    </div>
  );

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="دفتر کل سوابق فروش طلای فیزیکی و مسکوکات"
      subtitle="رهگیری سود/زیان محقق‌شده و تاریخچه نقد کردن دارایی‌های طلا"
      icon={<History className="w-5 h-5 text-amber-400" />}
      footer={footerActions}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        
        {/* 1. Summary Ledger Header Card */}
        {sales.length > 0 && (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border border-amber-500/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-gold-400" />
                <span>خلاصه حسابرسی سود محقق‌شده:</span>
              </span>
              <span className="text-slate-400">
                تعداد: <strong className="text-slate-200">{toPersianDigits(summary.salesCount)} تراکنش فروش</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">کل دریافتی از فروش:</span>
                <span className="font-black text-slate-100 dir-ltr block text-right mt-0.5">
                  {formatCurrency(summary.totalRevenue)}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">بهای تمام‌شده کل:</span>
                <span className="font-black text-slate-300 dir-ltr block text-right mt-0.5">
                  {formatCurrency(summary.totalCost)}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block">سود/زیان محقق‌شده:</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span
                    className={`font-black dir-ltr ${
                      summary.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {summary.totalProfit >= 0 ? '+' : ''}{formatCurrency(summary.totalProfit)}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                      summary.totalProfit >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {summary.totalProfit >= 0 ? '+' : ''}{toPersianDigits(summary.profitPercent.toFixed(1))}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Sales Ledger List */}
        {sales.length > 0 ? (
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {sales.map((record) => {
              const isProfit = (record.realizedProfitTomans || 0) >= 0;
              const unitStr = record.goldType.startsWith('coin_') ? 'عدد' : 'گرم';

              return (
                <div
                  key={record.id}
                  className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 space-y-2.5 transition-all"
                >
                  {/* Top Bar: Title, Quantity & Delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-gold-400 flex items-center justify-center font-bold text-sm">
                        {record.goldType.startsWith('coin_') ? '🪙' : '🥇'}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-100">{record.title}</h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>مقدار فروش:</span>
                          <strong className="text-slate-200">
                            {toPersianDigits(record.quantitySold)} {unitStr}
                          </strong>
                          <span>•</span>
                          <span className="text-slate-500">{record.persianDate || record.saleDate.slice(0, 10)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(record.id, record.title)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-all touch-target"
                      title="حذف این سابقه"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Financial Breakdown Row */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">نرخ فروش واحد:</span>
                      <span className="font-bold text-slate-200 dir-ltr text-right block">
                        {formatCurrency(record.saleUnitPriceTomans)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">بهای تمام‌شده واحد:</span>
                      <span className="font-bold text-slate-400 dir-ltr text-right block">
                        {formatCurrency(record.unitCostBasisTomans)}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block">مبلغ کل فروش:</span>
                      <span className="font-black text-slate-100 dir-ltr text-right block">
                        {formatCurrency(record.totalRevenueTomans)}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block">سود/زیان محقق‌شده:</span>
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-black dir-ltr ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}{formatCurrency(record.realizedProfitTomans)}
                        </span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                            isProfit ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                          }`}
                        >
                          {isProfit ? '+' : ''}{toPersianDigits(record.realizedProfitPercent.toFixed(1))}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes if available */}
                  {record.notes && (
                    <p className="text-[10px] text-slate-400 bg-slate-900/40 px-2 py-1 rounded-lg">
                      📝 {record.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="p-8 text-center space-y-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-gold-400 mx-auto flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-200">هنوز فروشی ثبت نشده است</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                هنگامی که در بخش «فروش هوشمند» یا به صورت دستی از موجودی طلای فیزیکی خود کسر می‌کنید، سود/زیان محقق‌شده به طور خودکار در این دفتر کل ثبت می‌گردد.
              </p>
            </div>
          </div>
        )}

      </div>
    </BottomSheetModal>
  );
};
