import React, { useState } from 'react';
import {
  RefreshCw,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Wallet,
  Settings2,
} from 'lucide-react';
import { CryptoAsset } from '../../types/investment';
import { useNobitex } from '../../hooks/useNobitex';
import { formatToman, toPersianDigits, getPersianFormattedDate } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { NobitexSyncModal } from './NobitexSyncModal';

interface NobitexIntegrationCardProps {
  cryptoAssets: CryptoAsset[];
  onAssetsUpdated: (assets: CryptoAsset[]) => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const NobitexIntegrationCard: React.FC<NobitexIntegrationCardProps> = ({
  cryptoAssets,
  onAssetsUpdated,
  onNotify,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    isConfigured,
    isSyncing,
    lastSyncedAt,
    profile,
    error,
    tomanCashBalance,
    syncedCoinsCount,
    syncedTradesCount,
    syncWithNobitex,
  } = useNobitex();

  const handleQuickSync = async () => {
    triggerHaptic('light');
    if (!isConfigured) {
      setIsModalOpen(true);
      return;
    }

    const success = await syncWithNobitex(cryptoAssets, onAssetsUpdated);
    if (success) {
      triggerHaptic('success');
      onNotify?.('موجودی و قیمت‌های نوبیتکس با موفقیت به‌روزرسانی شدند!');
    }
  };

  return (
    <>
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-950 border border-indigo-200 dark:border-indigo-500/30 shadow-sm dark:shadow-md relative overflow-hidden space-y-3.5">
        
        {/* Tier 1: Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-200 dark:border-indigo-500/30 shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  اتصال به نوبیتکس و همگام‌سازی
                </h4>
                {isConfigured ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>متصل</span>
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium">
                    غیرفعال
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Settings Icon Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsModalOpen(true);
            }}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700/80 transition-all interactive-tap touch-target shrink-0"
            title="تنظیمات کلید API نوبیتکس"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* Tier 2: Full-width Description & Account Stats */}
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {isConfigured
              ? `همگام‌سازی زنده موجودی ${toPersianDigits(syncedCoinsCount || cryptoAssets.length)} رمزارز با نرخ لحظه‌ای صرافی نوبیتکس`
              : 'با وارد کردن کلید API، موجودی کیف‌پول‌ها و مانده ریالی به صورت خودکار دریافت و به‌روزرسانی می‌شوند.'}
          </p>

          {isConfigured && (
            <div className="p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 flex-wrap">
                {profile?.email && (
                  <span>کاربر: <strong className="text-slate-900 dark:text-slate-200 dir-ltr">{profile.email}</strong></span>
                )}
                {tomanCashBalance > 0 && (
                  <span>• مانده نقدی: <strong className="text-amber-700 dark:text-gold-400">{formatToman(tomanCashBalance)} ت</strong></span>
                )}
                <span>
                  • سوابق خرید:{' '}
                  <strong className={syncedTradesCount > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
                    {syncedTradesCount > 0
                      ? `${toPersianDigits(syncedTradesCount)} معامله شناسایی شد`
                      : 'ثبت دستی / بدون معامله'}
                  </strong>
                </span>
              </div>

              {lastSyncedAt && (
                <span className="text-[10px] text-slate-500">
                  بروزرسانی: {getPersianFormattedDate(new Date(lastSyncedAt))}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-[11px]">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Tier 3: Prominent Action Button */}
        <div>
          {isConfigured ? (
            <button
              onClick={handleQuickSync}
              disabled={isSyncing}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2 transition-all interactive-tap shadow-crypto-glow touch-target"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'در حال دریافت اطلاعات از نوبیتکس...' : 'همگام‌سازی موجودی و قیمت‌ها'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsModalOpen(true);
              }}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 transition-all interactive-tap shadow-crypto-glow touch-target"
            >
              <Key className="w-4 h-4" />
              <span>اتصال و تنظیم کلید API نوبیتکس</span>
            </button>
          )}
        </div>

      </div>

      {/* Configuration Modal */}
      <NobitexSyncModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cryptoAssets={cryptoAssets}
        onAssetsUpdated={onAssetsUpdated}
        onNotify={onNotify}
      />
    </>
  );
};
