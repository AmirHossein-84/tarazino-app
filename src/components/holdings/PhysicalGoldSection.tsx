import React, { useState, useMemo } from 'react';
import {
  Coins,
  RefreshCw,
  Edit3,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldCheck,
  AlertCircle,
  WifiOff,
  ChevronDown,
  ChevronUp,
  History,
  Plus,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  PhysicalGoldItem,
  PhysicalGoldType,
  PhysicalGoldBuyLot,
  PhysicalGoldSaleRecord,
} from '../../types/investment';
import { formatToman, formatPercent, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { EditPhysicalGoldModal } from './EditPhysicalGoldModal';
import { AddGoldLotModal } from './AddGoldLotModal';
import { PhysicalGoldHistoryModal } from './PhysicalGoldHistoryModal';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';
import { calculateGoldItemPnl, calculateTotalPhysicalGoldPnl } from '../../utils/goldPnlCalculators';

interface PhysicalGoldSectionProps {
  items: PhysicalGoldItem[];
  totalValueTomans: number;
  isRefreshing: boolean;
  isGoldFetchError?: boolean;
  currencyMode?: CurrencyDisplayMode;
  formatCurrency?: (amountTomans: number, options?: any) => string;
  goldBuyLots?: PhysicalGoldBuyLot[];
  physicalGoldSales?: PhysicalGoldSaleRecord[];
  onRefresh: () => Promise<void>;
  onUpdateQuantity: (id: PhysicalGoldType, quantity: number) => void;
  onUpdatePrice: (id: PhysicalGoldType, priceTomans: number, isCustom: boolean) => void;
  onAddGoldBuyLot?: (lot: Omit<PhysicalGoldBuyLot, 'id' | 'totalCostTomans'>) => void;
  onDeleteGoldSale?: (id: string) => void;
  onClearGoldSales?: () => void;
  onNotify?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const PhysicalGoldSection: React.FC<PhysicalGoldSectionProps> = ({
  items,
  totalValueTomans,
  isRefreshing,
  isGoldFetchError = false,
  currencyMode = 'toman',
  formatCurrency = (v, opts) => `${formatToman(v)} ${opts?.isTomanSuffix ? 'ت' : 'تومان'}`,
  goldBuyLots = [],
  physicalGoldSales = [],
  onRefresh,
  onUpdateQuantity,
  onUpdatePrice,
  onAddGoldBuyLot,
  onDeleteGoldSale,
  onClearGoldSales,
  onNotify,
}) => {
  const [selectedItem, setSelectedItem] = useState<PhysicalGoldItem | null>(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const [isAddLotOpen, setIsAddLotOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedLotGoldType, setSelectedLotGoldType] = useState<PhysicalGoldType>('gold_18k');

  const totalPnl = useMemo(() => {
    return calculateTotalPhysicalGoldPnl(items, goldBuyLots);
  }, [items, goldBuyLots]);

  const handleRefresh = async () => {
    triggerHaptic('light');
    await onRefresh();
    if (!isGoldFetchError) {
      onNotify?.('قیمت‌های لحظه‌ای طلا و سکه به‌روزرسانی شدند', 'success');
    }
  };

  const hasAnyPrice = items.some((i) => i.unitPriceTomans > 0);
  const activeItems = items.filter((i) => i.quantity > 0);

  const displayedItems = showAllItems
    ? items
    : activeItems.length > 0
    ? activeItems
    : items.slice(0, 2);

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border border-gold-500/40 shadow-xl space-y-4">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-gold-400 flex items-center justify-center font-bold text-lg border border-gold-500/30">
            🥇
          </div>
          <div>
            <h3 className="text-base font-black text-slate-100">
              طلای فیزیکی و مسکوکات <span className="text-xs text-gold-400 font-bold">(نرخ زنده)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              ارزش کل: <span className="text-gold-300 font-black dir-ltr">{formatCurrency(totalValueTomans)}</span> (محاسبه در سهم ۸۰٪ طلا)
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Sales History Ledger Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsHistoryOpen(true);
            }}
            className="py-2 px-3 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 text-slate-300 hover:text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 interactive-tap touch-target"
            title="دفتر کل سوابق و سود/زیان فروش طلا"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>سوابق فروش</span>
            {physicalGoldSales.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-gold-300 text-[10px] font-bold">
                {toPersianDigits(physicalGoldSales.length)}
              </span>
            )}
          </button>

          {/* Add Buy Lot Button */}
          {onAddGoldBuyLot && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSelectedLotGoldType('gold_18k');
                setIsAddLotOpen(true);
              }}
              className="py-2 px-3 rounded-2xl bg-gradient-to-r from-amber-400 to-gold-500 hover:from-amber-300 hover:to-gold-400 text-slate-950 text-xs font-black transition-all shadow-gold-glow flex items-center gap-1 interactive-tap touch-target"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>پله خرید جدید</span>
            </button>
          )}

          {/* Refresh Rates Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-gold-300 border border-slate-700/80 transition-all touch-target"
            title="به‌روزرسانی قیمت‌های طلا و سکه"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-gold-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Aggregate Physical Gold P&L Banner (if cost basis exists) */}
      {totalPnl.hasAnyCostBasis && (
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 block">بهای تمام‌شده کل طلا:</span>
            <span className="font-bold text-slate-200 dir-ltr text-right block">
              {formatCurrency(totalPnl.totalCostBasisTomans)}
            </span>
          </div>

          <div className="text-left space-y-0.5">
            <span className="text-[10px] text-slate-400 block">سود/زیان برآوردشده لحظه‌ای:</span>
            <div className="flex items-center gap-1.5 dir-ltr justify-end">
              <span
                className={`font-black ${
                  totalPnl.totalUnrealizedProfitTomans >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {totalPnl.totalUnrealizedProfitTomans >= 0 ? '+' : ''}
                {formatCurrency(totalPnl.totalUnrealizedProfitTomans)}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  totalPnl.totalUnrealizedProfitTomans >= 0
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-rose-500/15 text-rose-300'
                }`}
              >
                {totalPnl.totalUnrealizedProfitTomans >= 0 ? '+' : ''}
                {formatPercent(totalPnl.totalUnrealizedProfitPercent, 1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Smart Warning Banner: Network / VPN Issue */}
      {(isGoldFetchError || !hasAnyPrice) && (
        <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex items-start gap-3 text-xs text-amber-200 animate-fadeIn">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-black block text-amber-300">
              عدم امکان استعلام قیمت‌های روز طلا و سکه
            </span>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              لطفاً اتصال اینترنت خود را بررسی نمایید. وب‌سرویس‌های شبکه اطلاع‌رسانی طلا (TGJU) سرورهای داخلی هستند؛ بنابراین در صورت روشن بودن <strong>فیلترشکن (VPN)</strong>، آن را خاموش کرده و دکمه به‌روزرسانی 🔄 را بزنید.
            </p>
          </div>
        </div>
      )}

      {/* Grid of Gold & Coin Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayedItems.map((item) => {
          const hasHolding = item.quantity > 0;
          const itemTotalVal = item.quantity * item.unitPriceTomans;
          const changePct = item.priceChangePercent || 0;
          const isPositive = changePct >= 0;
          const hasPrice = item.unitPriceTomans > 0;
          const itemPnl = calculateGoldItemPnl(item, goldBuyLots);

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                hasHolding
                  ? 'bg-slate-950/90 border-gold-500/40 hover:border-gold-500/70 shadow-lg'
                  : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 opacity-85 hover:opacity-100'
              }`}
            >
              {/* Card Header: Title + Price Change */}
              <div className="flex items-start justify-between gap-2">
                <div
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedItem(item);
                  }}
                  className="cursor-pointer flex-1"
                >
                  <h4 className="text-xs sm:text-sm font-black text-slate-100 flex items-center gap-1.5">
                    <span>{item.id.startsWith('coin_') ? '🪙' : '✨'}</span>
                    <span>{item.title}</span>
                    {itemPnl.lotsCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/15 text-gold-400 font-bold">
                        {toPersianDigits(itemPnl.lotsCount)} پله خرید
                      </span>
                    )}
                  </h4>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    نرخ هر {item.unit}:{' '}
                    {hasPrice ? (
                      <span className="font-bold text-slate-200 dir-ltr">
                        {formatCurrency(item.unitPriceTomans, { isUnitPrice: true, isTomanSuffix: true })}
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium text-[10px]">در انتظار دریافت نرخ...</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {changePct !== 0 && hasPrice && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md inline-flex items-center gap-0.5 dir-ltr ${
                        isPositive
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      <span>{formatPercent(Math.abs(changePct))}</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedItem(item);
                    }}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-gold-400 hover:bg-slate-900 transition-all touch-target"
                    title="ویرایش موجودی"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Bottom: Quantity & Total Value */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">موجودی:</span>
                  <span className="font-black text-slate-200">
                    {hasHolding ? `${toPersianDigits(item.quantity)} ${item.unit}` : 'صفر'}
                  </span>
                </div>

                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block">ارزش کل:</span>
                  <span className="font-black text-gold-400 dir-ltr">
                    {hasPrice ? formatCurrency(itemTotalVal, { isTomanSuffix: true }) : '—'}
                  </span>
                </div>
              </div>

              {/* P&L & Cost Basis Row if Available */}
              {hasHolding && itemPnl.hasCostBasis && (
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-400 block">بهای خرید:</span>
                    <span className="font-bold text-slate-300 dir-ltr">
                      {formatCurrency(itemPnl.totalCostBasisTomans, { isTomanSuffix: true })}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block">سود/زیان برآورد:</span>
                    <div className="flex items-center gap-1 dir-ltr justify-end">
                      <span
                        className={`font-black ${
                          itemPnl.unrealizedProfitTomans >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {itemPnl.unrealizedProfitTomans >= 0 ? '+' : ''}
                        {formatCurrency(itemPnl.unrealizedProfitTomans, { isTomanSuffix: true })}
                      </span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          itemPnl.unrealizedProfitTomans >= 0
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {itemPnl.unrealizedProfitTomans >= 0 ? '+' : ''}
                        {formatPercent(itemPnl.unrealizedProfitPercent, 1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Action: Register Buy Lot */}
              {onAddGoldBuyLot && (
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedLotGoldType(item.id);
                      setIsAddLotOpen(true);
                    }}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>ثبت خرید جدید</span>
                  </button>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Expand / Collapse Action Button */}
      {items.length > displayedItems.length && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowAllItems(true);
          }}
          className="w-full py-2.5 px-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-gold-400 hover:text-gold-300 transition-all flex items-center justify-center gap-1.5 interactive-tap"
        >
          <ChevronDown className="w-4 h-4" />
          <span>
            {activeItems.length > 0
              ? `مشاهده و ثبت سایر اقلام طلا و مسکوکات (${toPersianDigits(items.length - activeItems.length)} قلم دیگر)`
              : `مشاهده و ثبت سایر اقلام و مسکوکات طلا (${toPersianDigits(items.length)} مورد)`}
          </span>
        </button>
      )}
      {showAllItems && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowAllItems(false);
          }}
          className="w-full py-2 px-3 rounded-2xl bg-slate-900/40 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] font-medium transition-all flex items-center justify-center gap-1 interactive-tap"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span>نمایش فشرده</span>
        </button>
      )}

      {/* Edit Modal */}
      <EditPhysicalGoldModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onSaveQuantity={onUpdateQuantity}
        onSavePrice={onUpdatePrice}
        onSaveAverageBuyPrice={(id, avgCost) => {
          onUpdateQuantity(id, selectedItem?.quantity || 0);
          const itm = items.find((i) => i.id === id);
          if (itm) {
            itm.averageBuyPriceTomans = avgCost;
          }
        }}
      />

      {/* Add Gold Lot Modal */}
      {onAddGoldBuyLot && (
        <AddGoldLotModal
          isOpen={isAddLotOpen}
          onClose={() => setIsAddLotOpen(false)}
          items={items}
          defaultSelectedType={selectedLotGoldType}
          onSaveLot={onAddGoldBuyLot}
        />
      )}

      {/* Sales Audit Ledger Modal */}
      <PhysicalGoldHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sales={physicalGoldSales}
        currencyMode={currencyMode}
        formatCurrency={formatCurrency}
        onDeleteRecord={(id) => onDeleteGoldSale?.(id)}
        onClearAll={() => onClearGoldSales?.()}
      />

    </div>
  );
};
