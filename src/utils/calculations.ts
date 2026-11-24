import { AppSettings, CalculatedCryptoBuy, CalculationResult, CryptoAsset, GoldHolding } from '../types/investment';

/**
 * Distribute integer budget using Largest Remainder Method (Hamilton/Hare-Niemeyer method).
 * Guarantees exact sum matching and zero floating-point artifacts.
 */
function distributeIntegerBudget(
  items: { id: string; rawBuy: number }[],
  totalBudget: number
): { id: string; suggestedBuy: number }[] {
  if (!Number.isFinite(totalBudget) || totalBudget <= 0 || items.length === 0) {
    return items.map((item) => ({ id: item.id, suggestedBuy: 0 }));
  }

  const intBudget = Math.round(totalBudget);
  const floors = items.map((item) => {
    const safeRaw = Number.isFinite(item.rawBuy) && item.rawBuy > 0 ? item.rawBuy : 0;
    const floored = Math.floor(safeRaw);
    return {
      id: item.id,
      floor: floored,
      remainder: safeRaw - floored,
    };
  });

  const currentFloorSum = floors.reduce((sum, item) => sum + item.floor, 0);
  let diff = intBudget - currentFloorSum;

  if (diff > 0) {
    // Sort by remainder descending
    const sortedIndices = floors
      .map((item, idx) => ({ idx, remainder: item.remainder }))
      .sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < diff; i++) {
      const targetIdx = sortedIndices[i % sortedIndices.length].idx;
      floors[targetIdx].floor += 1;
    }
  } else if (diff < 0) {
    // Over-allocated due to rounding: reduce from items with lowest remainder and > 0 floor
    const sortedIndices = floors
      .map((item, idx) => ({ idx, remainder: item.remainder, floor: item.floor }))
      .filter((item) => item.floor > 0)
      .sort((a, b) => a.remainder - b.remainder);

    let toReduce = Math.abs(diff);
    for (let i = 0; i < toReduce && sortedIndices.length > 0; i++) {
      const targetIdx = sortedIndices[i % sortedIndices.length].idx;
      if (floors[targetIdx].floor > 0) {
        floors[targetIdx].floor -= 1;
      }
    }
  }

  return floors.map((item) => ({
    id: item.id,
    suggestedBuy: Math.max(0, item.floor),
  }));
}

/**
 * Waterfilling / iterative rebalancing algorithm for buy-only allocation.
 * Guarantees that:
 * 1. No buy amount is negative (buy-only, no forced selling).
 * 2. Total allocated equals totalBudget exactly.
 * 3. Weights converge towards target ratios as closely as possible.
 */
export function calculateRebalancedBuys(
  assets: { id: string; targetWeight: number; currentValue: number }[],
  totalBudget: number
): { id: string; suggestedBuy: number }[] {
  const safeBudget = Number.isFinite(totalBudget) ? totalBudget : 0;
  if (safeBudget <= 0) {
    return assets.map((a) => ({ id: a.id, suggestedBuy: 0 }));
  }

  const n = assets.length;
  if (n === 0) return [];

  const safeNum = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

  // Normalize target weights
  const totalWeight = assets.reduce((sum, a) => sum + safeNum(a.targetWeight), 0);
  if (totalWeight <= 0) {
    // If no valid weights, split equally
    const equalShare = safeBudget / n;
    return distributeIntegerBudget(
      assets.map((a) => ({ id: a.id, rawBuy: equalShare })),
      safeBudget
    );
  }

  const normalized = assets.map((a) => ({
    ...a,
    currentValue: safeNum(a.currentValue),
    weight: safeNum(a.targetWeight) / totalWeight,
    buy: 0,
    locked: false,
  }));

  const remainingBudget = safeBudget;
  let activeAssets = [...normalized];

  // Iterative waterfilling
  for (let iteration = 0; iteration < n; iteration++) {
    const activeWeightSum = activeAssets.reduce((sum, a) => sum + a.weight, 0);
    if (activeWeightSum <= 0) break;

    const currentTotalValue = activeAssets.reduce((sum, a) => sum + a.currentValue, 0);
    const targetTotalValue = currentTotalValue + remainingBudget;

    let hasOverweight = false;

    for (const asset of activeAssets) {
      const idealTargetValue = targetTotalValue * (asset.weight / activeWeightSum);
      const rawBuy = idealTargetValue - asset.currentValue;

      if (rawBuy < 0) {
        // Asset already has more than its target share in this subset
        asset.buy = 0;
        asset.locked = true;
        hasOverweight = true;
      }
    }

    if (hasOverweight) {
      // Re-filter active assets and re-allocate remaining budget to underweight ones
      activeAssets = normalized.filter((a) => !a.locked);
      if (activeAssets.length === 0) break;
    } else {
      // All remaining active assets can take positive buys
      for (const asset of activeAssets) {
        const idealTargetValue = targetTotalValue * (asset.weight / activeWeightSum);
        asset.buy = Math.max(0, idealTargetValue - asset.currentValue);
      }
      break;
    }
  }

  return distributeIntegerBudget(
    normalized.map((a) => ({ id: a.id, rawBuy: a.buy })),
    totalBudget
  );
}

/**
 * Direct allocation (simple percentage split of the new budget).
 */
export function calculateDirectBuys(
  assets: { id: string; targetWeight: number }[],
  totalBudget: number
): { id: string; suggestedBuy: number }[] {
  const safeBudget = Number.isFinite(totalBudget) ? totalBudget : 0;
  if (safeBudget <= 0 || assets.length === 0) {
    return assets.map((a) => ({ id: a.id, suggestedBuy: 0 }));
  }

  const safeWeight = (w: number) => (Number.isFinite(w) && w > 0 ? w : 0);
  const totalWeight = assets.reduce((sum, a) => sum + safeWeight(a.targetWeight), 0);
  if (totalWeight <= 0) {
    const share = safeBudget / assets.length;
    return distributeIntegerBudget(
      assets.map((a) => ({ id: a.id, rawBuy: share })),
      safeBudget
    );
  }

  const rawAllocations = assets.map((a) => ({
    id: a.id,
    rawBuy: (safeWeight(a.targetWeight) / totalWeight) * safeBudget,
  }));

  return distributeIntegerBudget(rawAllocations, safeBudget);
}

/**
 * Main portfolio investment calculator.
 */
export function calculatePortfolioAllocation(
  inputAmount: number,
  settings: AppSettings,
  cryptoAssets: CryptoAsset[],
  goldHolding: GoldHolding
): CalculationResult {
  const safeNum = (v: number | undefined | null) =>
    v !== undefined && v !== null && Number.isFinite(v) && v > 0 ? v : 0;

  const totalInputAmount = safeNum(inputAmount);
  const isDirect = settings.capitalInputMode === 'direct';
  const rawSavings = Number.isFinite(settings.savingsPercent) ? settings.savingsPercent : 30;
  const savingsPct = isDirect ? 100 : Math.min(100, Math.max(0, rawSavings));
  const totalSavingsAmount = isDirect ? totalInputAmount : Math.round(totalInputAmount * (savingsPct / 100));

  let goldBuyAmount = 0;
  let cryptoBuyAmount = 0;

  const currentGoldVal = safeNum(goldHolding?.currentHoldingValue);
  const currentCryptoTotalVal = cryptoAssets.reduce(
    (sum, c) => sum + safeNum(c.currentHoldingValue),
    0
  );

  const targetGoldWeight = safeNum(settings.goldPercent);
  const targetCryptoWeight = safeNum(settings.cryptoPercent);
  const topTotalWeight = targetGoldWeight + targetCryptoWeight;

  const effectiveGoldWeight = topTotalWeight > 0 ? targetGoldWeight : 80;
  const effectiveCryptoWeight = topTotalWeight > 0 ? targetCryptoWeight : 20;

  if (settings.calculationMode === 'rebalance') {
    // Rebalance Gold vs Crypto
    const topLevelAllocations = calculateRebalancedBuys(
      [
        { id: 'gold', targetWeight: effectiveGoldWeight, currentValue: currentGoldVal },
        { id: 'crypto', targetWeight: effectiveCryptoWeight, currentValue: currentCryptoTotalVal },
      ],
      totalSavingsAmount
    );

    goldBuyAmount = topLevelAllocations.find((a) => a.id === 'gold')?.suggestedBuy || 0;
    cryptoBuyAmount = topLevelAllocations.find((a) => a.id === 'crypto')?.suggestedBuy || 0;
  } else {
    // Direct percentage split
    const topAllocations = calculateDirectBuys(
      [
        { id: 'gold', targetWeight: effectiveGoldWeight },
        { id: 'crypto', targetWeight: effectiveCryptoWeight },
      ],
      totalSavingsAmount
    );
    goldBuyAmount = topAllocations.find((a) => a.id === 'gold')?.suggestedBuy || 0;
    cryptoBuyAmount = topAllocations.find((a) => a.id === 'crypto')?.suggestedBuy || 0;
  }

  // Allocate Crypto among individual crypto assets (strategy coins only —
  // holdings-only belongings always get a 0 buy suggestion until opted in)
  const strategyCoins = cryptoAssets.filter((c) => !c.isHoldingOnly);
  let cryptoBuysList: { id: string; suggestedBuy: number }[] = [];

  if (strategyCoins.length === 0) {
    cryptoBuysList = [];
  } else if (settings.calculationMode === 'rebalance') {
    cryptoBuysList = calculateRebalancedBuys(
      strategyCoins.map((c) => ({
        id: c.id,
        targetWeight: c.targetPercent || 0,
        currentValue: Math.max(0, c.currentHoldingValue || 0),
      })),
      cryptoBuyAmount
    );
  } else {
    cryptoBuysList = calculateDirectBuys(
      strategyCoins.map((c) => ({
        id: c.id,
        targetWeight: c.targetPercent || 0,
      })),
      cryptoBuyAmount
    );
  }

  const buyMap = new Map(cryptoBuysList.map((b) => [b.id, b.suggestedBuy]));
  const finalCryptoTotal = currentCryptoTotalVal + cryptoBuyAmount;

  const calculatedCryptoBuys: CalculatedCryptoBuy[] = cryptoAssets.map((asset) => {
    const buy = asset.isHoldingOnly ? 0 : buyMap.get(asset.id) || 0;
    const current = Math.max(0, asset.currentHoldingValue || 0);
    const finalVal = current + buy;
    const finalPercent = finalCryptoTotal > 0 ? (finalVal / finalCryptoTotal) * 100 : asset.targetPercent;

    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      targetPercent: asset.targetPercent,
      currentHoldingValue: current,
      suggestedBuy: buy,
      finalHoldingValue: finalVal,
      finalPercent,
      color: asset.color,
      isHoldingOnly: asset.isHoldingOnly,
    };
  });

  const totalCryptoBuySuggested = calculatedCryptoBuys.reduce(
    (sum, c) => sum + c.suggestedBuy,
    0
  );

  const newTotalPortfolioValue =
    currentGoldVal + currentCryptoTotalVal + goldBuyAmount + totalCryptoBuySuggested;

  return {
    totalInputAmount,
    totalSavingsAmount,
    goldBuyAmount,
    cryptoBuyAmount,
    cryptoBuys: calculatedCryptoBuys,
    totalCryptoBuySuggested,
    newTotalPortfolioValue,
  };
}

/**
 * Calculates target portfolio percentages for the 3-bucket risk system:
 * 1. Low Risk (Vehicles, Real Estate, Cash Dollar) = user's age (e.g. 20 years = 20%)
 * 2. High Risk (Crypto) = based on risk tolerance:
 *    - 'conservative': 8%
 *    - 'moderate': 11%
 *    - 'aggressive': 15%
 * 3. Medium Risk (Gold & Bourse Stocks) = remaining percentage (100 - lowRisk - highRisk)
 *
 * Age is clamped between 5 and 85 to ensure valid positive allocations.
 */
export function calculateRiskBuckets(
  age: number,
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): {
  lowRiskPercent: number;
  mediumRiskPercent: number;
  highRiskPercent: number;
} {
  const numericAge = Number(age);
  const safeAge =
    Number.isFinite(numericAge) && numericAge !== 0
      ? Math.max(5, Math.min(85, Math.round(numericAge)))
      : 25;

  let highRiskPercent = 11;
  if (riskTolerance === 'conservative') {
    highRiskPercent = 8;
  } else if (riskTolerance === 'aggressive') {
    highRiskPercent = 15;
  }

  // Low risk is equal to age
  let lowRiskPercent = safeAge;

  // Guarantee that lowRisk + highRisk <= 95% so medium risk has at least 5%
  if (lowRiskPercent + highRiskPercent > 95) {
    lowRiskPercent = 95 - highRiskPercent;
  }

  const mediumRiskPercent = Math.max(0, 100 - lowRiskPercent - highRiskPercent);

  return {
    lowRiskPercent,
    mediumRiskPercent,
    highRiskPercent,
  };
}

