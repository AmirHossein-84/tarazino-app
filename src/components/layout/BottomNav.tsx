import React from 'react';
import { LayoutDashboard, Coins, TrendingUp, Building2, Wallet, Sliders, ArrowDownCircle } from 'lucide-react';
import { ActiveTab } from '../../types/investment';
import { triggerHaptic } from '../../utils/haptics';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'gold', label: 'بورس و طلا', icon: Coins },
    { id: 'crypto', label: 'ارز دیجیتال', icon: TrendingUp },
    { id: 'properties', label: 'املاک', icon: Building2 },
    { id: 'holdings', label: 'دارایی‌ها', icon: Wallet },
    { id: 'sell', label: 'فروش', icon: ArrowDownCircle },
    { id: 'settings', label: 'تنظیمات', icon: Sliders },
  ];

  const handleTabClick = (id: ActiveTab) => {
    triggerHaptic('light');
    setActiveTab(id);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
      <nav className="max-w-lg mx-auto bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl border border-slate-200/90 dark:border-slate-800/90 rounded-3xl shadow-xl dark:shadow-2xl p-1.5 flex items-center justify-around pointer-events-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'gold' && (activeTab as string) === 'market') ||
            (tab.id === 'dashboard' && (activeTab as string) === 'calculator');

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex-1 py-2 px-0.5 sm:px-1 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all interactive-tap touch-target ${
                isActive
                  ? 'bg-gradient-to-b from-amber-500/15 to-gold-500/5 dark:from-amber-500/25 dark:to-gold-500/10 text-amber-700 dark:text-gold-300 font-bold border border-gold-400/40 dark:border-gold-500/40 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-900/40'
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110 text-amber-600 dark:text-gold-400' : ''}`} />
              <span className="text-[9px] xs:text-[10px] sm:text-[11px] font-medium tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
