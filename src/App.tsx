import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useInvestmentState } from './hooks/useInvestmentState';
import { MarketDataProvider, useMarketData } from './hooks/useMarketData';
import { useNobitex } from './hooks/useNobitex';
import { useTheme } from './hooks/useTheme';
import { useCurrencyDisplay } from './hooks/useCurrencyDisplay';
import { useProfileState } from './hooks/useProfileState';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CardSkeleton } from './components/common/SkeletonLoader';
import { CheckCircle, Info, AlertCircle } from 'lucide-react';
import { PhysicalGoldType } from './types/investment';
import { NobitexConfig } from './services/nobitex/types';
import { MarketInstrument, UserMarketHolding } from './services/marketData/types';
import {
  loadMarketInstruments,
  loadMarketHoldings,
  loadNobitexConfig,
  sanitizeProfileId,
} from './utils/storage';

const MarketsHubView = lazy(() =>
  import('./components/market/MarketsHubView').then((m) => ({ default: m.MarketsHubView }))
);
const HoldingsManager = lazy(() =>
  import('./components/holdings/HoldingsManager').then((m) => ({ default: m.HoldingsManager }))
);
const SellView = lazy(() =>
  import('./components/sell/SellView').then((m) => ({ default: m.SellView }))
);
const PercentagesConfig = lazy(() =>
  import('./components/settings/PercentagesConfig').then((m) => ({ default: m.PercentagesConfig }))
);
const BackupRestore = lazy(() =>
  import('./components/settings/BackupRestore').then((m) => ({ default: m.BackupRestore }))
);
const AccountSettingsView = lazy(() =>
  import('./components/settings/AccountSettingsView').then((m) => ({
    default: m.AccountSettingsView,
  }))
);
const TransactionHistory = lazy(() =>
  import('./components/history/TransactionHistory').then((m) => ({
    default: m.TransactionHistory,
  }))
);
const WelcomeOnboardingModal = lazy(() =>
  import('./components/onboarding/WelcomeOnboardingModal').then((m) => ({
    default: m.WelcomeOnboardingModal,
  }))
);
const ProfileSwitcherModal = lazy(() =>
  import('./components/account/ProfileSwitcherModal').then((m) => ({
    default: m.ProfileSwitcherModal,
  }))
);

type ProfileState = ReturnType<typeof useProfileState>;

const TabSuspenseFallback: React.FC = () => (
  <div className="space-y-4 py-2">
    <CardSkeleton count={3} />
  </div>
);

const AppContent: React.FC<{ profileState: ProfileState }> = ({ profileState }) => {
  const { isDark, toggleTheme } = useTheme();
  const [activeGoldFund, setActiveGoldFund] = useState<string>('عیار');
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  // Multi-User Profile State (lifted so MarketDataProvider stays strictly isolated per profile)
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
  } = profileState;

  const {
    currencyMode,
    usdtRateTomans,
    toggleCurrencyMode,
    formatCurrency,
    toDisplayValue,
    refreshUsdtRate,
  } = useCurrencyDisplay(activeProfileId);

  const {
    totalGoldMarketValueTomans,
    instruments,
    quotes,
    combinedItems,
    addUnitsToGoldInstrument,
    updateHolding,
    removeHolding,
    refreshQuotes,
    hydrateMarketDataFromProfile,
  } = useMarketData();

  const {
    config: nobitexConfig,
    loadedProfileId: nobitexLoadedProfileId,
    isConfigured: isNobitexConfigured,
    tomanCashBalance,
    syncWithNobitex,
    refreshCryptoPrices,
    saveConfig: saveNobitexConfigState,
  } = useNobitex(activeProfileId);

  const handleBackupRestored = useCallback(
    (targetProfileId: string | null) => {
      const pid = sanitizeProfileId(targetProfileId);
      const restoredInstruments = loadMarketInstruments(pid);
      const restoredHoldings = loadMarketHoldings(pid);
      const restoredNobitex = loadNobitexConfig(pid);

      hydrateMarketDataFromProfile(pid, restoredInstruments, restoredHoldings);
      saveNobitexConfigState(
        {
          authType: restoredNobitex.authType || 'api_key',
          publicKey: restoredNobitex.publicKey || '',
          secretKey: restoredNobitex.secretKey || '',
          token: restoredNobitex.token || '',
          autoSyncEnabled: restoredNobitex.autoSyncEnabled ?? false,
          lastSyncedAt: restoredNobitex.lastSyncedAt,
        },
        pid
      );

      if (pid) {
        updateActiveProfileData(
          {
            marketInstruments: restoredInstruments,
            marketHoldings: restoredHoldings,
            nobitexConfig: restoredNobitex,
          },
          pid
        );
      }
    },
    [hydrateMarketDataFromProfile, saveNobitexConfigState, updateActiveProfileData]
  );

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
    hydratedProfileId,
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
    goldBuyLots,
    physicalGoldSales,
    addGoldBuyLot,
    recordGoldSale,
    deleteGoldSaleRecord,
    clearGoldSaleHistory,
    updatePhysicalGoldQuantity,
    updatePhysicalGoldCostBasis,
    removePhysicalGoldItem,
    updatePhysicalGoldPrice,
    refreshPhysicalGoldPrices,
    properties,
    netWorthPropertiesValueTomans,
    addProperty,
    editProperty,
    removeProperty,
    vehicles,
    netWorthVehiclesValueTomans,
    addVehicle,
    editVehicle,
    removeVehicle,
    dollarHolding,
    totalDollarValueTomans,
    updateDollarHolding,
    riskBucketsSummary,
    transactions,
    deleteTransaction,
    clearAllHistory,
    calculationResult,
    applyPurchasesToHoldings,
    resetToFactoryDefaults,
    handleExportBackup,
    handleImportBackup,
    hydrateFromProfile,
    notification,
    showNotification,
  } = useInvestmentState({
    activeProfileId,
    externalGoldValueTomans: totalGoldMarketValueTomans,
    onApplyGoldPurchase: handleApplyGoldPurchase,
    onBackupRestored: handleBackupRestored,
  });

  // Track which profile local state reflects AND guard sync-back with state-matched IDs
  // so rapid profile switching never writes Profile A state onto Profile B.
  const lastHydratedProfileRef = useRef<string>('');
  const refreshAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      refreshAbortRef.current?.abort();
    };
  }, [activeProfileId]);

  // Hydrate local state + market instruments + per-profile Nobitex keys when active profile changes
  useEffect(() => {
    if (!activeProfileId || !activeProfile) return;
    if (lastHydratedProfileRef.current === activeProfileId) return;
    lastHydratedProfileRef.current = activeProfileId;

    hydrateFromProfile(activeProfile);
    hydrateMarketDataFromProfile(
      activeProfileId,
      activeProfile.marketInstruments,
      activeProfile.marketHoldings
    );

    const profileNobitex = activeProfile.nobitexConfig as NobitexConfig | undefined;
    if (profileNobitex && (profileNobitex.publicKey?.trim() || profileNobitex.token?.trim())) {
      saveNobitexConfigState(
        {
          authType: profileNobitex.authType || 'api_key',
          publicKey: profileNobitex.publicKey || '',
          secretKey: profileNobitex.secretKey || '',
          token: profileNobitex.token || '',
          autoSyncEnabled: profileNobitex.autoSyncEnabled ?? true,
          lastSyncedAt: profileNobitex.lastSyncedAt,
        },
        activeProfileId
      );
    } else {
      saveNobitexConfigState(
        {
          authType: 'api_key',
          publicKey: '',
          secretKey: '',
          token: '',
          autoSyncEnabled: false,
          lastSyncedAt: undefined,
        },
        activeProfileId
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId, activeProfile, hydrateFromProfile, hydrateMarketDataFromProfile]);

  // Sync active profile data into device vault only once state belongs to activeProfileId
  useEffect(() => {
    if (!activeProfileId) return;
    if (lastHydratedProfileRef.current !== activeProfileId) return;
    if (hydratedProfileId !== activeProfileId) return;
    updateActiveProfileData(
      {
        settings,
        cryptoAssets,
        goldHolding,
        physicalGold: physicalGoldItems,
        properties,
        vehicles,
        dollarHolding,
        goldBuyLots,
        physicalGoldSales,
        transactions,
        lastInput: inputAmount,
      },
      activeProfileId
    );
  }, [
    activeProfileId,
    hydratedProfileId,
    settings,
    cryptoAssets,
    goldHolding,
    physicalGoldItems,
    properties,
    vehicles,
    dollarHolding,
    goldBuyLots,
    physicalGoldSales,
    transactions,
    inputAmount,
    updateActiveProfileData,
  ]);

  // Persist per-profile Nobitex keys when they change (strictly isolated per profile)
  useEffect(() => {
    if (!activeProfileId) return;
    if (lastHydratedProfileRef.current !== activeProfileId) return;
    if (nobitexLoadedProfileId !== activeProfileId) return;
    if (!nobitexConfig) return;
    updateActiveProfileData({ nobitexConfig }, activeProfileId);
  }, [activeProfileId, nobitexLoadedProfileId, nobitexConfig, updateActiveProfileData]);

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
      if (!Number.isFinite(quantityToDeduct) || quantityToDeduct <= 0) return;
      recordGoldSale(id, quantityToDeduct, undefined, 'فروش از بخش محاسبه‌گر فروش');
    },
    [recordGoldSale]
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

  // Unified concurrent pull-to-refresh handler across TSETMC, TGJU Gold & Coins, USDT, and Nobitex
  const handleRefreshAll = useCallback(async () => {
    refreshAbortRef.current?.abort();
    const controller = new AbortController();
    refreshAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const startedProfileId = activeProfileId;

    setIsRefreshingAll(true);
    try {
      const results = await Promise.allSettled([
        refreshQuotes(true),
        refreshPhysicalGoldPrices(true, controller.signal),
        refreshUsdtRate(controller.signal),
        isNobitexConfigured
          ? syncWithNobitex(cryptoAssets, updateCryptoAssets)
          : refreshCryptoPrices(cryptoAssets, updateCryptoAssets, controller.signal),
      ]);

      if (controller.signal.aborted || startedProfileId !== activeProfileId) {
        return;
      }

      const failedCount = results.filter((r) => r.status === 'rejected').length;
      if (failedCount === 0) {
        showNotification('اطلاعات بورس، طلا، سکه و رمزارزها به‌روزرسانی شد', 'success');
      } else if (failedCount < results.length) {
        showNotification('برخی از قیمت‌ها به‌روزرسانی شدند', 'info');
      } else {
        showNotification('خطا در دریافت قیمت‌های زنده؛ اتصال اینترنت را بررسی کنید', 'warning');
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') {
        console.warn('Refresh all error:', e);
      }
    } finally {
      clearTimeout(timeoutId);
      if (refreshAbortRef.current === controller) {
        refreshAbortRef.current = null;
      }
      setIsRefreshingAll(false);
    }
  }, [
    activeProfileId,
    cryptoAssets,
    isNobitexConfigured,
    refreshCryptoPrices,
    refreshPhysicalGoldPrices,
    refreshQuotes,
    refreshUsdtRate,
    showNotification,
    syncWithNobitex,
    updateCryptoAssets,
  ]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-gold-500/30 selection:text-gold-900 dark:selection:text-gold-200 pb-[max(7rem,calc(env(safe-area-inset-bottom)+5.5rem))] overflow-x-clip">
      
      {/* Top Header */}
      <Header
        isDark={isDark}
        toggleTheme={toggleTheme}
        currencyMode={currencyMode}
        toggleCurrencyMode={toggleCurrencyMode}
        userName={activeProfile?.name}
        userColor={activeProfile?.avatarColor}
        onOpenProfileSwitcher={() => setShowProfileSwitcher(true)}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        <ErrorBoundary fallbackTitle="خطا در نمایش اطلاعات این بخش">
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
            <Suspense fallback={<TabSuspenseFallback />}>
              <div className="animate-fadeIn">
                <MarketsHubView
                  activeProfileId={activeProfileId}
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
            </Suspense>
          )}

          {/* TAB 3: HOLDINGS MANAGEMENT (GOLD, CRYPTO, PROPERTIES & VEHICLES) */}
          {(activeTab === 'holdings' || (activeTab as string) === 'properties' || (activeTab as string) === 'vehicles') && (
            <Suspense fallback={<TabSuspenseFallback />}>
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
                  onUpdatePhysicalGoldCostBasis={updatePhysicalGoldCostBasis}
                  onRecordGoldSale={recordGoldSale}
                  onRemovePhysicalGoldItem={removePhysicalGoldItem}
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
                  onNavigateToCalculator={() => setActiveTab('dashboard')}
                  onNavigateToMarket={() => setActiveTab('markets')}
                  onNotify={showNotification}
                />
              </div>
            </Suspense>
          )}

          {/* TAB 4: SELL & REBALANCE */}
          {activeTab === 'sell' && (
            <Suspense fallback={<TabSuspenseFallback />}>
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
            </Suspense>
          )}

          {/* TAB 5: SETTINGS & ACCOUNT MANAGEMENT */}
          {activeTab === 'settings' && (
            <Suspense fallback={<TabSuspenseFallback />}>
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
            </Suspense>
          )}
        </ErrorBoundary>
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Onboarding Modal for First Time Users (lazy loaded only when open) */}
      {needsOnboarding && (
        <Suspense fallback={null}>
          <WelcomeOnboardingModal
            isOpen={needsOnboarding}
            onComplete={completeOnboarding}
            canCancel={canCancelOnboarding}
            onCancel={cancelOnboarding}
          />
        </Suspense>
      )}

      {/* Profile Switcher Modal (lazy loaded only when explicitly opened) */}
      {showProfileSwitcher && (
        <Suspense fallback={null}>
          <ProfileSwitcherModal
            isOpen={showProfileSwitcher}
            onClose={() => setShowProfileSwitcher(false)}
            profiles={vault?.profiles || []}
            activeProfileId={activeProfileId}
            onSelectProfile={switchProfile}
            onCreateProfile={createProfile}
            onDeleteProfile={deleteProfile}
            onStartOnboarding={startNewUserOnboarding}
            onNotify={showNotification}
          />
        </Suspense>
      )}

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
  const profileState = useProfileState();
  const { activeProfileId, updateActiveProfileData } = profileState;

  const handlePersistProfileMarketData = useCallback(
    (
      nextInstruments: MarketInstrument[],
      nextHoldings: UserMarketHolding[],
      targetProfileId: string
    ) => {
      updateActiveProfileData(
        {
          marketInstruments: nextInstruments,
          marketHoldings: nextHoldings,
        },
        targetProfileId
      );
    },
    [updateActiveProfileData]
  );

  return (
    <ErrorBoundary fallbackTitle="خطا در بارگذاری ترازینو">
      <MarketDataProvider
        activeProfileId={activeProfileId}
        onPersistProfileMarketData={handlePersistProfileMarketData}
      >
        <AppContent profileState={profileState} />
      </MarketDataProvider>
    </ErrorBoundary>
  );
};

export default App;
