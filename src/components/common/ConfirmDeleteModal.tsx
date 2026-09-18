import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { BottomSheetModal } from './BottomSheetModal';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  itemName?: string;
  confirmLabel?: string;
  zIndex?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  confirmLabel = 'حذف',
  zIndex = 'z-[60]',
}) => {
  if (!isOpen) return null;

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
          onConfirm();
        }}
        className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all interactive-tap touch-target"
      >
        <Trash2 className="w-4 h-4" />
        <span>{confirmLabel}</span>
      </button>
    </div>
  );

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="این عمل غیرقابل بازگشت است"
      icon={<Trash2 className="w-5 h-5 text-rose-500" />}
      footer={footer}
      maxWidth="max-w-md"
      zIndex={zIndex}
    >
      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-black text-rose-900 dark:text-rose-200">
            {itemName ? `«${itemName}» حذف شود؟` : title}
          </p>
          {description && (
            <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    </BottomSheetModal>
  );
};
