import { AppSettings, CryptoAsset, PhysicalGoldItem } from '../types/investment';
import { CombinedMarketItem } from '../hooks/useMarketData';

export interface BourseGoldSellItem {
  id: string;
  symbol: string;
  name: string;
  unitsToSell: number;
  currentUnits: number;
  unitPrice: number;
  totalTomans: number;
}

export interface CryptoSellItem {
  id: string;
  symbol: string;
  name: string;
  amountToSell: number;
  currentAmount?: number;
  currentHoldingValue: number;
  unitPrice: number;
  totalTomans: number;
  color: string;
  targetPercent: number;
}

export interface PhysicalGoldSellItem {
  id: string;
  title: string;
  unit: string;
  quantityToSell: number;
  currentQuantity: number;
  unitPrice: number;
  totalTomans: number;
}

export interface SellCalculationResult {
  requestedAmountTomans: number;
  actualTotalSaleTomans: number;
  goldSaleTomans: number;
  cryptoSaleTomans: number;
  physicalGoldSaleTomans: number;
  bourseGoldSales: BourseGoldSellItem[];
  cryptoSales: CryptoSellItem[];
  physicalGoldSales: PhysicalGoldSellItem[];
  currentPortfolioValue: number;
  resultingPortfolioValue: number;
  resultingGoldValue: number;
  resultingCryptoValue: number;
  resultingGoldPercent: number;
  resultingCryptoPercent: number;
}

export interface SellOptions {
  includePhysicalGold?: boolean;
  includeBourseGold?: boolean;
  includeCrypto?: boolean;
  selectedAssetIds?: string[]; // Specific IDs when selective mode is active
}

/**
 * Calculates optimal selling quantities across assets to liquidate the requested amount
 * while keeping the remaining portfolio as close as possible to target 80/20 percentages.
 */
export function calculateOptimalSales(
  requestedAmountTomans: number,
  cryptoAssets: CryptoAsset[],
  bourseItems: CombinedMarketItem[],
  physicalGoldItems: PhysicalGoldItem[],
  settings: AppSettings,
  options: SellOptions = {
    includePhysicalGold: false,
    includeBourseGold: true,
    includeCrypto: true,
  }
): SellCalculationResult {
  const {
    includePhysicalGold = false,
    includeBourseGold = true,
    includeCrypto = true,
    selectedAssetIds,
  } = options;

  // Filter items with actual holdings and selection
  const isSelected = (id: string) => !selectedAssetIds || selectedAssetIds.length === 0 || selectedAssetIds.includes(id);

  const activeBourseGold = bourseItems
    .filter((item) => (item.currentValueTomans || 0) > 0 && item.holding && item.holding.quantity > 0)
    .filter((item) => isSelected(item.instrument.id));

  const activePhysicalGold = physicalGoldItems
    .filter((item) => item.quantity > 0 && item.unitPriceTomans > 0)
    .filter((item) => isSelected(item.id));

  const activeCrypto = cryptoAssets
    .filter((a) => (a.currentHoldingValue || 0) > 0)
    .filter((a) => isSelected(a.id));

  const totalBourseGoldValue = activeBourseGold.reduce(
    (sum, item) => sum + (item.currentValueTomans || 0),
    0
  );
  const totalPhysicalGoldValue = activePhysicalGold.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceTomans,
    0
  );
  const totalGoldValue = totalBourseGoldValue + totalPhysicalGoldValue;
  const totalCryptoValue = activeCrypto.reduce(
    (sum, a) => sum + (a.currentHoldingValue || 0),
    0
  );
  const totalPortfolioValue = totalGoldValue + totalCryptoValue;

  if (requestedAmountTomans <= 0 || totalPortfolioValue <= 0) {
    return {
      requestedAmountTomans,
      actualTotalSaleTomans: 0,
      goldSaleTomans: 0,
      cryptoSaleTomans: 0,
      physicalGoldSaleTomans: 0,
      bourseGoldSales: [],
      cryptoSales: [],
      physicalGoldSales: [],
      currentPortfolioValue: totalPortfolioValue,
      resultingPortfolioValue: totalPortfolioValue,
      resultingGoldValue: totalGoldValue,
      resultingCryptoValue: totalCryptoValue,
      resultingGoldPercent: totalPortfolioValue > 0 ? (totalGoldValue / totalPortfolioValue) * 100 : 0,
      resultingCryptoPercent: totalPortfolioValue > 0 ? (totalCryptoValue / totalPortfolioValue) * 100 : 0,
    };
  }

  // Calculate eligible selling pool based on options
  const eligibleBourseGoldValue = includeBourseGold ? totalBourseGoldValue : 0;
  const eligiblePhysicalGoldValue = includePhysicalGold ? totalPhysicalGoldValue : 0;
  const eligibleTotalGoldValue = eligibleBourseGoldValue + eligiblePhysicalGoldValue;
  const eligibleCryptoValue = includeCrypto ? totalCryptoValue : 0;
  const totalEligibleValue = eligibleTotalGoldValue + eligibleCryptoValue;

  const targetWithdrawal = Math.min(requestedAmountTomans, totalEligibleValue);
  const targetRemainingPortfolio = Math.max(0, totalPortfolioValue - targetWithdrawal);

  // Target ratios (e.g. 80% Gold, 20% Crypto)
  const targetGoldRatio = (settings.goldPercent || 80) / 100;
  const targetCryptoRatio = (settings.cryptoPercent || 20) / 100;

  let targetGoldRemaining = targetRemainingPortfolio * targetGoldRatio;
  let targetCryptoRemaining = targetRemainingPortfolio * targetCryptoRatio;

  let goldSaleAmount = 0;
  let cryptoSaleAmount = 0;

  if (includeBourseGold && includeCrypto && !includePhysicalGold) {
    // Default Balanced Mode: Sell from Bourse Gold & Crypto to maintain 80/20 balance
    // Physical gold remains untouched
    const desiredGoldSale = Math.max(0, totalGoldValue - targetGoldRemaining);
    const desiredCryptoSale = Math.max(0, totalCryptoValue - targetCryptoRemaining);

    // Bound gold sale by available bourse gold
    goldSaleAmount = Math.min(desiredGoldSale, eligibleBourseGoldValue);
    cryptoSaleAmount = Math.min(desiredCryptoSale, eligibleCryptoValue);

    // If one side can't cover its share, let the other side cover the remainder
    let remainingToCover = targetWithdrawal - (goldSaleAmount + cryptoSaleAmount);
    if (remainingToCover > 0) {
      const extraGoldAvailable = eligibleBourseGoldValue - goldSaleAmount;
      const extraCryptoAvailable = eligibleCryptoValue - cryptoSaleAmount;

      if (extraCryptoAvailable > 0) {
        const addCrypto = Math.min(remainingToCover, extraCryptoAvailable);
        cryptoSaleAmount += addCrypto;
        remainingToCover -= addCrypto;
      }
      if (remainingToCover > 0 && extraGoldAvailable > 0) {
        const addGold = Math.min(remainingToCover, extraGoldAvailable);
        goldSaleAmount += addGold;
        remainingToCover -= addGold;
      }
    }
  } else {
    // Custom / Selective Mode: Proportional or pool-based
    if (eligibleTotalGoldValue > 0 && eligibleCryptoValue > 0) {
      const goldRatioInEligible = eligibleTotalGoldValue / totalEligibleValue;
      const cryptoRatioInEligible = eligibleCryptoValue / totalEligibleValue;
      goldSaleAmount = targetWithdrawal * goldRatioInEligible;
      cryptoSaleAmount = targetWithdrawal * cryptoRatioInEligible;
    } else if (eligibleTotalGoldValue > 0) {
      goldSaleAmount = targetWithdrawal;
      cryptoSaleAmount = 0;
    } else {
      goldSaleAmount = 0;
      cryptoSaleAmount = targetWithdrawal;
    }
  }

  // 1. Calculate Bourse Gold Sales
  const bourseGoldSales: BourseGoldSellItem[] = [];
  let actualBourseGoldSaleTomans = 0;

  if (includeBourseGold && goldSaleAmount > 0 && totalBourseGoldValue > 0) {
    const boursePool = includePhysicalGold ? goldSaleAmount * (totalBourseGoldValue / (totalBourseGoldValue + totalPhysicalGoldValue || 1)) : goldSaleAmount;

    for (const item of activeBourseGold) {
      const itemVal = item.currentValueTomans || 0;
      const weightInBourse = itemVal / totalBourseGoldValue;
      const itemSaleTomans = boursePool * weightInBourse;
      const unitPrice =
        item.quote?.lastPriceTomans ||
        (item.holding?.quantity ? Math.round((item.currentValueTomans || 0) / item.holding.quantity) : 0) ||
        item.holding?.averageBuyPriceTomans ||
        35000;
      const unitsToSell = Math.min(
        Math.floor(itemSaleTomans / unitPrice),
        item.holding?.quantity || 0
      );

      if (unitsToSell > 0) {
        const saleVal = unitsToSell * unitPrice;
        bourseGoldSales.push({
          id: item.instrument.id,
          symbol: item.instrument.symbol,
          name: item.instrument.name,
          unitsToSell,
          currentUnits: item.holding?.quantity || 0,
          unitPrice,
          totalTomans: saleVal,
        });
        actualBourseGoldSaleTomans += saleVal;
      }
    }
  }

  // 2. Calculate Physical Gold Sales (if enabled)
  const physicalGoldSales: PhysicalGoldSellItem[] = [];
  let actualPhysicalGoldSaleTomans = 0;

  if (includePhysicalGold && goldSaleAmount > 0 && totalPhysicalGoldValue > 0) {
    const physPool = includeBourseGold ? goldSaleAmount * (totalPhysicalGoldValue / (totalBourseGoldValue + totalPhysicalGoldValue || 1)) : goldSaleAmount;

    for (const item of activePhysicalGold) {
      const itemVal = item.quantity * item.unitPriceTomans;
      const weightInPhys = itemVal / totalPhysicalGoldValue;
      const itemSaleTomans = physPool * weightInPhys;
      let qtyToSell = 0;

      if (item.unit === 'گرم') {
        // Grams: allow 3 decimal places
        qtyToSell = Math.min(
          Number((itemSaleTomans / item.unitPriceTomans).toFixed(3)),
          item.quantity
        );
      } else {
        // Coins: whole integer count
        qtyToSell = Math.min(
          Math.floor(itemSaleTomans / item.unitPriceTomans),
          item.quantity
        );
      }

      if (qtyToSell > 0) {
        const saleVal = Math.round(qtyToSell * item.unitPriceTomans);
        physicalGoldSales.push({
          id: item.id,
          title: item.title,
          unit: item.unit,
          quantityToSell: qtyToSell,
          currentQuantity: item.quantity,
          unitPrice: item.unitPriceTomans,
          totalTomans: saleVal,
        });
        actualPhysicalGoldSaleTomans += saleVal;
      }
    }
  }

  // 3. Calculate Crypto Sales (Proportional to internal coin target percentages)
  const cryptoSales: CryptoSellItem[] = [];
  let actualCryptoSaleTomans = 0;

  if (includeCrypto && cryptoSaleAmount > 0 && totalCryptoValue > 0) {
    const totalTargetPct = activeCrypto.reduce((sum, a) => sum + (a.targetPercent || 10), 0) || 100;
    const targetRemainingCrypto = Math.max(0, totalCryptoValue - cryptoSaleAmount);

    for (const asset of activeCrypto) {
      const normalizedTargetWeight = (asset.targetPercent || 10) / totalTargetPct;
      const desiredRemainingForCoin = targetRemainingCrypto * normalizedTargetWeight;
      const coinSaleTomans = Math.max(
        0,
        Math.min(asset.currentHoldingValue - desiredRemainingForCoin, asset.currentHoldingValue)
      );

      // Derive unit price safely
      const unitPrice =
        asset.unitPrice && asset.unitPrice > 0
          ? asset.unitPrice
          : asset.currentAmount && asset.currentAmount > 0
          ? Math.round(asset.currentHoldingValue / asset.currentAmount)
          : 1;

      let amountToSell = 0;

      if (asset.currentAmount !== undefined && asset.currentAmount > 0) {
        amountToSell = Math.min(
          Number((coinSaleTomans / unitPrice).toFixed(6)),
          asset.currentAmount
        );
      }

      const totalSaleValue =
        amountToSell > 0 && asset.currentAmount
          ? Math.round(amountToSell * unitPrice)
          : Math.round(coinSaleTomans);

      if (totalSaleValue > 0) {
        cryptoSales.push({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          amountToSell,
          currentAmount: asset.currentAmount,
          currentHoldingValue: asset.currentHoldingValue,
          unitPrice,
          totalTomans: totalSaleValue,
          color: asset.color,
          targetPercent: asset.targetPercent,
        });
        actualCryptoSaleTomans += totalSaleValue;
      }
    }
  }

  const actualTotalSaleTomans =
    actualBourseGoldSaleTomans + actualPhysicalGoldSaleTomans + actualCryptoSaleTomans;
  const actualGoldSaleTomans = actualBourseGoldSaleTomans + actualPhysicalGoldSaleTomans;

  const resultingGoldValue = Math.max(0, totalGoldValue - actualGoldSaleTomans);
  const resultingCryptoValue = Math.max(0, totalCryptoValue - actualCryptoSaleTomans);
  const resultingPortfolioValue = resultingGoldValue + resultingCryptoValue;

  const resultingGoldPercent =
    resultingPortfolioValue > 0 ? (resultingGoldValue / resultingPortfolioValue) * 100 : 0;
  const resultingCryptoPercent =
    resultingPortfolioValue > 0 ? (resultingCryptoValue / resultingPortfolioValue) * 100 : 0;

  return {
    requestedAmountTomans,
    actualTotalSaleTomans,
    goldSaleTomans: actualGoldSaleTomans,
    cryptoSaleTomans: actualCryptoSaleTomans,
    physicalGoldSaleTomans: actualPhysicalGoldSaleTomans,
    bourseGoldSales,
    cryptoSales,
    physicalGoldSales,
    currentPortfolioValue: totalPortfolioValue,
    resultingPortfolioValue,
    resultingGoldValue,
    resultingCryptoValue,
    resultingGoldPercent,
    resultingCryptoPercent,
  };
}
