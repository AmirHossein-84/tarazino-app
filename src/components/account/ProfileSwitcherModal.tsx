import React, { useState } from 'react';
import { User, Plus, Check, Trash2, ArrowRight } from 'lucide-react';
import { UserProfile } from '../../types/investment';
import { triggerHaptic } from '../../utils/haptics';
import { BottomSheetModal } from '../common/BottomSheetModal';
import { DeleteProfileConfirmModal } from './DeleteProfileConfirmModal';

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  // نگه‌داشته‌شده برای سازگاری با کال‌کننده‌های قبلی؛ مسیر سریع ساخت حساب حذف شده و استفاده نمی‌شود
  onCreateProfile: (name: string, color?: string) => void;
  onDeleteProfile?: (profileId: string) => boolean | void;
  onStartOnboarding?: () => void;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  isClosable?: boolean;
}

export const ProfileSwitcherModal: React.FC<ProfileSwitcherModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onDeleteProfile,
  onStartOnboarding,
  onNotify,
  isClosable = true,
}) => {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Hooks must run before any early return
  const pendingProfile = pendingDeleteId
    ? profiles.find((p) => p.id === pendingDeleteId) || null
    : null;
  const canDelete = profiles.length > 1 && Boolean(onDeleteProfile);
  const nextProfileName = pendingProfile
    ? profiles.find((p) => p.id !== pendingProfile.id)?.name
    : undefined;

  const handleConfirmDelete = (profileId: string) => {
    if (!onDeleteProfile) {
      setPendingDeleteId(null);
      return;
    }
    const result = onDeleteProfile(profileId);
    if (result === false) {
      triggerHaptic('medium');
      onNotify?.('امکان حذف تنها حساب کاربری فعال وجود ندارد.', 'error');
      setPendingDeleteId(null);
      return;
    }
    triggerHaptic('success');
    onNotify?.('حساب کاربری با موفقیت حذف شد', 'info');
    setPendingDeleteId(null);
  };

  if (!isOpen) return null;

  const handleSelect = (id: string) => {
    triggerHaptic('medium');
    onSelectProfile(id);
    onClose();
  };

  const handleStartOnboarding = () => {
    if (!onStartOnboarding) return;
    triggerHaptic('medium');
    onClose();
    onStartOnboarding();
  };

  const footer = (
    <div className="flex items-center gap-2">
      {isClosable && (
        <button
          type="button"
          onClick={onClose}
          className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
        >
          بستن
        </button>
      )}
      <button
        type="button"
        onClick={handleStartOnboarding}
        disabled={!onStartOnboarding}
        className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 hover:from-amber-400 hover:to-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs shadow-gold-glow flex items-center justify-center gap-1.5 interactive-tap"
      >
        <Plus className="w-4 h-4" />
        <span>افزودن حساب کاربری دیگر</span>
      </button>
    </div>
  );

  return (
    <>
      <BottomSheetModal
        isOpen={isOpen}
        onClose={isClosable ? onClose : () => {}}
        title="انتخاب حساب کاربری"
        subtitle="حساب‌های محلی ذخیره‌شده روی حافظه گوشی شما"
        icon={<User className="w-5 h-5 text-amber-500" />}
        footer={footer}
        maxWidth="max-w-md"
      >
      <div className="space-y-3">
            <div className="space-y-2">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId;

              return (
                <div
                  key={profile.id}
                  onClick={() => handleSelect(profile.id)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer interactive-tap ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-sm dark:bg-amber-500/20'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm"
                      style={{ backgroundColor: profile.avatarColor || '#3b82f6' }}
                    >
                      {profile.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                          {profile.name}
                        </h4>
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black">
                            فعال
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {profile.nobitexConfig?.publicKey ? 'متصل به نوبیتکس • ' : ''}
                        {profile.vehicles?.length ? `${profile.vehicles.length} وسیله نقلیه` : 'اطلاعات محلی'}
                      </p>
                    </div>
                  </div>

                  {isActive ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('medium');
                            setPendingDeleteId(profile.id);
                          }}
                          className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center transition-all interactive-tap touch-target"
                          title="حذف این حساب"
                          aria-label={`حذف حساب ${profile.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('medium');
                            setPendingDeleteId(profile.id);
                          }}
                          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30 flex items-center justify-center transition-all interactive-tap touch-target"
                          title="حذف این حساب"
                          aria-label={`حذف حساب ${profile.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-400 rotate-180" />
                    </div>
                  )}
                </div>
              );
            })}
            </div>
      </div>
      </BottomSheetModal>

      <DeleteProfileConfirmModal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        profile={pendingProfile}
        isActiveProfile={pendingProfile?.id === activeProfileId}
        nextProfileName={nextProfileName}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};
