import React, { useState } from 'react';
import { TrendingUp, X, Check, Trash2 } from 'lucide-react';
import { StockItem } from '../../types/investment';
import { triggerHaptic } from '../../utils/haptics';

interface AddEditStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stock: Omit<StockItem, 'id' | 'updatedAt'>) => void;
  onDelete?: (id: string) => void;
  initialStock?: StockItem | null;
}

export const AddEditStockModal: React.FC<AddEditStockModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialStock,
}) => {
  const [symbol, setSymbol] = useState(initialStock?.symbol || '');
  const [title, setTitle] = useState(initialStock?.title || '');
  const [sharesCount, setSharesCount] = useState(initialStock ? initialStock.sharesCount.toString() : '');
  const [buyPrice, setBuyPrice] = useState(initialStock ? initialStock.averageBuyPriceTomans.toString() : '');
  const [currentPrice, setCurrentPrice] = useState(initialStock ? initialStock.currentPriceTomans.toString() : '');
  const [notes, setNotes] = useState(initialStock?.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) {
      alert('لطفاً نام نماد را وارد کنید.');
      return;
    }

    const count = parseInt(sharesCount.replace(/\D/g, ''), 10) || 0;
    const bPrice = parseInt(buyPrice.replace(/\D/g, ''), 10) || 0;
    const cPrice = parseInt(currentPrice.replace(/\D/g, ''), 10) || bPrice;

    if (count <= 0) {
      alert('تعداد سهام باید بیشتر از صفر باشد.');
      return;
    }

    triggerHaptic('success');
    onSave({
      symbol: symbol.trim(),
      title: title.trim() || undefined,
      sharesCount: count,
      averageBuyPriceTomans: bPrice,
      currentPriceTomans: cPrice,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              {initialStock ? 'ویرایش سهم بورسی' : 'افزودن سهم جدید به بورس'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نماد سهم *
              </label>
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="مثال: فولاد"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نام شرکت (اختیاری)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="فولاد مبارکه اصفهان"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              تعداد سهام *
            </label>
            <input
              type="text"
              required
              value={sharesCount}
              onChange={(e) => setSharesCount(e.target.value)}
              placeholder="مثال: 10000"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                قیمت خرید هر سهم (تومان)
              </label>
              <input
                type="text"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="مثال: 550"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                قیمت روز هر سهم (تومان)
              </label>
              <input
                type="text"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="مثال: 620"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              یادداشت (اختیاری)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="دیدگاه میان‌مدت، مجمع، و..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            {initialStock && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`آیا از حذف نماد "${initialStock.symbol}" اطمینان دارید؟`)) {
                    onDelete(initialStock.id);
                    onClose();
                  }
                }}
                className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                title="حذف نماد"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-cyan-600/20"
            >
              <Check className="w-4 h-4" />
              {initialStock ? 'ذخیره تغییرات' : 'ثبت سهم'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
