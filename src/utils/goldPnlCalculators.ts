import { PhysicalGoldItem, PhysicalGoldType, PhysicalGoldBuyLot, PhysicalGoldSaleRecord } from '../types/investment';
import { getPersianFormattedDate } from './formatters';

export interface GoldItemPnlResult {
  goldType: PhysicalGoldType;
  title: string;
  unit: string;
  quantity: number;
  currentUnitPriceTomans: number;
  currentValueTomans: number;
  totalCostBasisTomans: number;
  weightedAverageCostTomans: number;
  unrealizedProfitTomans: number;
  unrealizedProfitPercent: number;
  hasCostBasis: boolean;
  lotsCount: number;
}

export interface TotalGoldPnlResult {
  totalCurrentValueTomans: number;
  totalCostBasisTomans: number;
  totalUnrealizedProfitTomans: number;
  totalUnrealizedProfitPercent: number;
  hasAnyCostBasis: boolean;
  itemPnlList: GoldItemPnlResult[];
}

/**
 * Calculates unrealized P&L for a single physical gold item based on its purchase lots or manual average cost.
 */
export function calculateGoldItemPnl(
  item: PhysicalGoldItem,
  allLots: PhysicalGoldBuyLot[] = []
): GoldItemPnlResult {
  const itemLots = allLots.filter((lot) => lot.goldType === item.id);
  const currentUnitPrice = item.unitPriceTomans || 0;
  const currentQuantity = item.quantity || 0;
  const currentValueTomans = currentQuantity * currentUnitPrice;

  let totalCostBasisTomans = 0;
  let weightedAverageCostTomans = 0;
  let hasCostBasis = false;

  if (itemLots.length > 0) {
    const totalLotsQuantity = itemLots.reduce((sum, l) => sum + (l.quantity || 0), 0);
    const totalLotsCost = itemLots.reduce((sum, l) => sum + (l.totalCostTomans || l.quantity * l.purchaseUnitPriceTomans), 0);

    if (totalLotsQuantity > 0 && totalLotsCost > 0) {
      weightedAverageCostTomans = Math.round(totalLotsCost / totalLotsQuantity);
      totalCostBasisTomans = Math.round(currentQuantity * weightedAverageCostTomans);
      hasCostBasis = true;
    }
  } else if (item.averageBuyPriceTomans && item.averageBuyPriceTomans > 0) {
    weightedAverageCostTomans = item.averageBuyPriceTomans;
    totalCostBasisTomans = Math.round(currentQuantity * item.averageBuyPriceTomans);
    hasCostBasis = true;
  } else if (item.totalCostTomans && item.totalCostTomans > 0 && currentQuantity > 0) {
    totalCostBasisTomans = item.totalCostTomans;
    weightedAverageCostTomans = Math.round(item.totalCostTomans / currentQuantity);
    hasCostBasis = true;
  }

  const unrealizedProfitTomans = hasCostBasis ? currentValueTomans - totalCostBasisTomans : 0;
  const unrealizedProfitPercent =
    hasCostBasis && totalCostBasisTomans > 0
      ? (unrealizedProfitTomans / totalCostBasisTomans) * 100
      : 0;

  return {
    goldType: item.id,
    title: item.title,
    unit: item.unit,
    quantity: currentQuantity,
    currentUnitPriceTomans: currentUnitPrice,
    currentValueTomans,
    totalCostBasisTomans,
    weightedAverageCostTomans,
    unrealizedProfitTomans,
    unrealizedProfitPercent,
    hasCostBasis,
    lotsCount: itemLots.length,
  };
}

/**
 * Calculates aggregate unrealized P&L across all physical gold & coin items.
 */
export function calculateTotalPhysicalGoldPnl(
  items: PhysicalGoldItem[],
  allLots: PhysicalGoldBuyLot[] = []
): TotalGoldPnlResult {
  const itemPnlList = items.map((item) => calculateGoldItemPnl(item, allLots));

  let totalCurrentValueTomans = 0;
  let totalCostBasisTomans = 0;
  let hasAnyCostBasis = false;

  for (const pnl of itemPnlList) {
    totalCurrentValueTomans += pnl.currentValueTomans;
    if (pnl.hasCostBasis && pnl.quantity > 0) {
      totalCostBasisTomans += pnl.totalCostBasisTomans;
      hasAnyCostBasis = true;
    }
  }

  const totalUnrealizedProfitTomans = hasAnyCostBasis
    ? totalCurrentValueTomans - totalCostBasisTomans
    : 0;
  const totalUnrealizedProfitPercent =
    hasAnyCostBasis && totalCostBasisTomans > 0
      ? (totalUnrealizedProfitTomans / totalCostBasisTomans) * 100
      : 0;

  return {
    totalCurrentValueTomans,
    totalCostBasisTomans,
    totalUnrealizedProfitTomans,
    totalUnrealizedProfitPercent,
    hasAnyCostBasis,
    itemPnlList,
  };
}

/**
 * Processes a gold sale / deduction:
 * 1. Computes weighted average cost basis
 * 2. Computes realized profit / loss (amount and %)
 * 3. Creates an immutable PhysicalGoldSaleRecord
 * 4. Deducts lots using FIFO or weighted reduction
 */
export function processGoldSale(
  item: PhysicalGoldItem,
  quantitySold: number,
  saleUnitPriceTomans: number,
  allLots: PhysicalGoldBuyLot[] = [],
  notes?: string
): {
  saleRecord: PhysicalGoldSaleRecord;
  updatedLots: PhysicalGoldBuyLot[];
} {
  const safeQtySold = Math.max(0, quantitySold);
  const safeSaleUnitPrice = saleUnitPriceTomans > 0 ? saleUnitPriceTomans : item.unitPriceTomans || 0;
  const totalRevenueTomans = Math.round(safeQtySold * safeSaleUnitPrice);

  const itemLots = allLots.filter((lot) => lot.goldType === item.id);
  const otherLots = allLots.filter((lot) => lot.goldType !== item.id);

  let unitCostBasis = item.unitPriceTomans || safeSaleUnitPrice;
  let remainingQtyToDeduct = safeQtySold;
  const updatedItemLots: PhysicalGoldBuyLot[] = [];

  if (itemLots.length > 0) {
    const totalLotsQty = itemLots.reduce((sum, l) => sum + l.quantity, 0);
    const totalLotsCost = itemLots.reduce((sum, l) => sum + (l.totalCostTomans || l.quantity * l.purchaseUnitPriceTomans), 0);

    if (totalLotsQty > 0) {
      unitCostBasis = Math.round(totalLotsCost / totalLotsQty);
    }

    // FIFO deduction from lots
    for (const lot of itemLots) {
      if (remainingQtyToDeduct <= 0) {
        updatedItemLots.push(lot);
      } else if (lot.quantity <= remainingQtyToDeduct) {
        remainingQtyToDeduct -= lot.quantity;
        // Lot completely exhausted, do not keep
      } else {
        const newLotQty = Number((lot.quantity - remainingQtyToDeduct).toFixed(3));
        const newLotCost = Math.round(newLotQty * lot.purchaseUnitPriceTomans);
        remainingQtyToDeduct = 0;
        updatedItemLots.push({
          ...lot,
          quantity: newLotQty,
          totalCostTomans: newLotCost,
        });
      }
    }
  } else if (item.averageBuyPriceTomans && item.averageBuyPriceTomans > 0) {
    unitCostBasis = item.averageBuyPriceTomans;
  }

  const totalCostBasisTomans = Math.round(safeQtySold * unitCostBasis);
  const realizedProfitTomans = totalRevenueTomans - totalCostBasisTomans;
  const realizedProfitPercent =
    totalCostBasisTomans > 0 ? (realizedProfitTomans / totalCostBasisTomans) * 100 : 0;

  const now = new Date();
  const saleRecord: PhysicalGoldSaleRecord = {
    id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    goldType: item.id,
    title: item.title,
    quantitySold: safeQtySold,
    unitCostBasisTomans: unitCostBasis,
    saleUnitPriceTomans: safeSaleUnitPrice,
    totalCostTomans: totalCostBasisTomans,
    totalRevenueTomans,
    realizedProfitTomans,
    realizedProfitPercent,
    saleDate: now.toISOString(),
    persianDate: getPersianFormattedDate(now),
    notes,
  };

  return {
    saleRecord,
    updatedLots: [...otherLots, ...updatedItemLots],
  };
}
