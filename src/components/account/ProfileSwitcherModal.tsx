import React, { useState } from 'react';
import { User, Plus, Check, Shield, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import { UserProfile } from '../../types/investment';
import { triggerHaptic } from '../../utils/haptics';
import { BottomSheetModal } from '../common/BottomSheetModal';

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (name: string, color?: string) => void;
  onDeleteProfile?: (profileId: string) => void;
  onStartOnboarding?: () => void;
  isClosable?: boolean;
}

const COLORS = ['#3b82f6', '#eab308', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4'];

export const ProfileSwitcherModal: React.FC<ProfileSwitcherModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onStartOnboarding,
  isClosable = true,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  if (!isOpen) return null;

  const handleSelect = (id: string) => {
    triggerHaptic('medium');
    onSelectProfile(id);
    onClose();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    triggerHaptic('success');
    onCreateProfile(newProfileName.trim(), selectedColor);
    setNewProfileName('');
    setIsCreating(false);
    onClose();
  };

  const footer = (
    <div className="flex items-center gap-2">
      {isCreating ? (
        <>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            بازگشت
          </button>
          <button
            type="button"
            onClick={handleCreateSubmit}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-gold-500 text-slate-950 font-black text-xs shadow-gold-glow flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>ایجاد حساب جدید</span>
          </button>
        </>
      ) : (
        <>
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
            onClick={() => {
              triggerHaptic('light');
              setIsCreating(true);
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-gold-300 font-black text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن حساب کاربری دیگر</span>
          </button>
        </>
      )}
    </div>
  );

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={isClosable ? onClose : () => {}}
      title={isCreating ? 'افزودن حساب کاربری جدید' : 'انتخاب حساب کاربری'}
      subtitle={
        isCreating
          ? 'تعریف پروفایل مستقل با سبد دارایی و کلیدهای اختصاصی'
          : 'حساب‌های محلی ذخیره‌شده روی حافظه گوشی شما'
      }
      icon={<User className="w-5 h-5 text-amber-500" />}
      footer={footer}
      maxWidth="max-w-md"
    >
      <div className="space-y-3">
        {isCreating ? (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                نام یا عنوان حساب
              </label>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="مثال: حساب همسر، پس‌انداز، شرکت..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 font-bold text-sm outline-none text-right"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                رنگ نمایه
              </label>
              <div className="flex items-center justify-center gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      selectedColor === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {onStartOnboarding && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onClose();
                  onStartOnboarding();
                }}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 hover:from-amber-400 hover:to-gold-400 text-slate-950 font-black text-xs shadow-gold-glow flex items-center justify-between gap-2 interactive-tap"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>ساخت حساب جدید با مراحل کامل (آنبوردینگ)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-black/10 text-slate-950 font-black">
                  تست سن و سبدها
                </span>
              </button>
            )}

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
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-400 rotate-180" />
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>
    </BottomSheetModal>
  );
};
