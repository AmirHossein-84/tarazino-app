import React, { useState, useEffect } from 'react';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
  Lock,
  ClipboardPaste,
} from 'lucide-react';
import { CryptoAsset } from '../../types/investment';
import { useNobitex } from '../../hooks/useNobitex';
import { NobitexAuthType, NobitexConfig } from '../../services/nobitex/types';
import { formatToman, toPersianDigits, getPersianFormattedDate } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { BottomSheetModal } from '../common/BottomSheetModal';

interface NobitexSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  cryptoAssets: CryptoAsset[];
  onAssetsUpdated: (assets: CryptoAsset[]) => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

export const NobitexSyncModal: React.FC<NobitexSyncModalProps> = ({
  isOpen,
  onClose,
  cryptoAssets,
  onAssetsUpdated,
  onNotify,
}) => {
  const {
    config,
    isConfigured,
    isSyncing,
    lastSyncedAt,
    profile,
    error,
    tomanCashBalance,
    syncedCoinsCount,
    saveConfig,
    removeConfig,
    syncWithNobitex,
  } = useNobitex();

  const [authType, setAuthType] = useState<NobitexAuthType>(config.authType || 'api_key');
  const [publicKey, setPublicKey] = useState(config.publicKey || '');
  const [secretKey, setSecretKey] = useState(config.secretKey || '');
  const [token, setToken] = useState(config.token || '');
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthType(config.authType || 'api_key');
      setPublicKey(config.publicKey || '');
      setSecretKey(config.secretKey || '');
      setToken(config.token || '');
    }
  }, [isOpen, config]);

  const handleSaveAndSync = async () => {
    triggerHaptic('medium');
    const newConfig: NobitexConfig = {
      authType,
      publicKey: publicKey.trim(),
      secretKey: secretKey.trim(),
      token: token.trim(),
      autoSyncEnabled: true,
    };
    saveConfig(newConfig);

    const prevSymbols = new Set(cryptoAssets.map((a) => a.symbol.toLowerCase()));
    const handleAssetsUpdated = (updated: CryptoAsset[]) => {
      onAssetsUpdated(updated);
      const newHoldings = updated.filter(
        (a) => a.isHoldingOnly && !prevSymbols.has(a.symbol.toLowerCase())
      );
      if (newHoldings.length > 0) {
        onNotify?.(
          `${toPersianDigits(newHoldings.length)} ارز جدید فقط به دارایی‌ها اضافه شد (بدون وزن خرید)`,
          'info'
        );
      }
    };

    // Pass overrideConfig directly to avoid asynchronous state lag
    const success = await syncWithNobitex(cryptoAssets, handleAssetsUpdated, newConfig /* overrideConfig */);
    if (success) {
      onNotify?.('همگام‌سازی دارایی‌های نوبیتکس با موفقیت انجام شد', 'success');
      onClose();
    }
  };

  const handlePaste = async (setter: (v: string) => void) => {
    triggerHaptic('light');
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setter(text.trim());
      } else {
        onNotify?.('کلیپ‌بورد خالی است', 'info');
      }
    } catch {
      onNotify?.('دسترسی به کلیپ‌بورد ممکن نیست؛ دستی جایگذاری کنید', 'error');
    }
  };

  const handleDisconnect = () => {
    triggerHaptic('medium');
    removeConfig();
    setPublicKey('');
    setSecretKey('');
    setToken('');
    onNotify?.('اتصال حساب نوبیتکس قطع شد', 'info');
    onClose();
  };

  const isValid =
    authType === 'api_key'
      ? publicKey.trim().length > 10 && secretKey.trim().length > 10
      : token.trim().length > 10;

  const footerActions = (
    <div className="flex items-center gap-2.5">
      {isConfigured && (
        <button
          type="button"
          onClick={handleDisconnect}
          className="flex-1 px-3.5 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-tap touch-target"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>قطع اتصال</span>
        </button>
      )}

      <button
        type="button"
        onClick={handleSaveAndSync}
        disabled={isSyncing || !isValid}
        className="flex-1 px-3.5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2 transition-all interactive-tap shadow-crypto-glow touch-target"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{isSyncing ? 'در حال همگام‌سازی...' : 'ذخیره و همگام‌سازی'}</span>
      </button>
    </div>
  );

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="اتصال و همگام‌سازی حساب صرافی نوبیتکس"
      subtitle="دریافت خودکار موجودی ارزهای دیجیتال و مانده ریالی"
      icon={<Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
      footer={footerActions}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        
        {/* Status Card if already connected */}
        {isConfigured && (
          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  {profile?.firstName && profile?.lastName
                    ? `حساب: ${profile.firstName} ${profile.lastName}`
                    : 'حساب نوبیتکس متصل است'}
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                فعال
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
              <div>
                <span className="text-slate-500 dark:text-slate-400">تعداد رمزارزهای دارای موجودی:</span>{' '}
                <strong className="text-slate-900 dark:text-slate-100">{toPersianDigits(syncedCoinsCount)}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">موجودی نقد ریالی:</span>{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">{formatToman(tomanCashBalance)} ت</strong>
              </div>
            </div>

            {lastSyncedAt && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                آخرین همگام‌سازی: {getPersianFormattedDate(new Date(lastSyncedAt))}
              </p>
            )}
          </div>
        )}

        {/* Security Alert Badge */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-slate-900 dark:text-slate-100 block">امنیت و حریم خصوصی کلیدها</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              کلیدها فقط روی همین دستگاه می‌مانند و به هیچ سرور واسطی ارسال نمی‌شوند.
            </p>
          </div>
        </div>

        {/* Auth Type Switcher Tabs */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setAuthType('api_key');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              authType === 'api_key'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span>کلید API</span>
              <span className={`text-[9px] px-1.5 py-px rounded-full font-black ${
                authType === 'api_key'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              }`}>
                توصیه‌شده
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setAuthType('token');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              authType === 'token'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            توکن ورود مستقیم
          </button>
        </div>

        {/* Form Inputs: Mode 1 (API Key Pair) */}
        {authType === 'api_key' ? (
          <div className="space-y-3">
            {/* Public Key */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                کلید عمومی (Public Key)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="مثال: 5XOCQZSPLQM4MiLzuUnZoBuqgYgTKl40..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white dir-ltr font-mono text-xs pl-11"
                />
                <button
                  type="button"
                  onClick={() => handlePaste(setPublicKey)}
                  title="جایگذاری از کلیپ‌بورد"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 p-1 transition-colors"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Secret Key */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                کلید خصوصی (Private Key)
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="کلید خصوصی محرمانه نوبیتکس..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white dir-ltr font-mono text-xs pr-11 pl-11"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handlePaste(setSecretKey)}
                  title="جایگذاری از کلیپ‌بورد"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 p-1 transition-colors"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-300 block">راهنمای دریافت کلید نوبیتکس:</span>
              <p>
                ۱. در سایت نوبیتکس از منوی <strong>امکانات &gt; مستندات API</strong> روی <strong>ایجاد کلید API</strong> بزنید.
              </p>
              <p>
                ۲. روی <strong>کلید جدید +</strong> زده و با انتخاب نام دلخواه و مدت اعتبار <strong>دائمی</strong> دکمه <strong>ایجاد کلید</strong> را بزنید.
              </p>
              <a
                href="https://nobitex.ir/panel/profile/api-services/"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold inline-flex items-center gap-1 mt-1"
              >
                <span>ورود به صفحه کلیدهای API نوبیتکس</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          /* Form Inputs: Mode 2 (Token Auth) */
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                توکن احراز هویت (Authorization Token)
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="توکن احراز هویت ورود مستقیم..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white dir-ltr font-mono text-xs pr-11 pl-11"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handlePaste(setToken)}
                  title="جایگذاری از کلیپ‌بورد"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 p-1 transition-colors"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-[11px]">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

      </div>
    </BottomSheetModal>
  );
};
