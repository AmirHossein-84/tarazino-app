import React, { useState } from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';
import { CalculationResult } from '../../types/investment';
import { formatToman } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { BottomSheetModal } from '../common/BottomSheetModal';

interface QuickActionsProps {
  calculationResult: CalculationResult;
  onApplyPurchases: () => void;
  onNavigateToHoldings?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  calculationResult,
  onApplyPurchases,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const hasPurchases = calculationResult.totalSavingsAmount > 0;

  const handleOpenConfirm = () => {
    triggerHaptic('medium');
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    triggerHaptic('success');
    onApplyPurchases();
    setShowConfirmModal(false);
  };

  return (
    <>
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <h4 className="text-sm font-black text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-emerald-glow" />
            <span>خریدها را در صرافی یا طلافروشی انجام دادید؟</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            با یک لمس، مبالغ خرید پیشنهادی به موجودی دارایی‌های شما افزوده و ذخیره می‌شوند.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleOpenConfirm}
            disabled={!hasPurchases}
            className={`w-full sm:w-auto py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all interactive-tap touch-target shadow-lg ${
              hasPurchases
                ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 shadow-emerald-glow'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>ثبت و اعمال خریدها به دارایی‌های من</span>
          </button>
        </div>
      </div>

      {/* Standardized Bottom Sheet Modal */}
      <BottomSheetModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="تأیید و اعمال خریدهای جدید"
        subtitle="افزودن مبالغ پیشنهادی به دارایی‌ها"
        icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
      >
        <div className="space-y-4 text-right">
          <p className="text-xs text-slate-300 leading-relaxed">
            آیا از افزودن مبالغ خرید ({formatToman(calculationResult.totalSavingsAmount)} تومان) به موجودی فعلی طلا و ارزهای دیجیتال خود مطمئن هستید؟
          </p>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2.5">
            <div className="flex justify-between items-center text-slate-300">
              <span>سهم خرید طلا:</span>
              <span className="text-gold-400 font-black dir-ltr">{formatToman(calculationResult.goldBuyAmount)} تومان</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>سهم خرید رمزارزها:</span>
              <span className="text-indigo-400 font-black dir-ltr">{formatToman(calculationResult.cryptoBuyAmount)} تومان</span>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={handleConfirm}
              className="flex-1 py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs interactive-tap touch-target transition-all shadow-emerald-glow"
            >
              بله، ثبت و ذخیره شود
            </button>
            <button
              onClick={() => setShowConfirmModal(false)}
              className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs interactive-tap touch-target transition-all"
            >
              انصراف
            </button>
          </div>
        </div>
      </BottomSheetModal>
    </>
  );
};
