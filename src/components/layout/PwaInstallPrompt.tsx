import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare, CheckCircle2 } from 'lucide-react';

interface PwaInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Check if standalone (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Capture Chrome/Android install event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 shadow-2xl text-right overflow-hidden">
        
        {/* Decorative Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-gold-400 to-yellow-300" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 mt-1">
          <img
            src="/favicon.png"
            alt="لوگوی برنامه"
            className="w-12 h-12 rounded-2xl object-cover"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              نصب برنامه روی گوشی (PWA)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">بدون نیاز به دانلود از گوگل‌پلی یا اپ‌استور</p>
          </div>
        </div>

        {/* Features list */}
        <div className="space-y-2.5 mb-6 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>اجرای تمام‌صفحه و سریع مانند اپلیکیشن بومی</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>کارکرد آفلاین و بدون نیاز به اینترنت</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>حفظ دائمی اطلاعات دارایی‌ها روی حافظه دستگاه</span>
          </div>
        </div>

        {/* Instructions based on OS */}
        {isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-sm text-center font-medium">
            برنامه قبلاً با موفقیت روی دستگاه شما نصب شده است!
          </div>
        ) : isIOS ? (
          /* iOS Safari instructions */
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 space-y-3 text-xs">
            <div className="font-bold text-amber-700 dark:text-gold-400 flex items-center gap-1.5">
              <span>راهنمای آیفون (Safari):</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-800 dark:text-gold-400 flex items-center justify-center font-bold text-[10px]">۱</span>
              <span>دکمه اشتراک‌گذاری (<Share2 className="w-3.5 h-3.5 inline text-blue-500 dark:text-blue-400 mx-0.5" /> Share) در پایین مرورگر سافاری را لمس کنید.</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-800 dark:text-gold-400 flex items-center justify-center font-bold text-[10px]">۲</span>
              <span>گزینه <PlusSquare className="w-3.5 h-3.5 inline text-emerald-600 dark:text-emerald-400 mx-0.5" /> <strong>Add to Home Screen</strong> (افزودن به صفحه اصلی) را انتخاب کنید.</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-800 dark:text-gold-400 flex items-center justify-center font-bold text-[10px]">۳</span>
              <span>در بالا سمت راست، روی <strong>Add</strong> بزنید.</span>
            </div>
          </div>
        ) : (
          /* Android / Chrome instructions */
          <div className="space-y-3">
            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 px-4 rounded-xl gold-gradient-bg shadow-gold-glow flex items-center justify-center gap-2 font-bold cursor-pointer hover:opacity-95 transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                <span>نصب مستقیم اپلیکیشن</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-bold text-amber-700 dark:text-gold-400">راهنمای اندروید (Chrome):</p>
                <p>روی منوی ۳ نقطه در بالای مرورگر کروم بزنید و گزینه <strong>«افزودن به صفحه اصلی» (Install app / Add to Home screen)</strong> را انتخاب کنید.</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium transition-all cursor-pointer"
        >
          متوجه شدم، بستن
        </button>

      </div>
    </div>
  );
};
