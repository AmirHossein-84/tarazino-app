import React, { useState, useEffect } from 'react';
import {
  Car,
  Bike,
  Sparkles,
  Check,
  Calendar,
  Layers,
} from 'lucide-react';
import { VehicleItem, VehicleType } from '../../types/investment';
import {
  formatToman,
  toPersianDigits,
  parseNumberInput,
  getTodayPersianDate,
} from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { BottomSheetModal } from '../common/BottomSheetModal';
import { InlinePersianDatePicker } from '../common/InlinePersianDatePicker';

interface AddEditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVehicle: (vehicle: Omit<VehicleItem, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => void;
  initialVehicle?: VehicleItem | null;
  usdtRateTomans?: number;
}

const VEHICLE_TYPES: { type: VehicleType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'car', label: 'خودرو سواری', icon: Car },
  { type: 'motorcycle', label: 'موتورسیکلت', icon: Bike },
  { type: 'other', label: 'سایر وسایل', icon: Sparkles },
];

export const AddEditVehicleModal: React.FC<AddEditVehicleModalProps> = ({
  isOpen,
  onClose,
  onSaveVehicle,
  initialVehicle,
  usdtRateTomans = 93000,
}) => {
  const isEditing = !!initialVehicle;

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileageKm, setMileageKm] = useState('');
  const [purchasePriceToman, setPurchasePriceToman] = useState('');
  const [currentValuationToman, setCurrentValuationToman] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [includeInTotalNetWorth, setIncludeInTotalNetWorth] = useState(true);

  useEffect(() => {
    if (initialVehicle) {
      setTitle(initialVehicle.title || '');
      setVehicleType(initialVehicle.vehicleType || 'car');
      setModel(initialVehicle.model || '');
      setYear(initialVehicle.year || '');
      setMileageKm(initialVehicle.mileageKm !== undefined ? String(initialVehicle.mileageKm) : '');
      setPurchasePriceToman(
        initialVehicle.purchasePriceTomans ? String(initialVehicle.purchasePriceTomans) : ''
      );
      setCurrentValuationToman(
        initialVehicle.currentValuationTomans ? String(initialVehicle.currentValuationTomans) : ''
      );
      setPurchaseDate(initialVehicle.purchaseDate || getTodayPersianDate());
      setNotes(initialVehicle.notes || '');
      setIncludeInTotalNetWorth(initialVehicle.includeInTotalNetWorth !== false);
    } else {
      setTitle('');
      setVehicleType('car');
      setModel('');
      setYear('');
      setMileageKm('');
      setPurchasePriceToman('');
      setCurrentValuationToman('');
      setPurchaseDate(getTodayPersianDate());
      setNotes('');
      setIncludeInTotalNetWorth(true);
    }
  }, [initialVehicle, isOpen]);

  if (!isOpen) return null;

  const numMileage = parseNumberInput(mileageKm);
  const numPurchaseToman = parseNumberInput(purchasePriceToman);
  const numCurrentToman = parseNumberInput(currentValuationToman) || numPurchaseToman;

  const gainToman = numCurrentToman - numPurchaseToman;
  const gainPercent = numPurchaseToman > 0 ? ((numCurrentToman - numPurchaseToman) / numPurchaseToman) * 100 : 0;
  const valuationUsd = usdtRateTomans > 0 ? Number((numCurrentToman / usdtRateTomans).toFixed(2)) : 0;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('لطفاً عنوان یا نام وسیله نقلیه را وارد کنید.');
      return;
    }

    triggerHaptic('medium');

    onSaveVehicle(
      {
        title: title.trim(),
        vehicleType,
        model: model.trim(),
        year: year.trim(),
        mileageKm: numMileage > 0 ? numMileage : undefined,
        purchaseDate: purchaseDate.trim() || getTodayPersianDate(),
        purchasePriceTomans: numPurchaseToman,
        currentValuationTomans: numCurrentToman,
        notes: notes.trim() || undefined,
        includeInTotalNetWorth,
      },
      initialVehicle?.id
    );

    onClose();
  };

  const footerActions = (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onClose}
        className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors interactive-tap touch-target border border-slate-200 dark:border-slate-700"
      >
        انصراف
      </button>
      <button
        type="button"
        onClick={() => handleSave()}
        className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 interactive-tap touch-target"
      >
        <Check className="w-4 h-4" />
        <span>{isEditing ? 'ذخیره تغییرات خودرو' : 'افزودن وسیله نقلیه جدید'}</span>
      </button>
    </div>
  );

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'ویرایش اطلاعات وسیله نقلیه' : 'ثبت خودرو یا موتورسیکلت جدید'}
      subtitle="مدیریت سرمایه و ارزش‌گذاری وسایل نقلیه"
      icon={<Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      footer={footerActions}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        
        {/* 1. Vehicle Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">نوع وسیله نقلیه</label>
          <div className="grid grid-cols-3 gap-2">
            {VEHICLE_TYPES.map((vt) => {
              const Icon = vt.icon;
              const isSelected = vehicleType === vt.type;
              return (
                <button
                  key={vt.type}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setVehicleType(vt.type);
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all interactive-tap touch-target ${
                    isSelected
                      ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:border-blue-500 dark:text-blue-300 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span>{vt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Title & Model */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              عنوان وسیله نقلیه <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: پژو ۲۰۷ دنده‌ای"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-right font-medium text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
              autoFocus={!isEditing}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">مدل یا تیپ</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="مثال: TU5 سقف شیشه‌ای"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-right font-medium text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* 3. Year & Mileage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">سال ساخت</label>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="مثال: ۱۴۰۲ یا ۲۰۲۳"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-right font-medium text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">کارکرد (کیلومتر)</label>
              {numMileage > 0 && (
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {toPersianDigits(new Intl.NumberFormat('fa-IR').format(numMileage))} کیلومتر
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="numeric"
                value={mileageKm ? new Intl.NumberFormat('en-US').format(parseNumberInput(mileageKm)) : ''}
                onChange={(e) => setMileageKm(e.target.value)}
                placeholder="مثال: ۲۵,۰۰۰"
                className="w-full pl-20 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-left dir-ltr font-bold text-base outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:text-right placeholder:dir-rtl"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-bold pointer-events-none">
                کیلومتر
              </div>
            </div>
          </div>
        </div>

        {/* 4. Purchase Price (Toman) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">قیمت خرید (تومان)</label>
            {numPurchaseToman > 0 && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 dir-rtl">
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
              placeholder="مثال: ۶۵۰,۰۰۰,۰۰۰"
              className="w-full pl-20 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-left dir-ltr font-bold text-base outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:text-right placeholder:dir-rtl"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-bold pointer-events-none">
              تومان
            </div>
          </div>
        </div>

        {/* 5. Current Estimated Valuation (Toman) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              ارزش روز برآورد شده (تومان)
            </label>
            {numCurrentToman > 0 && (
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 dir-rtl">
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
              className="w-full pl-20 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-left dir-ltr font-bold text-base outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:text-right placeholder:dir-rtl"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-bold pointer-events-none">
              تومان
            </div>
          </div>
        </div>

        {/* Live Calculation Preview Card */}
        {numCurrentToman > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-blue-200 dark:border-blue-500/30 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">معادل دلاری روز (تتر):</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 dir-ltr">
                $ {new Intl.NumberFormat('en-US').format(valuationUsd)}
              </span>
            </div>

            {numPurchaseToman > 0 && gainToman !== 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">سود / تغییر ارزش سرمایه:</span>
                <div className="flex items-center gap-1.5 dir-ltr">
                  <span
                    className={`font-black ${
                      gainToman >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {gainToman >= 0 ? '+' : ''}{formatToman(gainToman)} تومان
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      gainToman >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                    }`}
                  >
                    {gainToman >= 0 ? '+' : ''}{toPersianDigits(gainPercent.toFixed(1))}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. Purchase Date (using PersianDatePickerModal) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">تاریخ خرید</label>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setPurchaseDate(getTodayPersianDate());
              }}
              className="text-[10px] text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-500/20 transition-colors"
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
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-right font-medium text-xs outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 pl-11"
            />
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsDatePickerOpen((prev) => !prev);
              }}
              className="p-2 absolute left-1.5 top-1/2 -translate-y-1/2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors touch-target"
              title="انتخاب از تقویم شمسی"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          {isDatePickerOpen && (
            <div className="mt-2">
              <InlinePersianDatePicker
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                selectedDate={purchaseDate}
                onSelectDate={(d) => setPurchaseDate(d)}
                title="انتخاب تاریخ خرید خودرو"
              />
            </div>
          )}
        </div>

        {/* 7. Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">یادداشت‌ها (رنگ، بیمه، سند)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: رنگ سفید، بیمه تا آخر سال، بدون رنگ، تک‌برگ سند..."
            className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 focus:bg-white text-slate-900 dark:text-slate-100 text-right font-normal text-xs outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none"
          />
        </div>

        {/* 8. Include in Total Net Worth Toggle */}
        <label className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer interactive-tap">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              محاسبه در دارایی کل (Net Worth)
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
              در صورت فعال بودن، ارزش این وسیله نقلیه در نمودار و سرجمع ثروت خالص محاسبه می‌شود.
            </span>
          </div>
          <input
            type="checkbox"
            checked={includeInTotalNetWorth}
            onChange={(e) => setIncludeInTotalNetWorth(e.target.checked)}
            className="w-5 h-5 rounded-lg text-blue-600 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-0 cursor-pointer shrink-0 mr-3"
          />
        </label>

      </form>
    </BottomSheetModal>
  );
};
