import { MarketInstrument, UserMarketHolding, MarketQuote, MarketStatus } from '../services/marketData/types';

export * from '../services/marketData/types';

export interface CryptoAsset {
  id: string;
  name: string;
  symbol: string;
  targetPercent: number; // e.g., 25 for 25%
  currentHoldingValue: number; // in Tomans
  currentAmount?: number; // coin amount (optional)
  unitPrice?: number; // unit price in Tomans (optional)
  averageBuyPrice?: number; // average purchase price in Tomans (optional)
  totalCostTomans?: number; // total purchase cost in Tomans (optional)
  profitTomans?: number; // net profit/loss amount in Tomans (optional)
  profitPercent?: number; // net profit/loss percentage (optional)
  color: string;
  isDefault?: boolean;
}

export type PhysicalGoldType =
  | 'gold_18k'
  | 'gold_24k'
  | 'coin_emami'
  | 'coin_bahar'
  | 'coin_half'
  | 'coin_quarter'
  | 'coin_gram';

export interface PhysicalGoldBuyLot {
  id: string;
  goldType: PhysicalGoldType;
  quantity: number; // e.g. grams or coin count
  purchaseUnitPriceTomans: number; // unit cost in Tomans
  purchaseDate: string; // ISO string or Persian date
  totalCostTomans: number; // quantity * purchaseUnitPriceTomans
  notes?: string;
}

export interface PhysicalGoldSaleRecord {
  id: string;
  goldType: PhysicalGoldType;
  title: string;
  quantitySold: number;
  unitCostBasisTomans: number;
  saleUnitPriceTomans: number;
  totalCostTomans: number;
  totalRevenueTomans: number;
  realizedProfitTomans: number;
  realizedProfitPercent: number;
  saleDate: string;
  persianDate: string;
  notes?: string;
}

export interface PhysicalGoldItem {
  id: PhysicalGoldType;
  title: string;
  unit: 'گرم' | 'عدد';
  quantity: number; // e.g. 15.5 grams or 2 coins
  unitPriceTomans: number; // live or user-custom price per unit in Tomans
  priceChangePercent?: number; // 24h change
  lastFetchedAt?: number;
  isCustomPrice?: boolean; // If user manually overridden the price
  averageBuyPriceTomans?: number; // Weighted average cost per unit
  totalCostTomans?: number; // Total purchase cost of currently owned quantity
  buyLots?: PhysicalGoldBuyLot[];
}

export type PropertyType = 'residential' | 'commercial' | 'land' | 'office' | 'other';

export interface PropertyItem {
  id: string;
  title: string;
  type: PropertyType;
  areaSquareMeters: number;
  purchaseDate: string;
  purchasePriceRial: number;
  currentValuationRial: number;
  currentValuationUsd: number;
  notes?: string;
  includeInTotalNetWorth: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface GoldHolding {
  currentHoldingValue: number; // in Tomans
  currentGrams?: number; // in grams
  pricePerGram?: number; // in Tomans per gram
}

export interface AppSettings {
  savingsPercent: number; // default 30%
  goldPercent: number; // default 80% (of savings)
  cryptoPercent: number; // default 20% (of savings)
  calculationMode: 'rebalance' | 'direct'; // rebalance vs direct split
  currencyUnit: 'toman' | 'rial';
  goldPricePerGram: number; // e.g. 5,000,000 Tomans
}

export interface CalculatedCryptoBuy {
  id: string;
  symbol: string;
  name: string;
  targetPercent: number;
  currentHoldingValue: number;
  suggestedBuy: number; // in Tomans
  finalHoldingValue: number;
  finalPercent: number;
  color: string;
}

export interface CalculationResult {
  totalInputAmount: number; // Total user input
  totalSavingsAmount: number; // 30% of total
  goldBuyAmount: number; // 80% of savings (adjusted in rebalance)
  cryptoBuyAmount: number; // 20% of savings (adjusted in rebalance)
  cryptoBuys: CalculatedCryptoBuy[];
  totalCryptoBuySuggested: number;
  newTotalPortfolioValue: number;
}

export interface TransactionRecord {
  id: string;
  date: string; // ISO string
  persianDate: string;
  totalInputAmount: number;
  totalSavingsAmount: number;
  goldBuyAmount: number;
  cryptoBuyAmount: number;
  cryptoBuys: {
    symbol: string;
    name: string;
    amount: number;
  }[];
  appliedToHoldings: boolean;
}

export interface AppBackupData {
  version: number | string;
  exportDate: string;
  cryptoAssets: CryptoAsset[];
  goldHolding: GoldHolding;
  physicalGold?: PhysicalGoldItem[];
  properties?: PropertyItem[];
  goldBuyLots?: PhysicalGoldBuyLot[];
  physicalGoldSales?: PhysicalGoldSaleRecord[];
  settings: AppSettings;
  transactions: TransactionRecord[];
  marketInstruments?: MarketInstrument[];
  marketHoldings?: UserMarketHolding[];
}

export type ActiveTab =
  | 'dashboard'
  | 'gold'
  | 'crypto'
  | 'holdings'
  | 'properties'
  | 'sell'
  | 'settings'
  | 'history'
  | 'calculator'
  | 'market';
