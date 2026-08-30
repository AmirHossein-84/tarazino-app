import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGoldItemPnl,
  calculateTotalPhysicalGoldPnl,
  processGoldSale,
} from '../../src/utils/goldPnlCalculators';
import { PhysicalGoldItem, PhysicalGoldBuyLot } from '../../src/types/investment';

describe('Physical Gold & Coins P&L Engine', () => {
  const item18k: PhysicalGoldItem = {
    id: 'gold_18k',
    title: 'طلای ۱۸ عیار',
    unit: 'گرم',
    quantity: 25, // 25 grams currently owned
    unitPriceTomans: 5000000, // 5M current live price
  };

  const coinEmami: PhysicalGoldItem = {
    id: 'coin_emami',
    title: 'سکه تمام امامی',
    unit: 'عدد',
    quantity: 2, // 2 coins
    unitPriceTomans: 55000000, // 55M per coin -> 110M
    averageBuyPriceTomans: 50000000, // 50M cost -> 100M cost
  };

  const buyLots: PhysicalGoldBuyLot[] = [
    {
      id: 'lot_1',
      goldType: 'gold_18k',
      quantity: 10,
      purchaseUnitPriceTomans: 4000000, // 10g @ 4M = 40M
      purchaseDate: '2026-01-01',
      totalCostTomans: 40000000,
    },
    {
      id: 'lot_2',
      goldType: 'gold_18k',
      quantity: 15,
      purchaseUnitPriceTomans: 4500000, // 15g @ 4.5M = 67.5M
      purchaseDate: '2026-02-01',
      totalCostTomans: 67500000,
    },
  ];

  it('calculates weighted average cost basis and unrealized profit accurately', () => {
    // Total lots cost = 40M + 67.5M = 107.5M for 25g
    // Weighted average cost = 107.5M / 25 = 4,300,000 Tomans/g
    // Current value = 25 * 5M = 125M
    // Unrealized profit = 125M - 107.5M = 17,500,000 Tomans
    // Unrealized profit % = (17.5M / 107.5M) * 100 = 16.279%
    const pnl = calculateGoldItemPnl(item18k, buyLots);

    assert.equal(pnl.quantity, 25);
    assert.equal(pnl.currentUnitPriceTomans, 5000000);
    assert.equal(pnl.currentValueTomans, 125000000);
    assert.equal(pnl.weightedAverageCostTomans, 4300000);
    assert.equal(pnl.totalCostBasisTomans, 107500000);
    assert.equal(pnl.unrealizedProfitTomans, 17500000);
    assert.ok(Math.abs(pnl.unrealizedProfitPercent - 16.279) < 0.01);
    assert.equal(pnl.hasCostBasis, true);
    assert.equal(pnl.lotsCount, 2);
  });

  it('calculates aggregate portfolio gold P&L combining lots and manual average costs', () => {
    const totalPnl = calculateTotalPhysicalGoldPnl([item18k, coinEmami], buyLots);

    // 18k: Value = 125M, Cost = 107.5M, Profit = 17.5M
    // Emami: Value = 110M, Cost = 100M, Profit = 10M
    // Total Value = 235M, Total Cost = 207.5M, Total Profit = 27.5M
    assert.equal(totalPnl.totalCurrentValueTomans, 235000000);
    assert.equal(totalPnl.totalCostBasisTomans, 207500000);
    assert.equal(totalPnl.totalUnrealizedProfitTomans, 27500000);
    assert.equal(totalPnl.hasAnyCostBasis, true);
    assert.equal(totalPnl.itemPnlList.length, 2);
  });

  it('processes gold sale using FIFO lot deduction and realizes exact profit in ledger', () => {
    // Selling 15 grams of 18k gold at 5,200,000 Tomans/g.
    // FIFO deduction:
    // Lot 1 (10g @ 4.0M): fully exhausted (cost = 40M)
    // Lot 2 (15g @ 4.5M): 5g deducted (cost = 22.5M), 10g remaining @ 4.5M = 45M
    // Total sold cost basis = 40M + 22.5M = 62.5M
    // Unit cost basis = Math.round(62.5M / 15) = 4,166,667 Tomans/g
    // Recorded total cost basis = 15 * 4,166,667 = 62,500,005 Tomans
    // Total revenue = 15 * 5.2M = 78,000,000 Tomans
    // Realized profit = 78,000,000 - 62,500,005 = 15,499,995 Tomans
    const saleResult = processGoldSale(item18k, 15, 5200000, buyLots, 'فروش پله اول برای نوسان‌گیری');

    assert.equal(saleResult.saleRecord.quantitySold, 15);
    assert.equal(saleResult.saleRecord.unitCostBasisTomans, 4166667);
    assert.equal(saleResult.saleRecord.totalRevenueTomans, 78000000);
    assert.equal(saleResult.saleRecord.totalCostTomans, 62500005);
    assert.equal(saleResult.saleRecord.realizedProfitTomans, 15499995);
    assert.ok(Math.abs(saleResult.saleRecord.realizedProfitPercent - 24.8) < 0.01);
    assert.equal(saleResult.saleRecord.notes, 'فروش پله اول برای نوسان‌گیری');

    // Check remaining lots
    const remainingLots = saleResult.updatedLots.filter((l) => l.goldType === 'gold_18k');
    assert.equal(remainingLots.length, 1);
    assert.equal(remainingLots[0].id, 'lot_2');
    assert.equal(remainingLots[0].quantity, 10);
    assert.equal(remainingLots[0].totalCostTomans, 45000000);
  });
});
