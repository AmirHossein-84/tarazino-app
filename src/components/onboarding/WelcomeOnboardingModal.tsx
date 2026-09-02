import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Check,
  Building2,
  Car,
  Coins,
  TrendingUp,
  Key,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { UserProfile, PropertyItem, VehicleItem } from '../../types/investment';
import { NobitexConfig } from '../../services/nobitex/types';

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onComplete: (profileName: string, initialData?: Partial<UserProfile>) => void;
}

const AVATAR_COLORS = [
  '#3b82f6', // blue
  '#eab308', // gold/amber
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f43f5e', // rose
  '#06b6d4', // cyan
];

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(0);

  // Profile setup
  const [userName, setUserName] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);

  // Optional Property setup
  const [propertyTitle, setPropertyTitle] = useState('');
  const [propertyPriceToman, setPropertyPriceToman] = useState('');

  // Optional Vehicle setup
  const [vehicleTitle, setVehicleTitle] = useState('');
  const [vehiclePriceToman, setVehiclePriceToman] = useState('');

  // Optional Nobitex setup
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');

  if (!isOpen) return null;

  const totalSlides = 5;

  const handleNext = () => {
    triggerHaptic('light');
    if (step === 2 && !userName.trim()) {
      alert('لطفاً نام یا عنوان حساب خود را وارد کنید.');
      return;
    }
    if (step < totalSlides - 1) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    triggerHaptic('light');
    if (step > 0) setStep((s) => s - 1);
  };

  const handleFinish = () => {
    triggerHaptic('success');

    const initialProperties: PropertyItem[] = [];
    if (propertyTitle.trim()) {
      const priceRial = (Number(propertyPriceToman.replace(/,/g, '')) || 0) * 10;
      initialProperties.push({
        id: `prop_${Date.now()}`,
        title: propertyTitle.trim(),
        type: 'residential',
        areaSquareMeters: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePriceRial: priceRial,
        currentValuationRial: priceRial,
        currentValuationUsd: 0,
        includeInTotalNetWorth: true,
      });
    }

    const initialVehicles: VehicleItem[] = [];
    if (vehicleTitle.trim()) {
      const priceToman = Number(vehiclePriceToman.replace(/,/g, '')) || 0;
      initialVehicles.push({
        id: `veh_${Date.now()}`,
        title: vehicleTitle.trim(),
        vehicleType: 'car',
        model: '',
        year: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePriceTomans: priceToman,
        currentValuationTomans: priceToman,
        includeInTotalNetWorth: true,
      });
    }

    const initialNobitex: NobitexConfig | undefined =
      publicKey.trim()
        ? {
            authType: 'api_key',
            publicKey: publicKey.trim(),
            secretKey: secretKey.trim(),
          }
        : undefined;

    onComplete(userName.trim() || 'حساب اصلی', {
      avatarColor,
      properties: initialProperties,
      vehicles: initialVehicles,
      ...(initialNobitex ? { nobitexConfig: initialNobitex } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-fadeIn">
        
        {/* Progress Bar & Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-gold-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              خوش‌آمدید به ترازینو
            </span>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-amber-500'
                    : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Slide Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 select-none">
          
          {/* SLIDE 0: INTRO */}
          {step === 0 && (
            <div className="text-center space-y-4 animate-fadeIn">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-gold-400 text-slate-950 mx-auto flex items-center justify-center shadow-gold-glow">
                <img src="/favicon.png" alt="Logo" className="w-16 h-16 rounded-2xl object-cover" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  مدیریت هوشمند دارایی و ثروت خالص
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  ترازینو تمامی سرمایه‌گذاری‌های شما در بورس، طلای فیزیکی و سکه، رمزارزها، املاک و وسایل نقلیه را در یک پلتفرم آفلاین و امن مدیریت می‌کند.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-right pt-2">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">طلای فیزیکی و بورسی</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">اتصال زنده نوبیتکس</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">املاک و مستغلات</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">خودرو و موتور</span>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 1: HOW IT WORKS */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  بخش‌های کلیدی اپلیکیشن
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  نگاهی کوتاه به امکانات و شیوه استفاده از نوار پایین
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    ۱
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">داشبورد و تخصیص سرمایه</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      مشاهده سرجمع ارزش دارایی‌ها و محاسبه خودکار تخصیص سرمایه (فرمول ۸۰/۲۰ طلا و کریپتو).
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    ۲
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">بازارهای زنده مالی</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      مشاهده نرخ‌های آنلاین صندوق‌های طلا بورس و قیمت لحظه‌ای ارزهای دیجیتال نوبیتکس.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    ۳
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">مدیریت دارایی‌ها (Holdings)</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ثبت و پایش موجودی طلا، رمزارزها، املاک، و خودروها با محاسبه سود و زیان روز.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: USER PROFILE SETUP */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <div
                  className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-white shadow-md transition-colors"
                  style={{ backgroundColor: avatarColor }}
                >
                  <User className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 pt-2">
                  ایجاد حساب کاربری محلی
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  اطلاعات شما ۱۰۰٪ در حافظه گوشی شما ذخیره شده و نیازی به رمز عبور ندارد
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  نام یا عنوان حساب شما <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="مثال: حساب شخصی، سرمایه‌گذاری من، علی..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-amber-500 text-slate-900 dark:text-slate-100 text-right font-bold text-sm outline-none transition-colors"
                  autoFocus
                />
              </div>

              {/* Avatar Color Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  رنگ پروفایل
                </label>
                <div className="flex items-center justify-center gap-3">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        avatarColor === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: OPTIONAL ASSETS (PROPERTY & VEHICLE) */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  ثبت دارایی‌های اولیه (اختیاری)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  اگر مایلید، می‌توانید ملک یا خودروی خود را اکنون وارد کنید یا بعداً اضافه نمایید.
                </p>
              </div>

              {/* Property Optional */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-400">
                  <Building2 className="w-4 h-4" />
                  <span>ثبت ملک (اختیاری)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={propertyTitle}
                    onChange={(e) => setPropertyTitle(e.target.value)}
                    placeholder="عنوان ملک (مثال: آپارتمان تهران)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-right outline-none"
                  />
                  <input
                    type="text"
                    value={propertyPriceToman}
                    onChange={(e) => setPropertyPriceToman(e.target.value)}
                    placeholder="ارزش تقریبی (تومان)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-right outline-none"
                  />
                </div>
              </div>

              {/* Vehicle Optional */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-blue-700 dark:text-blue-400">
                  <Car className="w-4 h-4" />
                  <span>ثبت خودرو یا موتور (اختیاری)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={vehicleTitle}
                    onChange={(e) => setVehicleTitle(e.target.value)}
                    placeholder="مدل خودرو (مثال: پژو ۲۰۷)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-right outline-none"
                  />
                  <input
                    type="text"
                    value={vehiclePriceToman}
                    onChange={(e) => setVehiclePriceToman(e.target.value)}
                    placeholder="ارزش روز (تومان)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-right outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: OPTIONAL NOBITEX API */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-600 mx-auto flex items-center justify-center">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  اتصال کلید API نوبیتکس (اختیاری)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  جهت دریافت خودکار موجودی رمزارزها و مانده ریالی از صرافی نوبیتکس
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    کلید عمومی (API Key)
                  </label>
                  <input
                    type="text"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder="API Key را اینجا قرار دهید..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs dir-ltr font-mono outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    کلید محرمانه (Secret Key)
                  </label>
                  <input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Secret Key را اینجا قرار دهید..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs dir-ltr font-mono outline-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-500/30 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>کلیدهای شما صرفاً در گوشی ذخیره می‌شوند و برای هیچ سروری ارسال نخواهند شد.</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/50">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="py-2.5 px-4 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              <span>قبلی</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {/* Skip Button for optional steps (steps 3 & 4) */}
            {(step === 3 || step === 4) && (
              <button
                type="button"
                onClick={handleNext}
                className="py-2.5 px-3.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold transition-colors"
              >
                رد کردن این مرحله
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 hover:from-amber-400 hover:to-gold-400 text-slate-950 font-black text-xs transition-all shadow-gold-glow flex items-center gap-1.5 interactive-tap"
            >
              <span>{step === totalSlides - 1 ? 'ورود به ترازینو' : 'ادامه'}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
