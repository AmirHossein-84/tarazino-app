import React, { useState, useEffect } from 'react';
import {
  Building2,
  Home,
  Store,
  Trees,
  Briefcase,
  Layers,
  Check,
  Calendar,
  FileText,
  DollarSign,
  Maximize2,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { PropertyItem, PropertyType } from '../../types/investment';
import { formatToman, toPersianDigits, parseNumberInput, getPersianFormattedDate } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { BottomSheetModal } from '../common/BottomSheetModal';

interface AddEditPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProperty: (property: Omit<PropertyItem, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => void;
  initialProperty?: PropertyItem | null;
  usdtRateTomans?: number;
}

const PROPERTY_TYPES: { type: PropertyType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'residential', label: 'مسکونی', icon: Home },
  { type: 'commercial', label: 'تجاری / مغازه', icon: Store },
  { type: 'office', label: 'اداری / دفتر کار', icon: Briefcase },
  { type: 'land', label: 'زمین / کلنگی', icon: Trees },
  { type: 'other', label: 'سایر / متفرقه', icon: Layers },
];

export const AddEditPropertyModal: React.FC<AddEditPropertyModalProps> = ({
  isOpen,
  onClose,
  onSaveProperty,
  initialProperty,
  usdtRateTomans = 93000,
}) => {
  const isEditing = !!initialProperty;

  const [title, setTitle] = useState('');
  const [type, setType] = useState<PropertyType>('residential');
  const [areaSquareMeters, setAreaSquareMeters] = useState('');
  const [purchasePriceToman, setPurchasePriceToman] = useState('');
  const [currentValuationToman, setCurrentValuationToman] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [includeInTotalNetWorth, setIncludeInTotalNetWorth] = useState(true);

  useEffect(() => {
    if (initialProperty) {
      setTitle(initialProperty.title || '');
      setType(initialProperty.type || 'residential');
      setAreaSquareMeters(initialProperty.areaSquareMeters ? String(initialProperty.areaSquareMeters) : '');
      setPurchasePriceToman(
        initialProperty.purchasePriceRial ? String(Math.round(initialProperty.purchasePriceRial / 10)) : ''
      );
      setCurrentValuationToman(
        initialProperty.currentValuationRial ? String(Math.round(initialProperty.currentValuationRial / 10)) : ''
      );
      setPurchaseDate(initialProperty.purchaseDate || getPersianFormattedDate());
      setNotes(initialProperty.notes || '');
      setIncludeInTotalNetWorth(initialProperty.includeInTotalNetWorth !== false);
    } else {
      setTitle('');
      setType('residential');
      setAreaSquareMeters('');
      setPurchasePriceToman('');
      setCurrentValuationToman('');
      setPurchaseDate(getPersianFormattedDate());
      setNotes('');
      setIncludeInTotalNetWorth(true);
    }
  }, [initialProperty, isOpen]);

  if (!isOpen) return null;

  const numArea = parseNumberInput(areaSquareMeters);
  const numPurchaseToman = parseNumberInput(purchasePriceToman);
  const numCurrentToman = parseNumberInput(currentValuationToman) || numPurchaseToman;

  // Price calculations
  const pricePerSqmToman = numArea > 0 && numCurrentToman > 0 ? Math.round(numCurrentToman / numArea) : 0;
  const gainToman = numCurrentToman - numPurchaseToman;
  const gainPercent = numPurchaseToman > 0 ? ((numCurrentToman - numPurchaseToman) / numPurchaseToman) * 100 : 0;
  const valuationUsd = usdtRateTomans > 0 ? Number((numCurrentToman / usdtRateTomans).toFixed(2)) : 0;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('لطفاً عنوان ملک را وارد کنید.');
      return;
    }

    triggerHaptic('medium');

    const purchasePriceRial = numPurchaseToman * 10;
    const currentValuationRial = numCurrentToman * 10;

    onSaveProperty(
      {
        title: title.trim(),
        type,
        areaSquareMeters: numArea,
        purchaseDate: purchaseDate.trim() || getPersianFormattedDate(),
        purchasePriceRial,
        currentValuationRial,
        currentValuationUsd: valuationUsd,
        notes: notes.trim() || undefined,
        includeInTotalNetWorth,
      },
      initialProperty?.id
    );

    onClose();
  };

  const footerActions = (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onClose}
        className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all interactive-tap touch-target"
      >
        انصراف
      </button>
      <button
        type="button"
        onClick={() => handleSave()}
        className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 interactive-tap touch-target"
      >
        <Check className="w-4 h-4" />
        <span>{isEditing ? 'ذخیره تغییرات ملک' : 'افزودن ملک جدید'}</span>
      </button>
    </div>
  );

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'ویرایش اطلاعات ملک' : 'ثبت ملک و مستغلات جدید'}
      subtitle="مدیریت ارزش‌گذاری و محاسبه در دارایی کل"
      icon={<Building2 className="w-5 h-5 text-emerald-400" />}
      footer={footerActions}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        
        {/* 1. Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block">
            عنوان یا نام ملک <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: آپارتمان مسکونی سعادت‌آباد"
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 text-slate-100 text-right font-medium text-sm outline-none transition-all placeholder:text-slate-600"
            autoFocus={!isEditing}
          />
        </div>

        {/* 2. Type Selector Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block">نوع کاربری ملک</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROPERTY_TYPES.map((pt) => {
              const Icon = pt.icon;
              const isSelected = type === pt.type;
              return (
                <button
                  key={pt.type}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setType(pt.type);
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all interactive-tap touch-target ${
                    isSelected
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="truncate">{pt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Area (Square Meters) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 block">مساحت (متر مربع)</label>
            {numArea > 0 && (
              <span className="text-[11px] font-bold text-emerald-400">
                {toPersianDigits(numArea)} متر مربع
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              value={areaSquareMeters}
              onChange={(e) => setAreaSquareMeters(e.target.value)}
              placeholder="مثال: ۱۲۰"
              className="w-full pl-24 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 text-slate-100 text-left dir-ltr font-bold text-base outline-none transition-all placeholder:text-slate-600 placeholder:text-right placeholder:dir-rtl"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-bold pointer-events-none">
              متر مربع
            </div>
          </div>
        </div>

        {/* 4. Purchase Price (Toman) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 block">قیمت خرید (تومان)</label>
            {numPurchaseToman > 0 && (
              <span className="text-[11px] font-bold text-slate-400 dir-rtl">
                {formatToman(numPurchaseToman)} تومان
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              value={purchasePriceToman ? new Intl.NumberFormat('en-US').format(parseNumberInput(purchasePriceToman)) : ''}
              onChange={(e) => setPurchasePriceToman(e.target.value)}
              placeholder="مثال: ۱۰,۰۰۰,۰۰۰,۰۰۰"
              className="w-full pl-20 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 text-slate-100 text-left dir-ltr font-bold text-base outline-none transition-all placeholder:text-slate-600 placeholder:text-right placeholder:dir-rtl"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-bold pointer-events-none">
              تومان
            </div>
          </div>
        </div>

        {/* 5. Current Estimated Valuation (Toman) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 block">
              ارزش روز برآورد شده (تومان)
            </label>
            {numCurrentToman > 0 && (
              <span className="text-[11px] font-bold text-emerald-400 dir-rtl">
                {formatToman(numCurrentToman)} تومان
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              value={currentValuationToman ? new Intl.NumberFormat('en-US').format(parseNumberInput(currentValuationToman)) : ''}
              onChange={(e) => setCurrentValuationToman(e.target.value)}
              placeholder="در صورت خالی بودن، معادل قیمت خرید"
              className="w-full pl-20 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 text-slate-100 text-left dir-ltr font-bold text-base outline-none transition-all placeholder:text-slate-600 placeholder:text-right placeholder:dir-rtl text-xs sm:text-base"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-bold pointer-events-none">
              تومان
            </div>
          </div>
        </div>

        {/* Live Calculation Preview Card */}
        {numCurrentToman > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">قیمت هر متر مربع:</span>
              <span className="font-bold text-slate-200 dir-ltr">
                {pricePerSqmToman > 0 ? `${formatToman(pricePerSqmToman)} تومان/متر` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">معادل دلاری روز (تتر):</span>
              <span className="font-bold text-emerald-400 dir-ltr">
                $ {new Intl.NumberFormat('en-US').format(valuationUsd)}
              </span>
            </div>

            {numPurchaseToman > 0 && gainToman !== 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">میزان رشد و سود سرمایه:</span>
                <div className="flex items-center gap-1.5 dir-ltr">
                  <span
                    className={`font-black ${
                      gainToman >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {gainToman >= 0 ? '+' : ''}{formatToman(gainToman)} تومان
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      gainToman >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {gainToman >= 0 ? '+' : ''}{toPersianDigits(gainPercent.toFixed(1))}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. Purchase Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block">تاریخ خرید یا ثبت</label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              placeholder="مثال: ۱۴۰۲/۰۸/۱۵"
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 text-slate-100 text-right font-medium text-xs outline-none transition-all placeholder:text-slate-600"
            />
            <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 7. Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block">یادداشت‌ها و مشخصات سند</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: سند ۶ دانگ تک‌برگ، دارای پارکینگ و انباری، در رهن مستاجر..."
            className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 text-slate-100 text-right font-normal text-xs outline-none transition-all placeholder:text-slate-600 resize-none"
          />
        </div>

        {/* 8. Include in Total Net Worth Toggle */}
        <label className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between cursor-pointer interactive-tap">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-200 block">
              محاسبه در دارایی کل (Net Worth)
            </span>
            <span className="text-[10px] text-slate-400 block">
              در صورت فعال بودن، ارزش این ملک در نمودار و سرجمع دارایی‌های کل نمایش داده می‌شود.
            </span>
          </div>
          <input
            type="checkbox"
            checked={includeInTotalNetWorth}
            onChange={(e) => setIncludeInTotalNetWorth(e.target.checked)}
            className="w-5 h-5 rounded-lg text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer shrink-0 mr-3"
          />
        </label>

      </form>
    </BottomSheetModal>
  );
};
