import React, { useState, useCallback, useEffect } from 'react';
import { useInvestmentState } from './hooks/useInvestmentState';
import { MarketDataProvider, useMarketData } from './hooks/useMarketData';
import { useNobitex } from './hooks/useNobitex';
import { useTheme } from './hooks/useTheme';
import { useCurrencyDisplay } from './hooks/useCurrencyDisplay';
import { useProfileState } from './hooks/useProfileState';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { MarketsHubView } from './components/market/MarketsHubView';
import { HoldingsManager } from './components/holdings/HoldingsManager';
import { SellView } from './components/sell/SellView';
import { PercentagesConfig } from './components/settings/PercentagesConfig';
import { BackupRestore } from './components/settings/BackupRestore';
import { AccountSettingsView } from './components/settings/AccountSettingsView';
import { TransactionHistory } from './components/history/TransactionHistory';
import { WelcomeOnboardingModal } from './components/onboarding/WelcomeOnboardingModal';
import { ProfileSwitcherModal } from './components/account/ProfileSwitcherModal';
import { CheckCircle, Info, AlertCircle } from 'lucide-react';
import { PhysicalGoldType, ActiveTab } from './types/investment';

const AppContent: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [activeGoldFund, setActiveGoldFund] = useState<string>('عیار');
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  // Multi-User Profile State
  const {
    vault,
    activeProfile,
    activeProfileId,
    needsOnboarding,
    showProfileSwitcher,
    setShowProfileSwitcher,
    switchProfile,
    createProfile,
    completeOnboarding,
    startNewUserOnboarding,
    canCancelOnboarding,
    cancelOnboarding,
    updateActiveProfileData,
    deleteProfile,
  } = useProfileState();

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
    deductCryptoAssetHolding,
    goldHolding,
    physicalGoldItems,
    isRefreshingGold,
    isGoldFetchError,
    totalPhysicalGoldValueTomans,
    totalPhysicalGoldPnl,
    goldBuyLots,
    physicalGoldSales,
    addGoldBuyLot,
    removeGoldBuyLot,
    recordGoldSale,
    deleteGoldSaleRecord,
    clearGoldSaleHistory,
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
    vehicles,
    totalVehiclesValueTomans,
    netWorthVehiclesValueTomans,
    addVehicle,
    editVehicle,
    removeVehicle,
    dollarHolding,
    totalDollarValueTomans,
    updateDollarHolding,
    stocks,
    totalStocksValueTomans,
    addStock,
    editStock,
    removeStock,
    riskBucketsSummary,
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

  // Sync active profile data into device vault when local state changes
  useEffect(() => {
    if (activeProfileId) {
      updateActiveProfileData({
        settings,
        cryptoAssets,
        goldHolding,
        physicalGold: physicalGoldItems,
        properties,
        vehicles,
        dollarHolding,
        stocks,
        goldBuyLots,
        physicalGoldSales,
        transactions,
      });
    }
  }, [
    activeProfileId,
    settings,
    cryptoAssets,
    goldHolding,
    physicalGoldItems,
    properties,
    vehicles,
    dollarHolding,
    stocks,
    goldBuyLots,
    physicalGoldSales,
    transactions,
    updateActiveProfileData,
  ]);

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-gold-500/30 selection:text-gold-900 dark:selection:text-gold-200 pb-[max(7rem,calc(env(safe-area-inset-bottom)+5.5rem))] transition-colors duration-200">
      
      {/* Top Header */}
      <Header
        isDark={isDark}
        toggleTheme={toggleTheme}
        currencyMode={currencyMode}
        toggleCurrencyMode={toggleCurrencyMode}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        
        {/* TAB 1: DASHBOARD (OVERVIEW, 80/20 DONUT, SMART BUY & ASSET SUMMARY) */}
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
            vehiclesValue={netWorthVehiclesValueTomans}
            dollarValue={totalDollarValueTomans}
            stocksValue={totalStocksValueTomans}
            riskBucketsSummary={riskBucketsSummary}
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

        {/* TAB 2: MARKETS HUB (TSETMC GOLD FUNDS & NOBITEX CRYPTO) */}
        {(activeTab === 'markets' || (activeTab as string) === 'gold' || (activeTab as string) === 'crypto') && (
          <div className="animate-fadeIn">
            <MarketsHubView
              cryptoAssets={cryptoAssets}
              physicalGoldItems={physicalGoldItems}
              totalPhysicalGoldValueTomans={totalPhysicalGoldValueTomans}
              currencyMode={currencyMode}
              formatCurrency={formatCurrency}
              toDisplayValue={toDisplayValue}
              onAssetsUpdated={updateCryptoAssets}
              onNavigateToHoldings={() => setActiveTab('holdings')}
              onNotify={showNotification}
            />
          </div>
        )}

        {/* TAB 3: HOLDINGS MANAGEMENT (GOLD, CRYPTO, PROPERTIES & VEHICLES) */}
        {(activeTab === 'holdings' || (activeTab as string) === 'properties' || (activeTab as string) === 'vehicles') && (
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
              goldBuyLots={goldBuyLots}
              physicalGoldSales={physicalGoldSales}
              currencyMode={currencyMode}
              usdtRateTomans={usdtRateTomans}
              formatCurrency={formatCurrency}
              toDisplayValue={toDisplayValue}
              onRefreshPhysicalGold={refreshPhysicalGoldPrices}
              onUpdatePhysicalGoldQuantity={updatePhysicalGoldQuantity}
              onUpdatePhysicalGoldPrice={updatePhysicalGoldPrice}
              onAddGoldBuyLot={addGoldBuyLot}
              onDeleteGoldSale={deleteGoldSaleRecord}
              onClearGoldSales={clearGoldSaleHistory}
              properties={properties}
              onAddProperty={addProperty}
              onEditProperty={editProperty}
              onRemoveProperty={removeProperty}
              vehicles={vehicles}
              onAddVehicle={addVehicle}
              onEditVehicle={editVehicle}
              onRemoveVehicle={removeVehicle}
              dollarHolding={dollarHolding}
              onUpdateDollarHolding={updateDollarHolding}
              stocks={stocks}
              onAddStock={addStock}
              onEditStock={editStock}
              onRemoveStock={removeStock}
              onNavigateToCalculator={() => setActiveTab('dashboard')}
              onNavigateToMarket={() => setActiveTab('markets')}
              onNotify={showNotification}
            />
          </div>
        )}

        {/* TAB 4: SELL & REBALANCE */}
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
              onDeductCrypto={deductCryptoAssetHolding}
              onNotify={showNotification}
            />
          </div>
        )}

        {/* TAB 5: SETTINGS & ACCOUNT MANAGEMENT */}
        {activeTab === 'settings' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Account & Profile Management */}
            <AccountSettingsView
              activeProfile={activeProfile}
              profiles={vault?.profiles || []}
              onSelectProfile={switchProfile}
              onCreateProfile={createProfile}
              onDeleteProfile={deleteProfile}
              onStartOnboarding={startNewUserOnboarding}
              cryptoAssets={cryptoAssets}
              onAssetsUpdated={updateCryptoAssets}
              onNotify={showNotification}
            />

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

      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Onboarding Modal for First Time Users */}
      <WelcomeOnboardingModal
        isOpen={needsOnboarding}
        onComplete={completeOnboarding}
        canCancel={canCancelOnboarding}
        onCancel={cancelOnboarding}
      />

      {/* Profile Switcher Modal */}
      <ProfileSwitcherModal
        isOpen={showProfileSwitcher}
        onClose={() => setShowProfileSwitcher(false)}
        profiles={vault?.profiles || []}
        activeProfileId={activeProfileId}
        onSelectProfile={switchProfile}
        onCreateProfile={createProfile}
        onDeleteProfile={deleteProfile}
        onStartOnboarding={startNewUserOnboarding}
      />

      {/* Toast Notification Snackbar (Bottom-Floating above BottomNav) */}
      {notification && (
        <div className="fixed bottom-[max(5.25rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-4 right-4 z-50 flex justify-center pointer-events-none animate-toast-slide-up">
          <div
            className={`pointer-events-auto max-w-md px-4 py-3 rounded-2xl shadow-xl dark:shadow-2xl backdrop-blur-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
              notification.type === 'success'
                ? 'bg-white/95 dark:bg-slate-900/95 border-emerald-500/40 text-emerald-900 dark:text-emerald-300 shadow-emerald-500/10'
                : notification.type === 'error'
                ? 'bg-white/95 dark:bg-slate-900/95 border-rose-500/40 text-rose-900 dark:text-rose-300 shadow-rose-500/10'
                : 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 shadow-slate-900/10'
            }`}
          >
            {notification.type === 'success' && (
              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            )}
            {notification.type === 'info' && (
              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            {notification.type === 'error' && (
              <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              </div>
            )}
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
