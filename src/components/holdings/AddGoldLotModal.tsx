import React, { useState, useEffect, useRef } from 'react';
import {
  Coins,
  Plus,
  Calendar,
  Check,
  Sparkles,
  FileText,
  DollarSign,
} from 'lucide-react';
import { PhysicalGoldItem, PhysicalGoldType, PhysicalGoldBuyLot } from '../../types/investment';
import {
  formatToman,
  toPersianDigits,
  parseNumberInput,
  getPersianFormattedDate,
  getTodayPersianDate,
} from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { BottomSheetModal } from '../common/BottomSheetModal';
import { PersianDatePickerModal } from '../common/PersianDatePickerModal';

interface AddGoldLotModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PhysicalGoldItem[];
  defaultSelectedType?: PhysicalGoldType;
  onSaveLot: (lot: Omit<PhysicalGoldBuyLot, 'id' | 'totalCostTomans'>) => void;
}

export const AddGoldLotModal: React.FC<AddGoldLotModalProps> = ({
  isOpen,
  onClose,
  items,
  defaultSelectedType = 'gold_18k',
  onSaveLot,
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PhysicalGoldType>(defaultSelectedType);
  const [quantity, setQuantity] = useState('');
  const [purchasePriceTomans, setPurchasePriceTomans] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedType(defaultSelectedType);
      setQuantity('');
      // Pre-fill live market price as default suggestion
      const currentItem = items.find((i) => i.id === defaultSelectedType);
      setPurchasePriceTomans(currentItem?.unitPriceTomans ? String(currentItem.unitPriceTomans) : '');
      setPurchaseDate(getPersianFormattedDate());
      setNotes('');
    }
  }, [isOpen, defaultSelectedType, items]);

  if (!isOpen) return null;

  const currentItem = items.find((i) => i.id === selectedType) || items[0];
  const numQty = parseNumberInput(quantity);
  const numUnitPrice = parseNumberInput(purchasePriceTomans);
  const totalCost = numQty * numUnitPrice;

  const handleSelectType = (id: PhysicalGoldType) => {
    triggerHaptic('light');
    setSelectedType(id);
    const itm = items.find((i) => i.id === id);
    if (itm && itm.unitPriceTomans > 0 && !purchasePriceTomans) {
      setPurchasePriceTomans(String(itm.unitPriceTomans));
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (numQty <= 0 || numUnitPrice <= 0) {
      alert('لطفاً مقدار و قیمت خرید واحد را معتبر وارد نمایید.');
      return;
    }

    triggerHaptic('medium');
    onSaveLot({
      goldType: selectedType,
      quantity: numQty,
      purchaseUnitPriceTomans: numUnitPrice,
      purchaseDate: purchaseDate.trim() || getPersianFormattedDate(),
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const footerActions = (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onClose}
        className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all interactive-tap touch-target border border-slate-200 dark:border-slate-700"
      >
        انصراف
      </button>
      <button
        type="button"
        onClick={() => handleSave()}
        className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-gold-500 hover:from-amber-300 hover:to-gold-400 text-slate-950 font-black text-xs transition-all shadow-gold-glow flex items-center justify-center gap-1.5 interactive-tap touch-target"
      >
        <Check className="w-4 h-4" />
        <span>ثبت پله خرید طلا</span>
      </button>
    </div>
  );

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="ثبت پله خرید طلای فیزیکی (Buy Lot)"
      subtitle="محاسبه دقیق بهای تمام‌شده میانگین و سود/زیان لحظه‌ای"
      icon={<Sparkles className="w-5 h-5 text-amber-700 dark:text-gold-400" />}
      footer={footerActions}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        
        {/* 1. Item Selector Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">نوع طلا یا مسکوکات</label>
          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-0.5">
            {items.map((item) => {
              const isSelected = selectedType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectType(item.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all interactive-tap touch-target ${
                    isSelected
                      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:border-gold-500 dark:text-gold-300 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="text-sm">{item.id.startsWith('coin_') ? '🪙' : '🥇'}</span>
                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Quantity / Weight Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              مقدار خریداری‌شده ({currentItem.unit})
            </label>
            {numQty > 0 && (
              <span className="text-[11px] font-bold text-amber-700 dark:text-gold-400">
                {toPersianDigits(numQty)} {currentItem.unit}
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={currentItem.unit === 'گرم' ? 'مثلاً ۱۰.۵' : 'مثلاً ۱'}
              className="w-full pl-16 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-left dir-ltr font-bold text-base outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-amber-700 dark:text-gold-400 font-bold pointer-events-none">
              {currentItem.unit}
            </div>
          </div>
        </div>

        {/* 3. Purchase Unit Price Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              قیمت خرید هر {currentItem.unit} (تومان)
            </label>
            {numUnitPrice > 0 && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 dir-rtl">
                {formatToman(numUnitPrice)} تومان
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              value={purchasePriceTomans ? new Intl.NumberFormat('en-US').format(parseNumberInput(purchasePriceTomans)) : ''}
              onChange={(e) => setPurchasePriceTomans(e.target.value)}
              placeholder="قیمت واحد به تومان"
              className="w-full pl-16 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-left dir-ltr font-bold text-base outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-bold pointer-events-none">
              تومان
            </div>
          </div>
        </div>

        {/* Total Cost Preview */}
        {totalCost > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-amber-200 dark:border-gold-500/30 flex items-center justify-between animate-fadeIn">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">جمع هزینه این پله خرید:</span>
            <div className="text-sm font-black text-amber-700 dark:text-gold-400 dir-ltr">
              {formatToman(totalCost)} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">تومان</span>
            </div>
          </div>
        )}

        {/* 4. Purchase Date */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">تاریخ خرید</label>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setPurchaseDate(getTodayPersianDate());
              }}
              className="text-[10px] text-amber-700 hover:text-amber-800 dark:text-gold-400 dark:hover:text-gold-300 font-bold bg-amber-50 dark:bg-gold-500/10 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-gold-500/20 transition-colors"
            >
              امروز
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              placeholder="مثال: ۱۴۰۳/۰۶/۰۹"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-right font-medium text-xs outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 pl-11"
            />
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsDatePickerOpen(true);
              }}
              className="p-2 absolute left-1.5 top-1/2 -translate-y-1/2 rounded-xl text-amber-600 dark:text-gold-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors touch-target"
              title="انتخاب از تقویم شمسی"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5. Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">یادداشت پله خرید</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: طلافروشی بازار بزرگ، بدون اجرت..."
            className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-right font-normal text-xs outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>

      </form>

      <PersianDatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={purchaseDate}
        onSelectDate={(d) => setPurchaseDate(d)}
        title="انتخاب تاریخ خرید طلا"
      />
    </BottomSheetModal>
  );
};
