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
  Sparkles,
  Sliders,
  Wallet,
  PieChart,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { UserProfile, PropertyItem, VehicleItem, CryptoAsset, AppSettings } from '../../types/investment';
import { NobitexConfig } from '../../services/nobitex/types';
import { DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS } from '../../constants/defaultData';
import { toPersianDigits } from '../../utils/formatters';

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

interface AvailableCrypto {
  symbol: string;
  name: string;
  color: string;
  defaultPercent: number;
}

const AVAILABLE_CRYPTOS: AvailableCrypto[] = [
  { symbol: 'BTC', name: 'بیت‌کوین (Bitcoin)', color: '#F7931A', defaultPercent: 40 },
  { symbol: 'ETH', name: 'اتریوم (Ethereum)', color: '#627EEA', defaultPercent: 30 },
  { symbol: 'SOL', name: 'سولانا (Solana)', color: '#14F195', defaultPercent: 15 },
  { symbol: 'TON', name: 'تن‌کوین (Toncoin)', color: '#0098EA', defaultPercent: 15 },
  { symbol: 'USDT', name: 'تتر (Tether)', color: '#26A17B', defaultPercent: 0 },
  { symbol: 'BNB', name: 'بایننس کوین (BNB)', color: '#F3BA2F', defaultPercent: 0 },
  { symbol: 'XRP', name: 'ریپل (Ripple)', color: '#23292F', defaultPercent: 0 },
  { symbol: 'DOGE', name: 'دوج‌کوین (Dogecoin)', color: '#C2A633', defaultPercent: 0 },
];

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(0);

  // 1. Profile setup
  const [userName, setUserName] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);

  // 2. Strategy & Crypto setup
  const [strategyMode, setStrategyMode] = useState<'default' | 'custom'>('default');
  const [goldRatio, setGoldRatio] = useState<number>(80);
  const [savingsPercent, setSavingsPercent] = useState<number>(30);
  const [selectedCryptoSymbols, setSelectedCryptoSymbols] = useState<string[]>(['BTC', 'ETH', 'SOL', 'TON']);
  const [cryptoWeights, setCryptoWeights] = useState<Record<string, number>>({
    BTC: 40,
    ETH: 30,
    SOL: 15,
    TON: 15,
    USDT: 0,
    BNB: 0,
    XRP: 0,
    DOGE: 0,
  });

  // 3. Optional Property setup
  const [propertyTitle, setPropertyTitle] = useState('');
  const [propertyPriceToman, setPropertyPriceToman] = useState('');

  // 4. Optional Vehicle setup
  const [vehicleTitle, setVehicleTitle] = useState('');
  const [vehiclePriceToman, setVehiclePriceToman] = useState('');

  // 5. Optional Nobitex setup
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');

  if (!isOpen) return null;

  const totalSlides = 6;

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

  const toggleCrypto = (symbol: string) => {
    triggerHaptic('light');
    setSelectedCryptoSymbols((prev) => {
      if (prev.includes(symbol)) {
        if (prev.length <= 1) return prev; // At least one crypto must remain
        return prev.filter((s) => s !== symbol);
      }
      return [...prev, symbol];
    });
  };

  const updateCryptoWeight = (symbol: string, weight: number) => {
    setCryptoWeights((prev) => ({
      ...prev,
      [symbol]: Math.max(0, Math.min(100, weight)),
    }));
  };

  const handleFinish = () => {
    triggerHaptic('success');

    // Build Settings
    const customSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      goldPercent: strategyMode === 'default' ? 80 : goldRatio,
      cryptoPercent: strategyMode === 'default' ? 20 : (100 - goldRatio),
      savingsPercent: strategyMode === 'default' ? 30 : savingsPercent,
    };

    // Build Crypto Assets
    let finalCryptoAssets: CryptoAsset[] = DEFAULT_CRYPTO_ASSETS;
    if (strategyMode === 'custom') {
      const activeSymbols = AVAILABLE_CRYPTOS.filter((c) => selectedCryptoSymbols.includes(c.symbol));
      const totalCustomWeight = activeSymbols.reduce((sum, c) => sum + (cryptoWeights[c.symbol] || 0), 0) || 100;

      finalCryptoAssets = activeSymbols.map((c) => {
        const rawWeight = cryptoWeights[c.symbol] || 0;
        const normalizedPercent = Math.round((rawWeight / totalCustomWeight) * 100);
        return {
          id: c.symbol.toLowerCase(),
          symbol: c.symbol,
          name: c.name,
          color: c.color,
          targetPercent: normalizedPercent,
          currentHoldingValue: 0,
          isDefault: true,
        };
      });
    }

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
      settings: customSettings,
      cryptoAssets: finalCryptoAssets,
      properties: initialProperties,
      vehicles: initialVehicles,
      ...(initialNobitex ? { nobitexConfig: initialNobitex } : {}),
    });
  };

  const isSkippableStep = step === 4 || step === 5;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-h-[92dvh] animate-fadeIn">
        
        {/* Header with Title & RTL Progress Dots */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-gold-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              راهنمای راه‌اندازی ترازینو
            </span>
          </div>

          {/* Dots Indicator (LTR progression) */}
          <div className="flex items-center gap-1.5" dir="ltr">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-amber-500 shadow-gold-glow'
                    : i < step
                    ? 'w-2 bg-amber-500/50'
                    : 'w-2 bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Body Slides Container */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-5">
          
          {/* SLIDE 0: Welcome Intro */}
          {step === 0 && (
            <div className="text-center space-y-4 py-2 animate-slideInFromLeft">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-gold-400 to-amber-600 p-0.5 shadow-gold-glow flex items-center justify-center">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[22px] flex items-center justify-center">
                  <Coins className="w-10 h-10 text-amber-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  به ترازینو خوش آمدید
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  دستیار هوشمند مدیریت، ترازگیری و ارزش‌گذاری پورتفولیوی طلا، سکه، رمزارزها، املاک و خودرو به صورت کاملاً آفلاین و امن.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 text-right">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-gold-400 font-bold text-xs">
                    <PieChart className="w-4 h-4 shrink-0" />
                    <span>تراز هوشمند سبد</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                    تقسیم علمی سرمایه با فرمول طلایی ۸۰/۲۰ میان طلا و رمزارزها.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>۱۰۰٪ آفلاین و محلی</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                    اطلاعات فقط روی حافظه گوشی ذخیره شده و هیچ سروری دخیل نیست.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 1: App Sections Tour */}
          {step === 1 && (
            <div className="space-y-3.5 animate-slideInFromLeft">
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  بخش‌های اصلی ترازینو
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ناوبری سریع میان ۵ بخش کلیدی اپلیکیشن
                </p>
              </div>

              <div className="space-y-2 text-right">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-gold-400 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">داشبورد و ماشین‌حساب</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">محاسبه سرمایه‌گذاری جدید، نمودار توزیع دارایی و ثروت خالص</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">هاب جامع بازارها</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">پایش قیمت زنده طلا و صندوق‌های بورسی همراه با رمزارزهای نوبیتکس</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">مدیریت ۴ دارایی</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">ثبت طلا و سکه، کریپتو، املاک و مستغلات، و خودرو و موتورسیکلت</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">فروش هوشمند و تنظیمات</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">سیستم فروش کمترین آسیب به بالانس و مدیریت پروفایل‌های چندکاربره</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Create Profile & Avatar */}
          {step === 2 && (
            <div className="space-y-4 animate-slideInFromLeft">
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  ایجاد حساب کاربری شما
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  بدون نیاز به پسورد، با قابلیت نگهداری دائمی روی گوشی حتی پس از حذف برنامه
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    نام یا عنوان حساب شما <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="مثال: حساب اصلی، سبد علی، خانواده..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:bg-white text-slate-900 dark:text-slate-100 text-right font-medium text-sm outline-none"
                      autoFocus
                    />
                    <div className="absolute left-3.5 text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    انتخاب رنگ آواتار
                  </label>
                  <div className="flex items-center gap-2.5">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setAvatarColor(color);
                        }}
                        style={{ backgroundColor: color }}
                        className={`w-9 h-9 rounded-2xl transition-transform flex items-center justify-center text-white ${
                          avatarColor === color ? 'scale-110 ring-2 ring-offset-2 ring-amber-500 dark:ring-offset-slate-900 shadow-md' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {avatarColor === color && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-500/30 text-[11px] text-amber-800 dark:text-gold-300 leading-relaxed">
                  💡 ترازینو اطلاعات هر حساب را در پوشه امن گوشی ذخیره می‌کند تا در صورت نیاز بتوانید چند پروفایل مستقل با سبدهای جداگانه بسازید.
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: Strategy & Crypto Customization (NEW) */}
          {step === 3 && (
            <div className="space-y-4 animate-slideInFromLeft">
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  استراتژی سبد و انتخاب دارایی‌ها
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تنظیم نحوه توزیع دارایی‌ها و انتخاب رمزارزهای مورد نظر
                </p>
              </div>

              {/* Mode Switcher: Default vs Custom */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setStrategyMode('default');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                    strategyMode === 'default'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-gold-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  پروفایل استاندارد (۸۰/۲۰)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setStrategyMode('custom');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                    strategyMode === 'custom'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  شخصی‌سازی دقیق سبد
                </button>
              </div>

              {strategyMode === 'default' ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-amber-200/80 dark:border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">سهم طلا و مسکوکات:</span>
                    <span className="font-black text-amber-600 dark:text-gold-400">۸۰٪ پورتفولیو</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">سهم رمزارزها:</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">۲۰٪ پورتفولیو</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">پس‌انداز اضطراری:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">۳۰٪ از درآمد</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    ارزهای فعال: بیت‌کوین (BTC)، اتریوم (ETH)، سولانا (SOL) و تن‌کوین (TON).
                  </div>
                </div>
              ) : (
                /* Custom Sliders & Crypto Selection */
                <div className="space-y-4">
                  {/* Gold vs Crypto Slider */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-amber-600 dark:text-gold-400">طلا: {toPersianDigits(goldRatio)}%</span>
                      <span className="text-indigo-600 dark:text-indigo-400">کریپتو: {toPersianDigits(100 - goldRatio)}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="5"
                      value={goldRatio}
                      onChange={(e) => setGoldRatio(Number(e.target.value))}
                      className="custom-range-slider"
                    />
                  </div>

                  {/* Savings Percent */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>نرخ پس‌انداز از ورودی:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">{toPersianDigits(savingsPercent)}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="70"
                      step="5"
                      value={savingsPercent}
                      onChange={(e) => setSavingsPercent(Number(e.target.value))}
                      className="custom-range-slider"
                    />
                  </div>

                  {/* Cryptos Grid */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      رمزارزهای مورد نظر شما:
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {AVAILABLE_CRYPTOS.map((coin) => {
                        const isSelected = selectedCryptoSymbols.includes(coin.symbol);
                        return (
                          <div
                            key={coin.symbol}
                            onClick={() => toggleCrypto(coin.symbol)}
                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500/60 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: coin.color }}
                              />
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                                {coin.symbol}
                              </span>
                            </div>

                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-700'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SLIDE 4: Optional Property & Vehicle Setup */}
          {step === 4 && (
            <div className="space-y-4 animate-slideInFromLeft">
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  ثبت اولیه املاک و خودروها (اختیاری)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  می‌توانید همین حالا اولین ملک یا خودروی خود را ثبت کنید یا این مرحله را رد نمایید.
                </p>
              </div>

              <div className="space-y-3">
                {/* Property Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <Building2 className="w-4 h-4" />
                    <span>ثبت ملک (اختیاری)</span>
                  </div>
                  <input
                    type="text"
                    value={propertyTitle}
                    onChange={(e) => setPropertyTitle(e.target.value)}
                    placeholder="عنوان ملک (مثال: آپارتمان سعادت‌آباد)"
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs outline-none"
                  />
                  <input
                    type="text"
                    value={propertyPriceToman}
                    onChange={(e) => setPropertyPriceToman(e.target.value)}
                    placeholder="ارزش حدودی ملک به تومان (مثال: ۱۰,۰۰۰,۰۰۰,۰۰۰)"
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs dir-ltr font-bold outline-none"
                  />
                </div>

                {/* Vehicle Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <Car className="w-4 h-4" />
                    <span>ثبت خودرو یا موتور (اختیاری)</span>
                  </div>
                  <input
                    type="text"
                    value={vehicleTitle}
                    onChange={(e) => setVehicleTitle(e.target.value)}
                    placeholder="مدل خودرو یا موتور (مثال: پژو ۲۰۷ دنده‌ای)"
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs outline-none"
                  />
                  <input
                    type="text"
                    value={vehiclePriceToman}
                    onChange={(e) => setVehiclePriceToman(e.target.value)}
                    placeholder="ارزش حدودی وسیله نقلیه به تومان (مثال: ۸۰۰,۰۰۰,۰۰۰)"
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs dir-ltr font-bold outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 5: Optional Nobitex Sync Setup */}
          {step === 5 && (
            <div className="space-y-4 animate-slideInFromLeft">
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  اتصال صرافی نوبیتکس (اختیاری)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  همگام‌سازی لحظه‌ای موجودی و دارایی‌های رمزارز با کلید امن
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    کلید عمومی (API Key)
                  </label>
                  <input
                    type="text"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder="API Key نوبیتکس..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs dir-ltr font-mono outline-none"
                  />
                </div>

                <div className="space-y-1.5">
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

                <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-500/30 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>کلیدهای شما صرفاً به صورت محلی در حافظه گوشی شما ذخیره می‌گردند.</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons (RTL Ergonomics: Continue on RIGHT, Previous on LEFT) */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-950/60" dir="rtl">
          
          {/* RIGHT SIDE: Primary Continue / Start Button */}
          <button
            type="button"
            onClick={handleNext}
            className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 hover:from-amber-400 hover:to-gold-400 text-slate-950 font-black text-xs transition-all shadow-gold-glow flex items-center gap-1.5 interactive-tap"
          >
            <ChevronRight className="w-4 h-4" />
            <span>{step === totalSlides - 1 ? 'ورود به ترازینو' : 'ادامه'}</span>
          </button>

          {/* LEFT SIDE: Back & Skip Buttons */}
          <div className="flex items-center gap-2">
            {isSkippableStep && (
              <button
                type="button"
                onClick={handleNext}
                className="py-2 px-3 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold transition-colors"
              >
                رد کردن این مرحله
              </button>
            )}

            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="py-2 px-3.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <span>قبلی</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
