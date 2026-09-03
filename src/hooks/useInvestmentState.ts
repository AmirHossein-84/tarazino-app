import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  AppSettings,
  CryptoAsset,
  GoldHolding,
  PhysicalGoldItem,
  PhysicalGoldType,
  PhysicalGoldBuyLot,
  PhysicalGoldSaleRecord,
  PropertyItem,
  VehicleItem,
  DollarHolding,
  RiskBucketsSummary,
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
  loadVehicles,
  saveVehicles,
  loadDollarHolding,
  saveDollarHolding,
  loadGoldBuyLots,
  saveGoldBuyLots,
  loadPhysicalGoldSales,
  savePhysicalGoldSales,
  loadTransactions,
  saveTransactions,
  loadLastInput,
  saveLastInput,
  exportBackupData,
  importBackupData,
  resetAllDataToDefault,
} from '../utils/storage';
import { calculatePortfolioAllocation } from '../utils/calculations';
import { getPersianFormattedDate, formatToman } from '../utils/formatters';
import { physicalGoldService } from '../services/goldPrice/PhysicalGoldService';
import {
  calculateGoldItemPnl,
  calculateTotalPhysicalGoldPnl,
  processGoldSale,
} from '../utils/goldPnlCalculators';

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
  const [goldBuyLots, setGoldBuyLotsState] = useState<PhysicalGoldBuyLot[]>(() => loadGoldBuyLots());
  const [physicalGoldSales, setPhysicalGoldSalesState] = useState<PhysicalGoldSaleRecord[]>(() => loadPhysicalGoldSales());
  const [properties, setPropertiesState] = useState<PropertyItem[]>(() => loadProperties());
  const [vehicles, setVehiclesState] = useState<VehicleItem[]>(() => loadVehicles());
  const [dollarHolding, setDollarHoldingState] = useState<DollarHolding>(() => loadDollarHolding());
  const [isRefreshingGold, setIsRefreshingGold] = useState<boolean>(false);
  const [isGoldFetchError, setIsGoldFetchError] = useState<boolean>(false);
  const [transactions, setTransactionsState] = useState<TransactionRecord[]>(() => loadTransactions());
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
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
  // PHYSICAL GOLD & COINS MANAGEMENT WITH P&L AND LOTS
  // -------------------------------------------------------------

  const addGoldBuyLot = useCallback(
    (lotData: Omit<PhysicalGoldBuyLot, 'id' | 'totalCostTomans'>) => {
      const totalCostTomans = Math.round(lotData.quantity * lotData.purchaseUnitPriceTomans);
      const newLot: PhysicalGoldBuyLot = {
        ...lotData,
        id: `lot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        totalCostTomans,
      };

      const updatedLots = [newLot, ...goldBuyLots];
      setGoldBuyLotsState(updatedLots);
      saveGoldBuyLots(updatedLots);

      // Automatically update item total quantity and cost basis
      setPhysicalGoldItemsState((prev) => {
        const updated = prev.map((item) => {
          if (item.id === lotData.goldType) {
            const newQty = Number(((item.quantity || 0) + lotData.quantity).toFixed(3));
            const itemLots = updatedLots.filter((l) => l.goldType === item.id);
            const totalCost = itemLots.reduce((sum, l) => sum + l.totalCostTomans, 0);
            const totalQty = itemLots.reduce((sum, l) => sum + l.quantity, 0);
            const avgCost = totalQty > 0 ? Math.round(totalCost / totalQty) : lotData.purchaseUnitPriceTomans;

            return {
              ...item,
              quantity: newQty,
              averageBuyPriceTomans: avgCost,
              totalCostTomans: totalCost,
              buyLots: itemLots,
            };
          }
          return item;
        });
        savePhysicalGold(updated);
        return updated;
      });

      showNotification(`پله خرید ${lotData.quantity} ${lotData.goldType.startsWith('coin_') ? 'عدد' : 'گرم'} طلا با موفقیت ثبت شد`);
    },
    [goldBuyLots, showNotification]
  );

  const removeGoldBuyLot = useCallback(
    (lotId: string) => {
      const lotToRemove = goldBuyLots.find((l) => l.id === lotId);
      if (!lotToRemove) return;

      const updatedLots = goldBuyLots.filter((l) => l.id !== lotId);
      setGoldBuyLotsState(updatedLots);
      saveGoldBuyLots(updatedLots);

      // Recalculate item quantity and cost basis
      setPhysicalGoldItemsState((prev) => {
        const updated = prev.map((item) => {
          if (item.id === lotToRemove.goldType) {
            const newQty = Math.max(0, Number(((item.quantity || 0) - lotToRemove.quantity).toFixed(3)));
            const itemLots = updatedLots.filter((l) => l.goldType === item.id);
            const totalCost = itemLots.reduce((sum, l) => sum + l.totalCostTomans, 0);
            const totalQty = itemLots.reduce((sum, l) => sum + l.quantity, 0);
            const avgCost = totalQty > 0 ? Math.round(totalCost / totalQty) : undefined;

            return {
              ...item,
              quantity: newQty,
              averageBuyPriceTomans: avgCost,
              totalCostTomans: totalCost,
              buyLots: itemLots,
            };
          }
          return item;
        });
        savePhysicalGold(updated);
        return updated;
      });

      showNotification('پله خرید از سوابق حذف شد', 'info');
    },
    [goldBuyLots, showNotification]
  );

  const recordGoldSale = useCallback(
    (
      id: PhysicalGoldType,
      quantitySold: number,
      saleUnitPriceTomans?: number,
      notes?: string
    ) => {
      const item = physicalGoldItems.find((i) => i.id === id);
      if (!item || quantitySold <= 0) return;

      const effectiveSalePrice = saleUnitPriceTomans || item.unitPriceTomans || 0;
      const { saleRecord, updatedLots } = processGoldSale(
        item,
        quantitySold,
        effectiveSalePrice,
        goldBuyLots,
        notes
      );

      // Save sale record
      const updatedSales = [saleRecord, ...physicalGoldSales];
      setPhysicalGoldSalesState(updatedSales);
      savePhysicalGoldSales(updatedSales);

      // Update remaining lots
      setGoldBuyLotsState(updatedLots);
      saveGoldBuyLots(updatedLots);

      // Update item holdings
      setPhysicalGoldItemsState((prev) => {
        const updated = prev.map((it) => {
          if (it.id === id) {
            const newQty = Math.max(0, Number(((it.quantity || 0) - quantitySold).toFixed(3)));
            const itemLots = updatedLots.filter((l) => l.goldType === id);
            const totalCost = itemLots.reduce((sum, l) => sum + (l.totalCostTomans || l.quantity * l.purchaseUnitPriceTomans), 0);
            const totalQty = itemLots.reduce((sum, l) => sum + l.quantity, 0);
            const avgCost = totalQty > 0 ? Math.round(totalCost / totalQty) : undefined;

            return {
              ...it,
              quantity: newQty,
              averageBuyPriceTomans: avgCost,
              totalCostTomans: totalCost,
              buyLots: itemLots,
            };
          }
          return it;
        });
        savePhysicalGold(updated);
        return updated;
      });

      showNotification(`فروش ${quantitySold} ${item.unit} ${item.title} با موفقیت ثبت شد`, 'success');
    },
    [physicalGoldItems, goldBuyLots, physicalGoldSales, showNotification]
  );

  const deleteGoldSaleRecord = useCallback(
    (id: string) => {
      setPhysicalGoldSalesState((prev) => {
        const updated = prev.filter((s) => s.id !== id);
        savePhysicalGoldSales(updated);
        return updated;
      });
      showNotification('سند فروش از دفتر کل حذف شد', 'info');
    },
    [showNotification]
  );

  const clearGoldSaleHistory = useCallback(() => {
    setPhysicalGoldSalesState([]);
    savePhysicalGoldSales([]);
    showNotification('کل دفتر سوابق فروش طلا پاک شد', 'info');
  }, [showNotification]);

  const updatePhysicalGoldQuantity = useCallback(
    (id: PhysicalGoldType, newQuantity: number) => {
      const safeNewQty = Math.max(0, Number(newQuantity.toFixed(3)));
      setPhysicalGoldItemsState((prev) => {
        const updated = prev.map((item) => {
          if (item.id === id) {
            return { ...item, quantity: safeNewQty };
          }
          return item;
        });
        savePhysicalGold(updated);
        return updated;
      });
      showNotification('موجودی طلای فیزیکی به‌روزرسانی شد');
    },
    [showNotification]
  );

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

  const totalPhysicalGoldPnl = useMemo(() => {
    return calculateTotalPhysicalGoldPnl(physicalGoldItems, goldBuyLots);
  }, [physicalGoldItems, goldBuyLots]);

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
        } else if (updates.unitPrice !== undefined && updates.currentAmount === undefined && item.currentAmount !== undefined) {
          edited.currentHoldingValue = Math.round(item.currentAmount * updates.unitPrice);
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

  const deductCryptoAssetHolding = useCallback((id: string, amountToDeduct: number) => {
    setCryptoAssetsState((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const currentAmt = item.currentAmount || 0;
          const newAmt = Math.max(0, Number((currentAmt - amountToDeduct).toFixed(6)));
          const unitP = item.unitPrice || 0;
          return {
            ...item,
            currentAmount: newAmt,
            currentHoldingValue: Math.round(newAmt * unitP),
          };
        }
        return item;
      });
      saveCryptoAssets(updated);
      return updated;
    });
  }, []);

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

  // -------------------------------------------------------------
  // VEHICLES (CARS & MOTORCYCLES) MANAGEMENT
  // -------------------------------------------------------------

  const addVehicle = useCallback((vehicleData: Omit<VehicleItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newVehicle: VehicleItem = {
      ...vehicleData,
      id: `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setVehiclesState((prev) => {
      const updated = [newVehicle, ...prev];
      saveVehicles(updated);
      return updated;
    });
    showNotification(`وسیله نقلیه "${newVehicle.title}" با موفقیت اضافه شد`);
  }, [showNotification]);

  const editVehicle = useCallback((id: string, updates: Partial<VehicleItem>) => {
    setVehiclesState((prev) => {
      const updated = prev.map((v) => {
        if (v.id !== id) return v;
        return {
          ...v,
          ...updates,
          updatedAt: Date.now(),
        };
      });
      saveVehicles(updated);
      return updated;
    });
  }, []);

  const removeVehicle = useCallback((id: string) => {
    setVehiclesState((prev) => {
      const target = prev.find((v) => v.id === id);
      const updated = prev.filter((v) => v.id !== id);
      saveVehicles(updated);
      showNotification(`وسیله نقلیه "${target?.title || ''}" حذف شد`, 'info');
      return updated;
    });
  }, [showNotification]);

  const totalVehiclesValueTomans = useMemo(() => {
    return vehicles.reduce((sum, v) => sum + (v.currentValuationTomans || v.purchasePriceTomans || 0), 0);
  }, [vehicles]);

  const netWorthVehiclesValueTomans = useMemo(() => {
    return vehicles.reduce((sum, v) => {
      if (v.includeInTotalNetWorth === false) return sum;
      return sum + (v.currentValuationTomans || v.purchasePriceTomans || 0);
    }, 0);
  }, [vehicles]);

  // -------------------------------------------------------------
  // USD CASH BANKNOTES HOLDINGS MANAGEMENT
  // -------------------------------------------------------------

  const updateDollarHolding = useCallback((updates: Partial<DollarHolding>) => {
    setDollarHoldingState((prev) => {
      const updated = { ...prev, ...updates, lastUpdated: Date.now() };
      saveDollarHolding(updated);
      return updated;
    });
    showNotification('دارایی دلاری به‌روزرسانی شد');
  }, [showNotification]);

  const totalDollarValueTomans = useMemo(() => {
    return Math.round((dollarHolding.amountUsd || 0) * (dollarHolding.currentPriceTomans || 0));
  }, [dollarHolding]);

  // -------------------------------------------------------------
  // 3-BUCKET RISK PORTFOLIO SUMMARY (Low, Medium, High Risk)
  // -------------------------------------------------------------

  const riskBucketsSummary: RiskBucketsSummary = useMemo(() => {
    // 1. Low Risk: Vehicles + Properties + Dollar
    const vehiclesVal = netWorthVehiclesValueTomans;
    const propertiesVal = netWorthPropertiesValueTomans;
    const dollarVal = totalDollarValueTomans;
    const lowRiskTotal = vehiclesVal + propertiesVal + dollarVal;

    // 2. Medium Risk: Physical Gold + TSETMC Gold Funds (عيار، کهربا، زر و...)
    const physGoldVal = totalPhysicalGoldValueTomans;
    const tsetmcGoldVal = props?.externalGoldValueTomans || 0;
    const mediumRiskTotal = physGoldVal + tsetmcGoldVal;

    // 3. High Risk: Crypto Assets
    const cryptoTotal = cryptoAssets.reduce((sum, a) => sum + (a.currentHoldingValue || 0), 0);

    const totalNetWorth = lowRiskTotal + mediumRiskTotal + cryptoTotal;

    const actualLowRiskPercent = totalNetWorth > 0 ? Number(((lowRiskTotal / totalNetWorth) * 100).toFixed(1)) : 0;
    const actualMediumRiskPercent = totalNetWorth > 0 ? Number(((mediumRiskTotal / totalNetWorth) * 100).toFixed(1)) : 0;
    const actualHighRiskPercent = totalNetWorth > 0 ? Number(((cryptoTotal / totalNetWorth) * 100).toFixed(1)) : 0;

    const config = settings.riskBucketsConfig;
    const userAge = config?.userAge ?? 25;
    const lowRiskTarget = config?.lowRiskPercent ?? userAge;
    const highRiskTarget = config?.highRiskPercent ?? 11;
    const mediumRiskTarget = config?.mediumRiskPercent ?? Math.max(0, 100 - lowRiskTarget - highRiskTarget);

    return {
      lowRisk: {
        targetPercent: lowRiskTarget,
        currentValueTomans: lowRiskTotal,
        actualPercent: actualLowRiskPercent,
        components: {
          vehiclesValueTomans: vehiclesVal,
          propertiesValueTomans: propertiesVal,
          dollarValueTomans: dollarVal,
        },
      },
      mediumRisk: {
        targetPercent: mediumRiskTarget,
        currentValueTomans: mediumRiskTotal,
        actualPercent: actualMediumRiskPercent,
        components: {
          physicalGoldValueTomans: physGoldVal,
          tsetmcGoldValueTomans: tsetmcGoldVal,
        },
      },
      highRisk: {
        targetPercent: highRiskTarget,
        currentValueTomans: cryptoTotal,
        actualPercent: actualHighRiskPercent,
        components: {
          cryptoValueTomans: cryptoTotal,
        },
      },
      totalNetWorthTomans: totalNetWorth,
    };
  }, [
    netWorthVehiclesValueTomans,
    netWorthPropertiesValueTomans,
    totalDollarValueTomans,
    totalPhysicalGoldValueTomans,
    props?.externalGoldValueTomans,
    cryptoAssets,
    settings.riskBucketsConfig,
  ]);

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
    setGoldBuyLotsState([]);
    setPhysicalGoldSalesState([]);
    setPropertiesState([]);
    setVehiclesState([]);
    setDollarHoldingState(loadDollarHolding());
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
      link.download = `tarazino_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
      setGoldBuyLotsState(loadGoldBuyLots());
      setPhysicalGoldSalesState(loadPhysicalGoldSales());
      setPropertiesState(loadProperties());
      setVehiclesState(loadVehicles());
      setDollarHoldingState(loadDollarHolding());
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
    deductCryptoAssetHolding,
    goldHolding,
    updateGoldHolding,
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
  };
}
