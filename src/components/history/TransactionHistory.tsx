import React, { useState } from 'react';
import { History, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { TransactionRecord } from '../../types/investment';
import { formatToman, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';

interface TransactionHistoryProps {
  transactions: TransactionRecord[];
  onDeleteTransaction: (id: string) => void;
  onClearAll: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  onDeleteTransaction,
  onClearAll,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    triggerHaptic('light');
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = (id: string) => {
    triggerHaptic('medium');
    onDeleteTransaction(id);
  };

  const handleClearAll = () => {
    triggerHaptic('heavy');
    if (confirm('آیا از پاک کردن تمام تاریخچه خریدها مطمئن هستید؟')) {
      onClearAll();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card p-4 sm:p-5 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shadow-crypto-glow">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-100">
              سوابق و تاریخچه خریدهای ثبت‌شده
            </h2>
            <p className="text-xs text-slate-400">
              {toPersianDigits(transactions.length)} مرحله خرید ذخیره‌شده
            </p>
          </div>
        </div>

        {transactions.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs px-3 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold transition-all interactive-tap touch-target"
          >
            پاک کردن همه
          </button>
        )}
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-300">
            هنوز خریدی ثبت نشده است
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            پس از وارد کردن مبلغ در بخش «محاسبه خرید» و زدن دکمه «اعمال خریدها به دارایی‌های من»، جزئیات خرید در اینجا ذخیره می‌شود.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const isExpanded = expandedId === tx.id;

            return (
              <div
                key={tx.id}
                className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-lg"
              >
                {/* Top Summary */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-gold-400" />
                    <span>{tx.persianDate}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      پس‌انداز: {formatToman(tx.totalSavingsAmount)} ت
                    </span>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all interactive-tap touch-target"
                      title="حذف این رکورد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Amount Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-gold-500/20">
                    <span className="text-slate-400 block text-[11px]">خرید طلا:</span>
                    <span className="font-black text-gold-400 text-sm dir-ltr">{formatToman(tx.goldBuyAmount)} تومان</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                    <span className="text-slate-400 block text-[11px]">خرید رمزارزها:</span>
                    <span className="font-black text-indigo-400 text-sm dir-ltr">{formatToman(tx.cryptoBuyAmount)} تومان</span>
                  </div>
                </div>

                {/* Collapsible Crypto Breakdown */}
                {tx.cryptoBuys && tx.cryptoBuys.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleExpand(tx.id)}
                      className="w-full py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 interactive-tap font-bold"
                    >
                      <span>جزئیات خرید هر رمزارز ({toPersianDigits(tx.cryptoBuys.filter(b => b.amount > 0).length)} ارز)</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gold-400" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800 text-[11px]">
                        {tx.cryptoBuys
                          .filter((b) => b.amount > 0)
                          .map((b, idx) => (
                            <div
                              key={`${tx.id}-${b.symbol}-${idx}`}
                              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center"
                            >
                              <span className="font-black text-slate-200">{b.symbol}:</span>
                              <span className="text-emerald-400 font-bold dir-ltr">{formatToman(b.amount)} ت</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
