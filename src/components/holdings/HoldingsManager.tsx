import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Edit3,
  ArrowRight,
  TrendingUp,
  Coins,
  Building2,
  Car,
  DollarSign,
} from 'lucide-react';
import {
  CryptoAsset,
  PhysicalGoldItem,
  PhysicalGoldType,
  PhysicalGoldBuyLot,
  PhysicalGoldSaleRecord,
  PropertyItem,
  VehicleItem,
  DollarHolding,
} from '../../types/investment';
import { useMarketData } from '../../hooks/useMarketData';
import { formatToman, formatPercent, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { AddAssetModal } from './AddAssetModal';
import { EditAssetModal } from './EditAssetModal';
import { NobitexIntegrationCard } from '../crypto/NobitexIntegrationCard';
import { PhysicalGoldSection } from './PhysicalGoldSection';
import { PropertyManagerView } from '../properties/PropertyManagerView';
import { VehicleManagerView } from '../vehicles/VehicleManagerView';
import { DollarHoldingCard } from './DollarHoldingCard';
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
  usdtRateTomans?: number;
  formatCurrency?: (amountTomans: number, options?: any) => string;
  toDisplayValue?: (amountTomans: number) => number;
  onRefreshPhysicalGold?: () => Promise<void>;
  onUpdatePhysicalGoldQuantity?: (id: PhysicalGoldType, quantity: number) => void;
  onUpdatePhysicalGoldPrice?: (id: PhysicalGoldType, priceTomans: number, isCustom: boolean) => void;
  onAddGoldBuyLot?: (lot: Omit<PhysicalGoldBuyLot, 'id' | 'totalCostTomans'>) => void;
  onDeleteGoldSale?: (id: string) => void;
  onClearGoldSales?: () => void;
  // Real Estate properties
  properties?: PropertyItem[];
  onAddProperty?: (property: Omit<PropertyItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditProperty?: (id: string, updates: Partial<PropertyItem>) => void;
  onRemoveProperty?: (id: string) => void;
  // Vehicles
  vehicles?: VehicleItem[];
  onAddVehicle?: (vehicle: Omit<VehicleItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditVehicle?: (id: string, updates: Partial<VehicleItem>) => void;
  onRemoveVehicle?: (id: string) => void;
  // Dollar Holding
  dollarHolding?: DollarHolding;
  onUpdateDollarHolding?: (updates: Partial<DollarHolding>) => void;
  onNavigateToCalculator: () => void;
  onNavigateToMarket?: () => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
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
  usdtRateTomans = 93000,
  formatCurrency = (v, opts) => `${formatToman(v)} ${opts?.isTomanSuffix ? 'ت' : 'تومان'}`,
  toDisplayValue = (v) => v,
  onRefreshPhysicalGold = async () => {},
  onUpdatePhysicalGoldQuantity = () => {},
  onUpdatePhysicalGoldPrice = () => {},
  onAddGoldBuyLot,
  onDeleteGoldSale,
  onClearGoldSales,
  properties = [],
  onAddProperty,
  onEditProperty,
  onRemoveProperty,
  vehicles = [],
  onAddVehicle,
  onEditVehicle,
  onRemoveVehicle,
  dollarHolding,
  onUpdateDollarHolding,
  onNavigateToCalculator,
  onNavigateToMarket,
  onNotify,
}) => {
  const [activeCategory, setActiveCategory] = useState<'gold' | 'crypto' | 'properties' | 'vehicles' | 'dollar'>('gold');
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

  const totalGoldValuation = totalPhysicalGoldValueTomans + totalMarketValueTomans;
  const totalCryptoValue = cryptoAssets.reduce(
    (sum, a) => sum + (a.currentHoldingValue || 0),
    0
  );
  const totalPropertiesValue = properties.reduce(
    (sum, p) => sum + Math.round((p.currentValuationRial || 0) / 10),
    0
  );
  const totalVehiclesValue = vehicles.reduce(
    (sum, v) => sum + (v.currentValuationTomans || 0),
    0
  );
  const totalDollarValue = Math.round(
    (dollarHolding?.amountUsd || 0) * (dollarHolding?.currentPriceTomans || usdtRateTomans || 90000)
  );

  const categories = [
    {
      id: 'gold' as const,
      label: 'طلا و سکه',
      icon: Coins,
      value: totalGoldValuation,
      colorClass: 'text-amber-700 dark:text-gold-400',
      activeClass: 'bg-gradient-to-r from-amber-500 to-gold-500 text-slate-950 font-black shadow-gold-glow',
    },
    {
      id: 'crypto' as const,
      label: 'رمزارزها',
      icon: TrendingUp,
      value: totalCryptoValue,
      colorClass: 'text-indigo-700 dark:text-indigo-300',
      activeClass: 'bg-indigo-600 text-white font-black shadow-crypto-glow',
    },
    {
      id: 'dollar' as const,
      label: 'دلار نقدی',
      icon: DollarSign,
      value: totalDollarValue,
      colorClass: 'text-teal-700 dark:text-teal-400',
      activeClass: 'bg-teal-600 text-white font-black shadow-md',
    },
    {
      id: 'properties' as const,
      label: 'املاک',
      icon: Building2,
      value: totalPropertiesValue,
      colorClass: 'text-emerald-700 dark:text-emerald-400',
      activeClass: 'bg-emerald-600 text-white font-black shadow-md',
    },
    {
      id: 'vehicles' as const,
      label: 'خودرو و موتور',
      icon: Car,
      value: totalVehiclesValue,
      colorClass: 'text-blue-700 dark:text-blue-400',
      activeClass: 'bg-blue-600 text-white font-black shadow-md',
    },
  ];

  return (
    <div className="space-y-4">
      
      {/* 1. Category Switcher Pill Tabs */}
      <div className="p-1.5 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveCategory(cat.id);
              }}
              className={`flex-1 min-w-[95px] sm:min-w-[120px] py-2.5 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all interactive-tap touch-target ${
                isActive
                  ? cat.activeClass
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-bold whitespace-nowrap">{cat.label}</span>
              </div>
              <span className={`text-[10px] dir-ltr ${isActive ? 'opacity-90 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                {cat.value > 0 ? formatCurrency(cat.value, { isTomanSuffix: true }) : '۰ ت'}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. CATEGORY: GOLD & COINS */}
      {activeCategory === 'gold' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Physical Gold & Coins */}
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

          {/* TSETMC Gold Funds */}
          <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-yellow-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-950 border border-amber-200 dark:border-gold-500/30 shadow-sm dark:shadow-lg space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-gold-400 border border-amber-200 dark:border-gold-500/30 flex items-center justify-center font-bold text-lg">
                  📈
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    موجودی طلای بورسی <span className="gold-gradient-text">(صندوق‌های TSETMC)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ارزش کل روز: <span className="dir-ltr font-bold text-amber-700 dark:text-gold-300">{formatCurrency(totalMarketValueTomans)}</span>
                  </p>
                </div>
              </div>

              {onNavigateToMarket && (
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    onNavigateToMarket();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-100/80 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-800 dark:text-gold-300 border border-amber-300 dark:border-gold-500/40 text-xs font-bold transition-all interactive-tap flex items-center gap-1 shrink-0"
                >
                  <span>پایش بازار</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              )}
            </div>

            {/* Gold Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {goldItems.map((item) => (
                <div
                  key={item.instrument.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-slate-100 text-sm">{item.instrument.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-gold-500/30 dark:text-gold-400 font-bold">
                        صندوق طلا
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      موجودی: {item.holding ? `${toPersianDigits(item.holding.quantity)} واحد` : 'ثبت نشده'}
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-xs font-black text-amber-700 dark:text-gold-400 dir-ltr text-right">
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
        </div>
      )}

      {/* 3. CATEGORY: CRYPTO ASSETS */}
      {activeCategory === 'crypto' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="glass-card p-4 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    موجودی فعلی ارزهای دیجیتال
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  مجموع ارزش کریپتو: <span className="dir-ltr font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(totalCryptoValue)}</span>
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
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all flex items-center justify-between gap-3 interactive-tap"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: asset.color }}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-slate-100 text-sm leading-none">{asset.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold leading-none shrink-0">
                          وزن: {toPersianDigits(asset.targetPercent)}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate pt-0.5">
                        {asset.currentAmount !== undefined && asset.currentAmount > 0
                          ? `${toPersianDigits(asset.currentAmount.toFixed(4))} ${asset.symbol}`
                          : asset.name}
                      </div>
                    </div>
                  </div>

                  {/* Balance & Edit Icon */}
                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <div className="text-xs font-black text-slate-900 dark:text-slate-200 dir-ltr text-right">
                        {asset.currentHoldingValue > 0
                          ? formatCurrency(asset.currentHoldingValue, { isTomanSuffix: true })
                          : '0'}
                      </div>
                      {asset.profitPercent !== undefined && (
                        <div
                          className={`text-[10px] font-bold dir-ltr text-right ${
                            asset.profitPercent >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
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

                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-transparent">
                      <Edit3 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
      )}

      {/* 4. CATEGORY: REAL ESTATE (PROPERTIES) */}
      {activeCategory === 'properties' && onAddProperty && onEditProperty && onRemoveProperty && (
        <div className="animate-fadeIn">
          <PropertyManagerView
            properties={properties}
            currencyMode={currencyMode}
            usdtRateTomans={usdtRateTomans}
            formatCurrency={formatCurrency}
            toDisplayValue={toDisplayValue}
            onAddProperty={onAddProperty}
            onEditProperty={onEditProperty}
            onRemoveProperty={onRemoveProperty}
            onNotify={onNotify}
          />
        </div>
      )}

      {/* 5. CATEGORY: VEHICLES (CARS & MOTORCYCLES) */}
      {activeCategory === 'vehicles' && onAddVehicle && onEditVehicle && onRemoveVehicle && (
        <div className="animate-fadeIn">
          <VehicleManagerView
            vehicles={vehicles}
            currencyMode={currencyMode}
            usdtRateTomans={usdtRateTomans}
            formatCurrency={formatCurrency}
            toDisplayValue={toDisplayValue}
            onAddVehicle={onAddVehicle}
            onEditVehicle={onEditVehicle}
            onRemoveVehicle={onRemoveVehicle}
            onNotify={onNotify}
          />
        </div>
      )}

      {/* 6. CATEGORY: USD CASH BANKNOTES */}
      {activeCategory === 'dollar' && dollarHolding && onUpdateDollarHolding && (
        <div className="animate-fadeIn">
          <DollarHoldingCard
            dollarHolding={dollarHolding}
            onUpdate={onUpdateDollarHolding}
            usdtRateTomans={usdtRateTomans}
            formatCurrency={formatCurrency}
          />
        </div>
      )}

    </div>
  );
};
