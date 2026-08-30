import React, { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { BottomSheetModal } from '../common/BottomSheetModal';

interface BackupRestoreProps {
  onExport: () => void;
  onImport: (json: string) => void;
  onResetToDefaults: () => void;
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({
  onExport,
  onImport,
  onResetToDefaults,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImport(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="glass-card p-5 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-transparent">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            پشتیبان‌گیری و ذخیره‌سازی داده‌ها
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            اطلاعات شما در حافظه محلی گوشی ذخیره می‌شود. می‌توانید از اطلاعات خود فایل خروجی بگیرید.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Export Backup Button */}
        <button
          onClick={onExport}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center gap-3 text-right transition-all cursor-pointer group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform border border-emerald-200 dark:border-transparent">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              دانلود فایل پشتیبان (Backup)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              ذخیره تمامی دارایی‌ها و تنظیمات در قالب فایل JSON
            </div>
          </div>
        </button>

        {/* Import Backup Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center gap-3 text-right transition-all cursor-pointer group shadow-xs"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform border border-indigo-200 dark:border-transparent">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              بازیابی از فایل پشتیبان (Restore)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              بارگذاری فایل بکاپ و جایگزینی داده‌ها
            </div>
          </div>
        </button>
      </div>

      {/* Reset to Factory Defaults */}
      <div className="pt-2">
        <button
          onClick={() => setShowResetModal(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 text-xs font-bold flex flex-wrap items-center justify-center gap-1.5 transition-all interactive-tap touch-target"
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>بازنشانی کلی به مقادیر پیش‌فرض</span>
          <span className="text-[10px] opacity-75 font-mono dir-ltr shrink-0">(Factory Reset)</span>
        </button>
      </div>

      {/* Reset Confirmation Bottom Sheet Modal */}
      <BottomSheetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="بازنشانی به مقادیر پیش‌فرض"
        subtitle="حذف کلیه داده‌های محلی و بازگشت به تنظیمات اولیه"
        icon={<AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
      >
        <div className="space-y-4 text-right">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            آیا مطمئن هستید؟ تمام داده‌های ذخیره‌شده، دارایی‌های ثبت‌شده و تاریخچه پاک شده و درصدهای پیش‌فرض تصویر اولیه بازگردانده می‌شوند. این عملیات غیرقابل بازگشت است.
          </p>

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => {
                onResetToDefaults();
                setShowResetModal(false);
              }}
              className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs interactive-tap touch-target transition-all shadow-md"
            >
              بله، بازنشانی شود
            </button>
            <button
              onClick={() => setShowResetModal(false)}
              className="py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs interactive-tap touch-target transition-all border border-slate-200 dark:border-slate-700"
            >
              انصراف
            </button>
          </div>
        </div>
      </BottomSheetModal>
      {/* About App Branding Footer */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col items-center justify-center text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-xs">
          <img
            src="/favicon.png"
            alt="لوگوی برنامه"
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>
        <div>
          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
            اپلیکیشن مدیریت سبد سرمایه‌گذاری طلا و کریپتو
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            نسخه ۱.۰.۰ • ذخیره‌سازی آفلاین و همگام‌سازی مستقیم با نوبیتکس و بورس
          </p>
        </div>
      </div>
    </div>
  );
};
