import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Edit3,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  CryptoAsset,
  PhysicalGoldItem,
  PhysicalGoldType,
  PhysicalGoldBuyLot,
  PhysicalGoldSaleRecord,
} from '../../types/investment';
import { useMarketData } from '../../hooks/useMarketData';
import { formatToman, formatPercent, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { AddAssetModal } from './AddAssetModal';
import { EditAssetModal } from './EditAssetModal';
import { NobitexIntegrationCard } from '../crypto/NobitexIntegrationCard';
import { PhysicalGoldSection } from './PhysicalGoldSection';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';

interface HoldingsManagerProps {
  cryptoAssets: CryptoAsset[];
  updateCryptoAssets: (assets: CryptoAsset[]) => void;
  addCryptoAsset: (asset: Omit<CryptoAsset, 'id'>) => void;
  editCryptoAsset: (id: string, updates: Partial<CryptoAsset>) => void;
  removeCryptoAsset: (id: string) => void;
  physicalGoldItems?: PhysicalGoldItem[];
  totalPhysicalGoldValueTomans?: number;
  isRefreshingGold?: boolean;
  isGoldFetchError?: boolean;
  goldBuyLots?: PhysicalGoldBuyLot[];
  physicalGoldSales?: PhysicalGoldSaleRecord[];
  currencyMode?: CurrencyDisplayMode;
  formatCurrency?: (amountTomans: number, options?: any) => string;
  toDisplayValue?: (amountTomans: number) => number;
  onRefreshPhysicalGold?: () => Promise<void>;
  onUpdatePhysicalGoldQuantity?: (id: PhysicalGoldType, quantity: number) => void;
  onUpdatePhysicalGoldPrice?: (id: PhysicalGoldType, priceTomans: number, isCustom: boolean) => void;
  onAddGoldBuyLot?: (lot: Omit<PhysicalGoldBuyLot, 'id' | 'totalCostTomans'>) => void;
  onDeleteGoldSale?: (id: string) => void;
  onClearGoldSales?: () => void;
  onNavigateToCalculator: () => void;
  onNavigateToMarket?: () => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const HoldingsManager: React.FC<HoldingsManagerProps> = ({
  cryptoAssets,
  updateCryptoAssets,
  addCryptoAsset,
  editCryptoAsset,
  removeCryptoAsset,
  physicalGoldItems = [],
  totalPhysicalGoldValueTomans = 0,
  isRefreshingGold = false,
  isGoldFetchError = false,
  goldBuyLots = [],
  physicalGoldSales = [],
  currencyMode = 'toman',
  formatCurrency = (v, opts) => `${formatToman(v)} ${opts?.isTomanSuffix ? 'ت' : 'تومان'}`,
  toDisplayValue = (v) => v,
  onRefreshPhysicalGold = async () => {},
  onUpdatePhysicalGoldQuantity = () => {},
  onUpdatePhysicalGoldPrice = () => {},
  onAddGoldBuyLot,
  onDeleteGoldSale,
  onClearGoldSales,
  onNavigateToCalculator,
  onNavigateToMarket,
  onNotify,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CryptoAsset | null>(null);

  const { combinedItems, totalMarketValueTomans } = useMarketData();

  // Find gold items in TSETMC holdings
  const goldItems = combinedItems.filter(
    (item) =>
      item.instrument.assetType === 'etf' ||
      item.instrument.symbol.includes('عیار') ||
      item.instrument.symbol.includes('طلا') ||
      item.instrument.symbol.includes('کهربا') ||
      item.instrument.symbol.includes('زر')
  );

  const totalCryptoValue = cryptoAssets.reduce(
    (sum, a) => sum + (a.currentHoldingValue || 0),
    0
  );

  return (
    <div className="space-y-4">
      
      {/* Tab Header Banner */}
      <div className="glass-card p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-base font-black text-slate-100">
              مدیریت موجودی دارایی‌های فعلی (Holdings)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            موجودی طلای فیزیکی و سکه، صندوق‌های بورسی (TSETMC) و ارزهای دیجیتال خود را مدیریت کنید.
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            onNavigateToCalculator();
          }}
          className="self-stretch sm:self-auto py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-gold-400 hover:text-gold-300 border border-gold-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all interactive-tap touch-target"
        >
          <span>مشاهده محاسبات خرید</span>
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        </button>
      </div>

      {/* 1. PHYSICAL GOLD & COINS SECTION */}
      <PhysicalGoldSection
        items={physicalGoldItems}
        totalValueTomans={totalPhysicalGoldValueTomans}
        isRefreshing={isRefreshingGold}
        isGoldFetchError={isGoldFetchError}
        currencyMode={currencyMode}
        formatCurrency={formatCurrency}
        goldBuyLots={goldBuyLots}
        physicalGoldSales={physicalGoldSales}
        onRefresh={onRefreshPhysicalGold}
        onUpdateQuantity={onUpdatePhysicalGoldQuantity}
        onUpdatePrice={onUpdatePhysicalGoldPrice}
        onAddGoldBuyLot={onAddGoldBuyLot}
        onDeleteGoldSale={onDeleteGoldSale}
        onClearGoldSales={onClearGoldSales}
        onNotify={onNotify}
      />

      {/* 2. TSETMC GOLD SECTION */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border border-gold-500/30 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-gold-400 flex items-center justify-center font-bold text-lg">
              📈
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100">
                موجودی طلای بورسی <span className="gold-gradient-text">(صندوق‌های TSETMC)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                ارزش کل روز: <span className="dir-ltr font-bold text-gold-300">{formatCurrency(totalMarketValueTomans)}</span>
              </p>
            </div>
          </div>

          {onNavigateToMarket && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onNavigateToMarket();
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-gold-300 border border-gold-500/40 text-xs font-bold transition-all interactive-tap flex items-center gap-1 shrink-0"
            >
              <span>پایش قیمت‌های زنده</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          )}
        </div>

        {/* Gold Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {goldItems.map((item) => (
            <div
              key={item.instrument.id}
              className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-100 text-sm">{item.instrument.symbol}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-gold-500/30 text-gold-400 font-bold">
                    صندوق طلا
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  موجودی: {item.holding ? `${toPersianDigits(item.holding.quantity)} واحد` : 'ثبت نشده'}
                </div>
              </div>

              <div className="text-left">
                <div className="text-xs font-black text-gold-400 dir-ltr text-right">
                  {item.currentValueTomans
                    ? formatCurrency(item.currentValueTomans, { isTomanSuffix: true })
                    : '۰ ت'}
                </div>
                {item.quote?.lastPriceTomans && (
                  <div className="text-[10px] text-slate-500 dir-ltr text-right">
                    نرخ: {formatCurrency(item.quote.lastPriceTomans, { isUnitPrice: true, isTomanSuffix: true })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CRYPTO HOLDINGS SECTION */}
      <div className="glass-card p-4 sm:p-6 border border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <h3 className="text-base font-black text-slate-100">
                موجودی فعلی ارزهای دیجیتال
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              مجموع ارزش کریپتو: <span className="dir-ltr font-bold text-indigo-300">{formatCurrency(totalCryptoValue)}</span>
            </p>
          </div>

          <button
            onClick={() => {
              triggerHaptic('medium');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black transition-all interactive-tap touch-target shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن ارز جدید</span>
          </button>
        </div>

        {/* Crypto Items Grid / List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {cryptoAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => {
                triggerHaptic('light');
                setEditingAsset(asset);
              }}
              className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-indigo-500/50 transition-all flex items-center justify-between gap-3 interactive-tap"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: asset.color }}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-100 text-sm">{asset.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-400 font-bold">
                      وزن: {toPersianDigits(asset.targetPercent)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                    {asset.currentAmount !== undefined && asset.currentAmount > 0
                      ? `${toPersianDigits(asset.currentAmount.toFixed(4))} ${asset.symbol}`
                      : asset.name}
                  </div>
                </div>
              </div>

              {/* Balance & Edit Icon */}
              <div className="flex items-center gap-2">
                <div className="text-left">
                  <div className="text-xs font-black text-slate-200 dir-ltr text-right">
                    {asset.currentHoldingValue > 0
                      ? formatCurrency(asset.currentHoldingValue, { isTomanSuffix: true })
                      : '0'}
                  </div>
                  {asset.profitPercent !== undefined && (
                    <div
                      className={`text-[10px] font-bold dir-ltr text-right ${
                        asset.profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {asset.profitPercent >= 0 ? '+' : ''}{formatPercent(asset.profitPercent, 1)}
                    </div>
                  )}
                  {asset.unitPrice !== undefined && asset.unitPrice > 0 && asset.profitPercent === undefined && (
                    <div className="text-[10px] text-slate-500 dir-ltr text-right">
                      نرخ: {formatCurrency(asset.unitPrice, { isUnitPrice: true, isTomanSuffix: true })}
                    </div>
                  )}
                </div>

                <div className="p-2 rounded-xl bg-slate-900 text-slate-400">
                  <Edit3 className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddAsset={addCryptoAsset}
      />

      <EditAssetModal
        asset={editingAsset}
        isOpen={Boolean(editingAsset)}
        onClose={() => setEditingAsset(null)}
        onSave={editCryptoAsset}
        onDelete={removeCryptoAsset}
      />

    </div>
  );
};
