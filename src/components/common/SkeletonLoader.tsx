import React from 'react';

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-1.5">
                <div className="w-20 h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="w-12 h-2.5 bg-slate-200/70 dark:bg-slate-800/60 rounded-md" />
              </div>
            </div>
            <div className="w-14 h-5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/50 space-y-1.5">
            <div className="w-16 h-2.5 bg-slate-200/70 dark:bg-slate-800/60 rounded-md" />
            <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DonutSkeleton: React.FC<{ size?: number }> = ({ size = 200 }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 animate-pulse">
      <div
        style={{ width: size, height: size }}
        className="rounded-full border-8 border-slate-200 dark:border-slate-800 flex items-center justify-center"
      >
        <div className="space-y-1.5 text-center">
          <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
          <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
        </div>
      </div>
    </div>
  );
};
