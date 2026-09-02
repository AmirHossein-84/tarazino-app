import React, { useState } from 'react';
import {
  User,
  Shield,
  HardDrive,
  Key,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { UserProfile, CryptoAsset } from '../../types/investment';
import { triggerHaptic } from '../../utils/haptics';
import { ProfileSwitcherModal } from '../account/ProfileSwitcherModal';
import { NobitexSyncModal } from '../crypto/NobitexSyncModal';

interface AccountSettingsViewProps {
  activeProfile: UserProfile | null;
  profiles: UserProfile[];
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (name: string, color?: string) => void;
  onDeleteProfile: (profileId: string) => void;
  cryptoAssets: CryptoAsset[];
  onAssetsUpdated: (assets: CryptoAsset[]) => void;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const AccountSettingsView: React.FC<AccountSettingsViewProps> = ({
  activeProfile,
  profiles,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  cryptoAssets,
  onAssetsUpdated,
  onNotify,
}) => {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isNobitexModalOpen, setIsNobitexModalOpen] = useState(false);

  const hasNobitex = Boolean(activeProfile?.nobitexConfig?.publicKey);

  return (
    <div className="space-y-4">
      {/* 1. Active Profile Card */}
      <div className="glass-card p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md"
              style={{ backgroundColor: activeProfile?.avatarColor || '#3b82f6' }}
            >
              {activeProfile?.name?.charAt(0) || 'ح'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {activeProfile?.name || 'حساب اصلی'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                  آفلاین و محلی
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {profiles.length > 1
                  ? `${profiles.length} حساب کاربری روی این دستگاه ثبت شده است`
                  : 'حساب فعال روی گوشی شما'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsSwitcherOpen(true);
            }}
            className="py-2.5 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-gold-300 text-xs font-bold flex items-center gap-1.5 transition-all interactive-tap touch-target shrink-0"
          >
            <Users className="w-4 h-4" />
            <span>مدیریت حساب‌ها</span>
          </button>
        </div>

        {/* Profile Stats Mini Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-center space-y-0.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">خودرو و موتور</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
              {activeProfile?.vehicles?.length || 0} مورد
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-center space-y-0.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">املاک و مستغلات</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
              {activeProfile?.properties?.length || 0} مورد
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-center space-y-0.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">رمزارزها</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
              {activeProfile?.cryptoAssets?.length || 0} ارز
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-center space-y-0.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">اتصال نوبیتکس</span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block">
              {hasNobitex ? 'متصل ✓' : 'غیرفعال'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Device Storage Persistence Info Card */}
      <div className="glass-card p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black">پایداری اطلاعات در صورت حذف و نصب مجدد</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              بقا در پوشه اسناد گوشی (Documents/InvestmentApp)
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
          تمامی داده‌های شما، کلیدهای API نوبیتکس، خودروها و سبد سرمایه‌گذاری به صورت خودکار در حافظه پایدار دستگاه همگام‌سازی می‌شوند تا در صورت به‌روزرسانی یا حتی حذف و نصب مجدد برنامه، حساب‌های شما فوراً بازیابی گردند.
        </p>
      </div>

      {/* 3. Nobitex API Key Configuration Card */}
      <div className="glass-card p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
              اتصال کلید API و Secret نوبیتکس
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {hasNobitex
                ? 'کلیدهای نوبیتکس برای این حساب ثبت و ذخیره شده‌اند'
                : 'جهت دریافت موجودی ریالی و کریپتو کلیدهای خود را وارد کنید'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsNobitexModalOpen(true);
          }}
          className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all interactive-tap touch-target shrink-0"
        >
          {hasNobitex ? 'ویرایش کلیدها' : 'اتصال نوبیتکس'}
        </button>
      </div>

      {/* Modals */}
      <ProfileSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        profiles={profiles}
        activeProfileId={activeProfile?.id || ''}
        onSelectProfile={onSelectProfile}
        onCreateProfile={onCreateProfile}
        onDeleteProfile={onDeleteProfile}
      />

      <NobitexSyncModal
        isOpen={isNobitexModalOpen}
        onClose={() => setIsNobitexModalOpen(false)}
        cryptoAssets={cryptoAssets}
        onAssetsUpdated={onAssetsUpdated}
        onNotify={onNotify}
      />
    </div>
  );
};
