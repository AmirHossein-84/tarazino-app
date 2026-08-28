import React, { useState, useCallback } from 'react';
import { useInvestmentState } from './hooks/useInvestmentState';
import { MarketDataProvider, useMarketData } from './hooks/useMarketData';
import { useNobitex } from './hooks/useNobitex';
import { useTheme } from './hooks/useTheme';
import { useCurrencyDisplay } from './hooks/useCurrencyDisplay';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { CryptoMarketView } from './components/crypto/CryptoMarketView';
import { MarketInstrumentsView } from './components/market/MarketInstrumentsView';
import { HoldingsManager } from './components/holdings/HoldingsManager';
import { PropertyManagerView } from './components/properties/PropertyManagerView';
import { SellView } from './components/sell/SellView';
import { PercentagesConfig } from './components/settings/PercentagesConfig';
import { BackupRestore } from './components/settings/BackupRestore';
import { TransactionHistory } from './components/history/TransactionHistory';
import { CheckCircle, Info, AlertCircle } from 'lucide-react';
import { PhysicalGoldType } from './types/investment';

const AppContent: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [activeGoldFund, setActiveGoldFund] = useState<string>('عیار');
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  const {
    currencyMode,
    usdtRateTomans,
    toggleCurrencyMode,
    formatCurrency,
    toDisplayValue,
    refreshUsdtRate,
  } = useCurrencyDisplay();

  const {
    totalGoldMarketValueTomans,
    instruments,
    quotes,
    combinedItems,
    addUnitsToGoldInstrument,
    updateHolding,
    removeHolding,
    refreshQuotes,
  } = useMarketData();

  const {
    isConfigured: isNobitexConfigured,
    tomanCashBalance,
    syncWithNobitex,
    refreshCryptoPrices,
  } = useNobitex();

  // Handler to automatically add purchased TSETMC Gold units to user holdings
  const handleApplyGoldPurchase = useCallback(
    (goldBuyAmountTomans: number) => {
      const targetInstrument =
        instruments.find((i) => i.symbol === activeGoldFund) ||
        instruments.find((i) => i.symbol === 'عیار') ||
        instruments[0];

      const symbol = targetInstrument?.symbol || 'عیار';
      const quote = targetInstrument ? quotes[targetInstrument.id] : undefined;
      const unitPrice = quote && quote.lastPriceTomans > 0 ? quote.lastPriceTomans : 35000;
      const unitsToBuy = Math.floor(goldBuyAmountTomans / unitPrice);

      if (unitsToBuy > 0) {
        addUnitsToGoldInstrument(symbol, unitsToBuy, unitPrice);
      }
    },
    [activeGoldFund, instruments, quotes, addUnitsToGoldInstrument]
  );

  const {
    activeTab,
    setActiveTab,
    inputAmount,
    setInputAmount,
    settings,
    updateSettings,
    cryptoAssets,
    updateCryptoAssets,
    addCryptoAsset,
    editCryptoAsset,
    removeCryptoAsset,
    goldHolding,
    physicalGoldItems,
    isRefreshingGold,
    isGoldFetchError,
    totalPhysicalGoldValueTomans,
    updatePhysicalGoldQuantity,
    updatePhysicalGoldPrice,
    refreshPhysicalGoldPrices,
    properties,
    totalPropertiesValueTomans,
    netWorthPropertiesValueTomans,
    addProperty,
    editProperty,
    removeProperty,
    updatePropertyValuation,
    transactions,
    deleteTransaction,
    clearAllHistory,
    calculationResult,
    applyPurchasesToHoldings,
    resetToFactoryDefaults,
    handleExportBackup,
    handleImportBackup,
    notification,
    showNotification,
  } = useInvestmentState({
    externalGoldValueTomans: totalGoldMarketValueTomans,
    onApplyGoldPurchase: handleApplyGoldPurchase,
  });

  // Handlers to deduct sold gold units from holdings
  const handleDeductBourseGold = useCallback(
    (symbol: string, unitsToDeduct: number) => {
      const item = combinedItems.find((i) => i.instrument.symbol === symbol);
      if (item && item.holding) {
        const newQty = Math.max(0, item.holding.quantity - unitsToDeduct);
        if (newQty === 0) {
          removeHolding(item.holding.id);
        } else {
          updateHolding(item.holding.id, newQty, item.holding.averageBuyPriceTomans);
        }
      }
    },
    [combinedItems, updateHolding, removeHolding]
  );

  const handleDeductPhysicalGold = useCallback(
    (id: PhysicalGoldType, quantityToDeduct: number) => {
      const item = physicalGoldItems.find((i) => i.id === id);
      if (item) {
        const newQty = Math.max(0, Number((item.quantity - quantityToDeduct).toFixed(2)));
        updatePhysicalGoldQuantity(id, newQty);
      }
    },
    [physicalGoldItems, updatePhysicalGoldQuantity]
  );

  // Calculate live Gold ETF unit price and 24h change
  const activeGoldInst = instruments.find((i) => i.symbol === activeGoldFund);
  const activeGoldQuote = activeGoldInst ? quotes[activeGoldInst.id] : undefined;
  const goldEtfUnitPrice = activeGoldQuote?.lastPriceTomans || 35000;
  const goldEtfUnitChange = activeGoldQuote?.priceChangePercent || 0;

  // Total Gold Valuation: TSETMC Gold Funds + Physical Gold & Coins
  const totalGoldValue = totalGoldMarketValueTomans + totalPhysicalGoldValueTomans;
  const totalCryptoValue = cryptoAssets.reduce((sum, a) => sum + (a.currentHoldingValue || 0), 0);
  const totalPortfolioValue = totalGoldValue + totalCryptoValue;

  // Unified pull-to-refresh handler across TSETMC, TGJU Gold & Coins, and Nobitex
  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      await Promise.all([
        refreshQuotes(true),
        refreshPhysicalGoldPrices(),
        refreshUsdtRate(),
        isNobitexConfigured
          ? syncWithNobitex(cryptoAssets, updateCryptoAssets)
          : refreshCryptoPrices(cryptoAssets, updateCryptoAssets),
      ]);
      showNotification('اطلاعات بورس، طلا، سکه و رمزارزها به‌روزرسانی شد', 'success');
    } catch (e) {
      console.warn('Refresh all error:', e);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-dark-bg text-slate-100 selection:bg-gold-500/30 selection:text-gold-200 pb-24 transition-colors">
      
      {/* Top Header */}
      <Header
        isDark={isDark}
        toggleTheme={toggleTheme}
        currencyMode={currencyMode}
        toggleCurrencyMode={toggleCurrencyMode}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        
        {/* TAB 1: DASHBOARD (OVERVIEW, 80/20 DONUT & SMART BUY) */}
        {(activeTab === 'dashboard' || (activeTab as string) === 'calculator') && (
          <DashboardView
            totalInputAmount={inputAmount}
            setTotalInputAmount={setInputAmount}
            calculationResult={calculationResult}
            cryptoAssets={cryptoAssets}
            goldHoldingValue={totalGoldValue}
            physicalGoldValue={totalPhysicalGoldValueTomans}
            bourseGoldValue={totalGoldMarketValueTomans}
            propertiesValue={netWorthPropertiesValueTomans}
            totalCryptoValue={totalCryptoValue}
            totalPortfolioValue={totalPortfolioValue}
            tomanCashBalance={tomanCashBalance}
            activeGoldFund={activeGoldFund}
            setActiveGoldFund={setActiveGoldFund}
            goldEtfUnitPrice={goldEtfUnitPrice}
            goldEtfUnitChange={goldEtfUnitChange}
            settings={settings}
            updateSettings={updateSettings}
            isRefreshing={isRefreshingAll}
            currencyMode={currencyMode}
            usdtRateTomans={usdtRateTomans}
            toggleCurrencyMode={toggleCurrencyMode}
            formatCurrency={formatCurrency}
            toDisplayValue={toDisplayValue}
            onRefreshAll={handleRefreshAll}
            onApplyPurchases={applyPurchasesToHoldings}
            onNavigateToTab={setActiveTab}
            onNotify={showNotification}
          />
        )}

        {/* TAB 2: GOLD & STOCK MARKET (TSETMC) */}
        {(activeTab === 'gold' || (activeTab as string) === 'market') && (
          <div className="animate-fadeIn">
            <MarketInstrumentsView
              physicalGoldItems={physicalGoldItems}
              totalPhysicalGoldValueTomans={totalPhysicalGoldValueTomans}
              currencyMode={currencyMode}
              formatCurrency={formatCurrency}
              toDisplayValue={toDisplayValue}
              onNavigateToHoldings={() => setActiveTab('holdings')}
            />
          </div>
        )}

        {/* TAB 3: CRYPTO MARKET (NOBITEX) */}
        {activeTab === 'crypto' && (
          <div className="animate-fadeIn">
            <CryptoMarketView
              cryptoAssets={cryptoAssets}
              currencyMode={currencyMode}
              formatCurrency={formatCurrency}
              toDisplayValue={toDisplayValue}
              onAssetsUpdated={updateCryptoAssets}
              onNotify={showNotification}
            />
          </div>
        )}

        {/* TAB 4: REAL ESTATE & PROPERTY MANAGEMENT */}
        {activeTab === 'properties' && (
          <div className="animate-fadeIn">
            <PropertyManagerView
              properties={properties}
              currencyMode={currencyMode}
              usdtRateTomans={usdtRateTomans}
              formatCurrency={formatCurrency}
              toDisplayValue={toDisplayValue}
              onAddProperty={addProperty}
              onEditProperty={editProperty}
              onRemoveProperty={removeProperty}
              onNotify={showNotification}
            />
          </div>
        )}

        {/* TAB 5: HOLDINGS MANAGEMENT */}
        {activeTab === 'holdings' && (
          <div className="animate-fadeIn">
            <HoldingsManager
              cryptoAssets={cryptoAssets}
              updateCryptoAssets={updateCryptoAssets}
              addCryptoAsset={addCryptoAsset}
              editCryptoAsset={editCryptoAsset}
              removeCryptoAsset={removeCryptoAsset}
              physicalGoldItems={physicalGoldItems}
              totalPhysicalGoldValueTomans={totalPhysicalGoldValueTomans}
              isRefreshingGold={isRefreshingGold}
              isGoldFetchError={isGoldFetchError}
              currencyMode={currencyMode}
              formatCurrency={formatCurrency}
              toDisplayValue={toDisplayValue}
              onRefreshPhysicalGold={refreshPhysicalGoldPrices}
              onUpdatePhysicalGoldQuantity={updatePhysicalGoldQuantity}
              onUpdatePhysicalGoldPrice={updatePhysicalGoldPrice}
              onNavigateToCalculator={() => setActiveTab('dashboard')}
              onNavigateToMarket={() => setActiveTab('gold')}
              onNotify={showNotification}
            />
          </div>
        )}

        {/* TAB 5: SELL & REBALANCE */}
        {activeTab === 'sell' && (
          <div className="animate-fadeIn">
            <SellView
              cryptoAssets={cryptoAssets}
              bourseItems={combinedItems}
              physicalGoldItems={physicalGoldItems}
              totalPortfolioValue={totalPortfolioValue}
              settings={settings}
              currencyMode={currencyMode}
              usdtRateTomans={usdtRateTomans}
              formatCurrency={formatCurrency}
              toDisplayValue={toDisplayValue}
              onDeductBourseGold={handleDeductBourseGold}
              onDeductPhysicalGold={handleDeductPhysicalGold}
              onNotify={showNotification}
            />
          </div>
        )}

        {/* TAB 6: SETTINGS & HISTORY */}
        {activeTab === 'settings' && (
          <div className="space-y-5 animate-fadeIn">
            <PercentagesConfig
              settings={settings}
              updateSettings={updateSettings}
              cryptoAssets={cryptoAssets}
              updateCryptoAssets={updateCryptoAssets}
              onNotify={showNotification}
            />

            <TransactionHistory
              transactions={transactions}
              onDeleteTransaction={deleteTransaction}
              onClearAll={clearAllHistory}
            />

            <BackupRestore
              onExport={handleExportBackup}
              onImport={handleImportBackup}
              onResetToDefaults={resetToFactoryDefaults}
            />
          </div>
        )}

        {/* TAB 6: HISTORY (IF ACCESSED DIRECTLY) */}
        {activeTab === 'history' && (
          <div className="animate-fadeIn">
            <TransactionHistory
              transactions={transactions}
              onDeleteTransaction={deleteTransaction}
              onClearAll={clearAllHistory}
            />
          </div>
        )}

      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Toast Notification Snackbar */}
      {notification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce duration-300">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-2 text-xs font-bold text-slate-100 ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                : notification.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-300'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-indigo-400" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <MarketDataProvider>
      <AppContent />
    </MarketDataProvider>
  );
};

export default App;
