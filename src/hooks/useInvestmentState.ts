import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  AppSettings,
  CryptoAsset,
  GoldHolding,
  PhysicalGoldItem,
  PhysicalGoldType,
  PropertyItem,
  TransactionRecord,
  CalculationResult,
  ActiveTab,
  AppBackupData,
} from '../types/investment';
import {
  loadSettings,
  saveSettings,
  loadCryptoAssets,
  saveCryptoAssets,
  loadGoldHolding,
  saveGoldHolding,
  loadPhysicalGold,
  savePhysicalGold,
  loadProperties,
  saveProperties,
  loadTransactions,
  saveTransactions,
  loadLastInput,
  saveLastInput,
  exportBackupData,
  importBackupData,
  resetAllDataToDefault,
} from '../utils/storage';
import { calculatePortfolioAllocation } from '../utils/calculations';
import { getPersianFormattedDate } from '../utils/formatters';
import { physicalGoldService } from '../services/goldPrice/PhysicalGoldService';

interface UseInvestmentStateProps {
  externalGoldValueTomans?: number;
  onApplyGoldPurchase?: (goldBuyAmountTomans: number) => void;
}

export function useInvestmentState(props?: UseInvestmentStateProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculator');
  const [inputAmount, setInputAmountState] = useState<number>(() => loadLastInput());
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());
  const [cryptoAssets, setCryptoAssetsState] = useState<CryptoAsset[]>(() => loadCryptoAssets());
  const [goldHolding, setGoldHoldingState] = useState<GoldHolding>(() => loadGoldHolding());
  const [physicalGoldItems, setPhysicalGoldItemsState] = useState<PhysicalGoldItem[]>(() => loadPhysicalGold());
  const [properties, setPropertiesState] = useState<PropertyItem[]>(() => loadProperties());
  const [isRefreshingGold, setIsRefreshingGold] = useState<boolean>(false);
  const [isGoldFetchError, setIsGoldFetchError] = useState<boolean>(false);
  const [transactions, setTransactionsState] = useState<TransactionRecord[]>(() => loadTransactions());
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  const setInputAmount = useCallback((val: number) => {
    setInputAmountState(val);
    saveLastInput(val);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
    showNotification('تنظیمات با موفقیت ذخیره شد');
  }, [showNotification]);

  const updateCryptoAssets = useCallback((newAssets: CryptoAsset[]) => {
    setCryptoAssetsState(newAssets);
    saveCryptoAssets(newAssets);
  }, []);

  const updateGoldHolding = useCallback((newGold: Partial<GoldHolding>) => {
    setGoldHoldingState((prev) => {
      const updated = { ...prev, ...newGold };
      saveGoldHolding(updated);
      return updated;
    });
    showNotification('دارایی طلا به‌روزرسانی شد');
  }, [showNotification]);

  // -------------------------------------------------------------
  // PHYSICAL GOLD & COINS MANAGEMENT
  // -------------------------------------------------------------

  const updatePhysicalGoldQuantity = useCallback((id: PhysicalGoldType, quantity: number) => {
    setPhysicalGoldItemsState((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          return { ...item, quantity: Math.max(0, quantity) };
        }
        return item;
      });
      savePhysicalGold(updated);
      return updated;
    });
    showNotification('موجودی طلای فیزیکی به‌روزرسانی شد');
  }, [showNotification]);

  const updatePhysicalGoldPrice = useCallback((id: PhysicalGoldType, unitPriceTomans: number, isCustom = true) => {
    setPhysicalGoldItemsState((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            unitPriceTomans: Math.max(0, unitPriceTomans),
            isCustomPrice: isCustom,
          };
        }
        return item;
      });
      savePhysicalGold(updated);
      return updated;
    });
    showNotification('قیمت واحد به‌روزرسانی شد');
  }, [showNotification]);

  const refreshPhysicalGoldPrices = useCallback(async () => {
    setIsRefreshingGold(true);
    try {
      const liveRates = await physicalGoldService.fetchLiveRates();
      const hasRates = Object.keys(liveRates).length > 0;
      setIsGoldFetchError(!hasRates);

      if (hasRates) {
        setPhysicalGoldItemsState((prev) => {
          const updated = prev.map((item) => {
            const liveRate = liveRates[item.id];
            if (liveRate && !item.isCustomPrice) {
              return {
                ...item,
                unitPriceTomans: liveRate.priceTomans,
                priceChangePercent: liveRate.changePercent,
                lastFetchedAt: Date.now(),
              };
            }
            return item;
          });
          savePhysicalGold(updated);
          return updated;
        });
      }
    } catch (e) {
      console.warn('Failed to refresh physical gold prices:', e);
      setIsGoldFetchError(true);
    } finally {
      setIsRefreshingGold(false);
    }
  }, []);

  // Auto-fetch live gold & coin rates on load
  useEffect(() => {
    refreshPhysicalGoldPrices();
  }, [refreshPhysicalGoldPrices]);

  const totalPhysicalGoldValueTomans = useMemo(() => {
    return physicalGoldItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPriceTomans);
    }, 0);
  }, [physicalGoldItems]);

  const addCryptoAsset = useCallback((asset: Omit<CryptoAsset, 'id'>) => {
    const newAsset: CryptoAsset = {
      ...asset,
      id: `custom_${Date.now()}_${asset.symbol.toLowerCase()}`,
    };
    setCryptoAssetsState((prev) => {
      const updated = [...prev, newAsset];
      saveCryptoAssets(updated);
      return updated;
    });
    showNotification(`ارز ${newAsset.symbol} با موفقیت اضافه شد`);
  }, [showNotification]);

  const editCryptoAsset = useCallback((id: string, updates: Partial<CryptoAsset>) => {
    setCryptoAssetsState((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== id) return item;
        const edited = { ...item, ...updates };
        if (updates.currentAmount !== undefined && edited.unitPrice) {
          edited.currentHoldingValue = Math.round(updates.currentAmount * edited.unitPrice);
        } else if (updates.currentHoldingValue !== undefined && edited.unitPrice && edited.unitPrice > 0) {
          edited.currentAmount = Number((updates.currentHoldingValue / edited.unitPrice).toFixed(6));
        }
        return edited;
      });
      saveCryptoAssets(updated);
      return updated;
    });
    showNotification('ارز ویرایش شد');
  }, [showNotification]);

  const removeCryptoAsset = useCallback((id: string) => {
    setCryptoAssetsState((prev) => {
      const target = prev.find((a) => a.id === id);
      const updated = prev.filter((a) => a.id !== id);
      saveCryptoAssets(updated);
      showNotification(`ارز ${target?.symbol || ''} حذف شد`, 'info');
      return updated;
    });
  }, [showNotification]);

  // Combined Gold Valuation: TSETMC Gold Funds + Physical Gold & Coins
  const effectiveGoldHolding: GoldHolding = useMemo(() => {
    const tsetmcGoldVal = props?.externalGoldValueTomans || 0;
    const combinedGoldVal = tsetmcGoldVal + totalPhysicalGoldValueTomans;
    
    if (combinedGoldVal > 0) {
      return {
        ...goldHolding,
        currentHoldingValue: combinedGoldVal,
      };
    }
    return goldHolding;
  }, [props?.externalGoldValueTomans, totalPhysicalGoldValueTomans, goldHolding]);

  // Main portfolio rebalancing calculation result
  const calculationResult = useMemo(() => {
    return calculatePortfolioAllocation(inputAmount, settings, cryptoAssets, effectiveGoldHolding);
  }, [inputAmount, settings, cryptoAssets, effectiveGoldHolding]);

  // Apply suggested purchases into current holdings
  const applyPurchasesToHoldings = useCallback(() => {
    if (calculationResult.totalSavingsAmount <= 0) {
      showNotification('مبلغ پس‌انداز صفر است. ابتدا مبلغ ورودی را تعیین کنید.', 'error');
      return;
    }

    // 1. Update Gold holding / Trigger TSETMC gold holding increment
    if (props?.onApplyGoldPurchase && calculationResult.goldBuyAmount > 0) {
      props.onApplyGoldPurchase(calculationResult.goldBuyAmount);
    } else {
      setGoldHoldingState((prevGold) => {
        const updatedGold: GoldHolding = {
          ...prevGold,
          currentHoldingValue: (prevGold.currentHoldingValue || 0) + calculationResult.goldBuyAmount,
        };
        saveGoldHolding(updatedGold);
        return updatedGold;
      });
    }

    // 2. Update Crypto assets
    setCryptoAssetsState((prevAssets) => {
      const updated = prevAssets.map((asset) => {
        const buy = calculationResult.cryptoBuys.find((b) => b.id === asset.id);
        if (buy && buy.suggestedBuy > 0) {
          const newHoldingVal = asset.currentHoldingValue + buy.suggestedBuy;
          let newCoinAmount = asset.currentAmount;
          if (asset.unitPrice && asset.unitPrice > 0) {
            newCoinAmount = Number((newHoldingVal / asset.unitPrice).toFixed(6));
          }
          return {
            ...asset,
            currentHoldingValue: newHoldingVal,
            currentAmount: newCoinAmount,
          };
        }
        return asset;
      });
      saveCryptoAssets(updated);
      return updated;
    });

    // 3. Create Transaction Record
    const newTx: TransactionRecord = {
      id: `tx_${Date.now()}`,
      date: new Date().toISOString(),
      persianDate: getPersianFormattedDate(new Date()),
      totalInputAmount: calculationResult.totalInputAmount,
      totalSavingsAmount: calculationResult.totalSavingsAmount,
      goldBuyAmount: calculationResult.goldBuyAmount,
      cryptoBuyAmount: calculationResult.cryptoBuyAmount,
      cryptoBuys: calculationResult.cryptoBuys
        .filter((b) => b.suggestedBuy > 0)
        .map((b) => ({
          symbol: b.symbol,
          name: b.name,
          amount: b.suggestedBuy,
        })),
      appliedToHoldings: true,
    };

    setTransactionsState((prev) => {
      const updated = [newTx, ...prev];
      saveTransactions(updated);
      return updated;
    });

    showNotification('خریدها با موفقیت در موجودی دارایی‌ها و تاریخچه تراکنش‌ها ثبت شدند');
  }, [calculationResult, props, showNotification]);

  // -------------------------------------------------------------
  // REAL ESTATE & PROPERTY MANAGEMENT
  // -------------------------------------------------------------

  const addProperty = useCallback((propertyData: Omit<PropertyItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProperty: PropertyItem = {
      ...propertyData,
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setPropertiesState((prev) => {
      const updated = [newProperty, ...prev];
      saveProperties(updated);
      return updated;
    });
    showNotification(`ملک "${newProperty.title}" با موفقیت اضافه شد`);
  }, [showNotification]);

  const editProperty = useCallback((id: string, updates: Partial<PropertyItem>) => {
    setPropertiesState((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          ...updates,
          updatedAt: Date.now(),
        };
      });
      saveProperties(updated);
      return updated;
    });
  }, []);

  const removeProperty = useCallback((id: string) => {
    setPropertiesState((prev) => {
      const target = prev.find((p) => p.id === id);
      const updated = prev.filter((p) => p.id !== id);
      saveProperties(updated);
      showNotification(`ملک "${target?.title || ''}" حذف شد`, 'info');
      return updated;
    });
  }, [showNotification]);

  const updatePropertyValuation = useCallback((id: string, valuationRial: number) => {
    setPropertiesState((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          currentValuationRial: Math.max(0, valuationRial),
          updatedAt: Date.now(),
        };
      });
      saveProperties(updated);
      return updated;
    });
    showNotification('ارزش روز ملک به‌روزرسانی شد');
  }, [showNotification]);

  const totalPropertiesValueTomans = useMemo(() => {
    return properties.reduce((sum, p) => {
      const valToman = Math.round((p.currentValuationRial || p.purchasePriceRial || 0) / 10);
      return sum + valToman;
    }, 0);
  }, [properties]);

  const netWorthPropertiesValueTomans = useMemo(() => {
    return properties.reduce((sum, p) => {
      if (p.includeInTotalNetWorth === false) return sum;
      const valToman = Math.round((p.currentValuationRial || p.purchasePriceRial || 0) / 10);
      return sum + valToman;
    }, 0);
  }, [properties]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactionsState((prev) => {
      const updated = prev.filter((tx) => tx.id !== id);
      saveTransactions(updated);
      return updated;
    });
    showNotification('تراکنش از تاریخچه حذف شد', 'info');
  }, [showNotification]);

  const clearAllHistory = useCallback(() => {
    setTransactionsState([]);
    saveTransactions([]);
    showNotification('کل تاریخچه تراکنش‌ها پاک شد', 'info');
  }, [showNotification]);

  const resetToFactoryDefaults = useCallback(() => {
    resetAllDataToDefault();
    setSettingsState(loadSettings());
    setCryptoAssetsState(loadCryptoAssets());
    setGoldHoldingState(loadGoldHolding());
    setPhysicalGoldItemsState(loadPhysicalGold());
    setPropertiesState([]);
    setTransactionsState([]);
    setInputAmountState(0);
    showNotification('تمامی اطلاعات به تنظیمات پیش‌فرض کارخانه بازنشانی شد', 'info');
  }, [showNotification]);

  const handleExportBackup = useCallback(() => {
    try {
      const dataStr = exportBackupData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `investment_app_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification('فایل پشتیبان با موفقیت دانلود شد');
    } catch (e) {
      showNotification('خطا در ایجاد فایل پشتیبان', 'error');
    }
  }, [showNotification]);

  const handleImportBackup = useCallback((jsonString: string) => {
    const success = importBackupData(jsonString);
    if (success) {
      setSettingsState(loadSettings());
      setCryptoAssetsState(loadCryptoAssets());
      setGoldHoldingState(loadGoldHolding());
      setPhysicalGoldItemsState(loadPhysicalGold());
      setPropertiesState(loadProperties());
      setTransactionsState(loadTransactions());
      showNotification('اطلاعات با موفقیت از فایل پشتیبان بازیابی شدند');
    } else {
      showNotification('فایل پشتیبان نامعتبر است', 'error');
    }
    return success;
  }, [showNotification]);

  return {
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
    updateGoldHolding,
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
  };
}
