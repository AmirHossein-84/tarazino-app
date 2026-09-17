import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../../types/investment';
import { triggerHaptic } from '../../utils/haptics';
import { toPersianDigits } from '../../utils/formatters';
import { BottomSheetModal } from '../common/BottomSheetModal';

interface DeleteProfileConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  isActiveProfile: boolean;
  nextProfileName?: string;
  onConfirm: (profileId: string) => void;
}

export const DeleteProfileConfirmModal: React.FC<DeleteProfileConfirmModalProps> = ({
  isOpen,
  onClose,
  profile,
  isActiveProfile,
  nextProfileName,
  onConfirm,
}) => {
  if (!isOpen || !profile) return null;

  const cryptoCount = profile.cryptoAssets?.length || 0;
  const itemsCount =
    (profile.properties?.length || 0) + (profile.vehicles?.length || 0);

  const footer = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          onClose();
        }}
        className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all interactive-tap touch-target"
      >
        انصراف
      </button>
      <button
        type="button"
        onClick={() => {
          triggerHaptic('heavy');
          onConfirm(profile.id);
        }}
        className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all interactive-tap touch-target"
      >
        <Trash2 className="w-4 h-4" />
        <span>حذف حساب</span>
      </button>
    </div>
  );

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="حذف حساب کاربری"
      subtitle="این عمل غیرقابل بازگشت است"
      icon={<Trash2 className="w-5 h-5 text-rose-500" />}
      footer={footer}
      maxWidth="max-w-md"
      zIndex="z-[60]"
    >
      <div className="space-y-3">
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-black text-rose-900 dark:text-rose-200">
              حساب «{profile.name}» حذف شود؟
            </p>
            <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
              سبد دارایی، تنظیمات و سوابق این حساب به‌طور کامل از حافظه دستگاه حذف
              می‌شود و امکان بازیابی وجود ندارد.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0"
            style={{ backgroundColor: profile.avatarColor || '#3b82f6' }}
          >
            {profile.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
              {profile.name}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {toPersianDigits(cryptoCount)} رمزارز • {toPersianDigits(itemsCount)} ملک و خودرو
              {profile.nobitexConfig?.publicKey ? ' • متصل به نوبیتکس' : ''}
            </div>
          </div>
        </div>

        {isActiveProfile && nextProfileName && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed px-1">
            این حساب فعال است. پس از حذف، حساب «{nextProfileName}» فعال می‌شود.
          </p>
        )}
      </div>
    </BottomSheetModal>
  );
};
