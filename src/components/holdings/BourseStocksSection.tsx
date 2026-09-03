import React, { useState } from 'react';
import { TrendingUp, Plus, Edit3, Trash2, TrendingDown } from 'lucide-react';
import { StockItem } from '../../types/investment';
import { formatToman, formatPercent, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { AddEditStockModal } from './AddEditStockModal';

interface BourseStocksSectionProps {
  stocks: StockItem[];
  onAddStock: (stock: Omit<StockItem, 'id' | 'updatedAt'>) => void;
  onEditStock: (id: string, updates: Partial<StockItem>) => void;
  onRemoveStock: (id: string) => void;
  formatCurrency?: (amountTomans: number) => string;
}

export const BourseStocksSection: React.FC<BourseStocksSectionProps> = ({
  stocks = [],
  onAddStock,
  onEditStock,
  onRemoveStock,
  formatCurrency = (v) => `${formatToman(v)} تومان`,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  const totalStocksValue = stocks.reduce(
    (sum, s) => sum + Math.round((s.sharesCount || 0) * (s.currentPriceTomans || s.averageBuyPriceTomans || 0)),
    0
  );

  const totalCostBasis = stocks.reduce(
    (sum, s) => sum + Math.round((s.sharesCount || 0) * (s.averageBuyPriceTomans || 0)),
    0
  );

  const totalPnl = totalStocksValue - totalCostBasis;
  const totalPnlPercent = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;
  const isOverallProfitable = totalPnl >= 0;

  return (
    <div className="space-y-4">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-cyan-900/30 via-slate-900/60 to-slate-950/80 border border-cyan-500/20 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">سهام بورس ایران</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                  ریسک متوسط (همراه طلا)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تعداد نمادها: {toPersianDigits(stocks.length)} شرکت
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSelectedStock(null);
              setIsModalOpen(true);
            }}
            className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 interactive-tap"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن سهم</span>
          </button>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50">
          <div>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
              ارزش روز کل سهام
            </span>
            <div className="text-xl font-black text-cyan-600 dark:text-cyan-400">
              {toPersianDigits(formatCurrency(totalStocksValue))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
              سود / زیان کل
            </span>
            <div className={`text-sm font-black flex items-center gap-1 ${isOverallProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isOverallProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{isOverallProfitable ? '+' : ''}{toPersianDigits(formatPercent(totalPnlPercent))}%</span>
              <span className="text-xs">({toPersianDigits(formatToman(Math.abs(totalPnl)))})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stocks List */}
      {stocks.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <TrendingUp className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            هنوز سهمی به سبد بورسی خود اضافه نکرده‌اید
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
            می‌توانید نمادهای بازار سهام ایران مانند فولاد، فملی، خودرو و... را ثبت و بازدهی آن‌ها را پایش کنید.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedStock(null);
              setIsModalOpen(true);
            }}
            className="py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            افزودن اولین سهم
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stocks.map((stock) => {
            const val = Math.round((stock.sharesCount || 0) * (stock.currentPriceTomans || stock.averageBuyPriceTomans || 0));
            const cost = Math.round((stock.sharesCount || 0) * (stock.averageBuyPriceTomans || 0));
            const pnl = val - cost;
            const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
            const isProfit = pnl >= 0;

            return (
              <div
                key={stock.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      {stock.symbol}
                    </span>
                    {stock.title && (
                      <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                        ({stock.title})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {toPersianDigits(stock.sharesCount.toLocaleString('fa-IR'))} سهم × {toPersianDigits(formatToman(stock.currentPriceTomans || stock.averageBuyPriceTomans))} تومان
                  </p>
                  <div className={`text-[11px] font-bold flex items-center gap-1 ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <span>{isProfit ? '+' : ''}{toPersianDigits(formatPercent(pnlPct))}%</span>
                    <span>({toPersianDigits(formatToman(Math.abs(pnl)))} ت)</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                    {toPersianDigits(formatToman(val))} ت
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedStock(stock);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="ویرایش"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        if (confirm(`نماد "${stock.symbol}" حذف شود؟`)) {
                          onRemoveStock(stock.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AddEditStockModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStock(null);
        }}
        onSave={(stockData) => {
          if (selectedStock) {
            onEditStock(selectedStock.id, stockData);
          } else {
            onAddStock(stockData);
          }
        }}
        onDelete={(id) => onRemoveStock(id)}
        initialStock={selectedStock}
      />
    </div>
  );
};
