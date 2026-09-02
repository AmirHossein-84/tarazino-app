import React, { useState } from 'react';
import { Coins, TrendingUp } from 'lucide-react';
import { MarketInstrumentsView } from './MarketInstrumentsView';
import { CryptoMarketView } from '../crypto/CryptoMarketView';
import { PhysicalGoldItem, CryptoAsset } from '../../types/investment';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';
import { triggerHaptic } from '../../utils/haptics';

interface MarketsHubViewProps {
  physicalGoldItems: PhysicalGoldItem[];
  totalPhysicalGoldValueTomans: number;
  cryptoAssets: CryptoAsset[];
  currencyMode?: CurrencyDisplayMode;
  formatCurrency: (amountTomans: number) => string;
  toDisplayValue: (amountTomans: number) => number;
  onAssetsUpdated: (assets: CryptoAsset[]) => void;
  onNavigateToHoldings: () => void;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const MarketsHubView: React.FC<MarketsHubViewProps> = ({
  physicalGoldItems,
  totalPhysicalGoldValueTomans,
  cryptoAssets,
  currencyMode,
  formatCurrency,
  toDisplayValue,
  onAssetsUpdated,
  onNavigateToHoldings,
  onNotify,
}) => {
  const [activeMarket, setActiveMarket] = useState<'bourse_gold' | 'crypto'>('bourse_gold');

  const handleSelectMarket = (market: 'bourse_gold' | 'crypto') => {
    triggerHaptic('light');
    setActiveMarket(market);
  };

  return (
    <div className="space-y-4">
      {/* Top Segmented Market Selector */}
      <div className="max-w-md mx-auto p-1.5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 shadow-sm flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleSelectMarket('bourse_gold')}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all interactive-tap touch-target ${
            activeMarket === 'bourse_gold'
              ? 'bg-gradient-to-r from-amber-500 to-gold-500 text-slate-950 shadow-gold-glow'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>بورس و طلا</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMarket('crypto')}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all interactive-tap touch-target ${
            activeMarket === 'crypto'
              ? 'bg-indigo-600 text-white shadow-crypto-glow'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>ارز دیجیتال (نوبیتکس)</span>
        </button>
      </div>

      {/* Market Content */}
      <div className="animate-fadeIn">
        {activeMarket === 'bourse_gold' ? (
          <MarketInstrumentsView
            physicalGoldItems={physicalGoldItems}
            totalPhysicalGoldValueTomans={totalPhysicalGoldValueTomans}
            currencyMode={currencyMode}
            formatCurrency={formatCurrency}
            toDisplayValue={toDisplayValue}
            onNavigateToHoldings={onNavigateToHoldings}
          />
        ) : (
          <CryptoMarketView
            cryptoAssets={cryptoAssets}
            currencyMode={currencyMode}
            formatCurrency={formatCurrency}
            toDisplayValue={toDisplayValue}
            onAssetsUpdated={onAssetsUpdated}
            onNotify={onNotify}
          />
        )}
      </div>
    </div>
  );
};
