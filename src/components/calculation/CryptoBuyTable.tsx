import React, { useState } from 'react';
import { Copy, Check, Info, CheckCheck, Coins, LayoutGrid, List } from 'lucide-react';
import { CalculatedCryptoBuy } from '../../types/investment';
import { formatToman, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';

interface CryptoBuyTableProps {
  cryptoBuys: CalculatedCryptoBuy[];
  totalCryptoBuySuggested: number;
}

export const CryptoBuyTable: React.FC<CryptoBuyTableProps> = ({
  cryptoBuys,
  totalCryptoBuySuggested,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const handleCopySingle = (id: string, amount: number) => {
    triggerHaptic('success');
    navigator.clipboard.writeText(String(amount));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllSummary = () => {
    triggerHaptic('success');
    const text = cryptoBuys
      .filter((c) => c.suggestedBuy > 0)
      .map((c) => `${c.symbol}: ${new Intl.NumberFormat('en-US').format(c.suggestedBuy)} تومان`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const totalTargetPercent = cryptoBuys.reduce((sum, c) => sum + c.targetPercent, 0);
  const totalCurrentCrypto = cryptoBuys.reduce((sum, c) => sum + c.currentHoldingValue, 0);

  return (
    <div className="glass-card p-4 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-4">
      
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-crypto-glow" />
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
              خرید ارزهای دیجیتال (پیشنهاد هوشمند)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            برای اینکه بعد از خرید کل مبلغ، سبدت روی نسبت‌های هدف قرار گیرد، این خریدها را انجام بده:
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => {
                triggerHaptic('light');
                setViewMode('cards');
              }}
              className={`p-1.5 rounded-lg transition-all interactive-tap ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-indigo-500/30 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="نمایش کارتی"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                setViewMode('table');
              }}
              className={`p-1.5 rounded-lg transition-all interactive-tap ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-indigo-500/30 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="نمایش جدولی"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Copy All Button */}
          {totalCryptoBuySuggested > 0 && (
            <button
              onClick={handleCopyAllSummary}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 transition-all interactive-tap touch-target shrink-0 font-bold"
              title="کپی لیست تمام خریدها برای سفارش در صرافی"
            >
              {copiedAll ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>کپی کل لیست</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: MOBILE TOUCH CARDS (Ergonomic for Phones) */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {cryptoBuys.map((crypto) => {
            const isCopied = copiedId === crypto.id;
            const hasBuy = crypto.suggestedBuy > 0;

            return (
              <div
                key={crypto.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2.5"
              >
                {/* Card Top: Coin Info + Target Weight */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: crypto.color }}
                    />
                    <div>
                      <span className="font-black text-slate-900 dark:text-slate-100 text-sm tracking-wide">
                        {crypto.symbol}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[120px]">
                        {crypto.name}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                    هدف: {toPersianDigits(crypto.targetPercent)}٪
                  </span>
                </div>

                {/* Card Mid: Current vs Suggested Buy */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-900 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">موجودی فعلی:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium dir-ltr text-xs">
                      {crypto.currentHoldingValue > 0
                        ? `${formatToman(crypto.currentHoldingValue)} ت`
                        : '۰ ت'}
                    </span>
                  </div>

                  {/* Suggested Buy Button */}
                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">خرید پیشنهادی:</span>
                      <span
                        className={`font-black dir-ltr text-xs ${
                          hasBuy ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {hasBuy ? `${formatToman(crypto.suggestedBuy)} ت` : 'تکمیل (۰)'}
                      </span>
                    </div>

                    {hasBuy && (
                      <button
                        onClick={() => handleCopySingle(crypto.id, crypto.suggestedBuy)}
                        className={`p-2 rounded-xl border transition-all interactive-tap touch-target ${
                          isCopied
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-emerald-glow'
                            : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80'
                        }`}
                        title={`کپی مبلغ خرید ${crypto.symbol}`}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Total Summary Footer Card */}
          <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-black">
            <span className="text-amber-800 dark:text-gold-400">مجموع خرید رمزارزها (۱۰۰٪ سبد):</span>
            <span className="text-emerald-700 dark:text-emerald-400 text-sm dir-ltr">
              {formatToman(totalCryptoBuySuggested)} تومان
            </span>
          </div>
        </div>
      ) : (
        /* VIEW 2: FULL TABLE VIEW */
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[500px] px-4 sm:px-0">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="pb-3 pr-2 font-bold">ارز</th>
                  <th className="pb-3 text-center font-bold">نسبت هدف</th>
                  <th className="pb-3 text-center font-bold">موجودی فعلی</th>
                  <th className="pb-3 pl-2 text-left font-bold">خرید پیشنهادی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-xs sm:text-sm">
                {cryptoBuys.map((crypto) => {
                  const isCopied = copiedId === crypto.id;
                  const hasBuy = crypto.suggestedBuy > 0;

                  return (
                    <tr
                      key={crypto.id}
                      className="hover:bg-slate-100/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 pr-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: crypto.color }}
                          />
                          <div>
                            <div className="font-black text-slate-900 dark:text-slate-100">{crypto.symbol}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                              {crypto.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                        {toPersianDigits(crypto.targetPercent)}٪
                      </td>

                      <td className="py-3.5 text-center font-medium text-slate-700 dark:text-slate-300 dir-ltr">
                        {crypto.currentHoldingValue > 0 ? (
                          <span>{formatToman(crypto.currentHoldingValue)}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">۰ تومان</span>
                        )}
                      </td>

                      <td className="py-3.5 pl-2 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`font-black dir-ltr ${
                              hasBuy ? 'text-emerald-600 dark:text-emerald-400 text-sm' : 'text-slate-400 dark:text-slate-500 text-xs'
                            }`}
                          >
                            {hasBuy ? `${formatToman(crypto.suggestedBuy)} تومان` : 'تکمیل (۰)'}
                          </span>

                          {hasBuy && (
                            <button
                              onClick={() => handleCopySingle(crypto.id, crypto.suggestedBuy)}
                              className={`p-1.5 rounded-lg border transition-all interactive-tap ${
                                isCopied
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700/60'
                              }`}
                              title={`کپی مبلغ خرید ${crypto.symbol}`}
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                <tr className="font-black text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-900/80 border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="py-3.5 pr-2 font-black text-sm text-amber-800 dark:text-gold-400">جمع</td>
                  <td className="py-3.5 text-center text-amber-800 dark:text-gold-400 text-sm">
                    {toPersianDigits(totalTargetPercent)}٪
                  </td>
                  <td className="py-3.5 text-center text-slate-700 dark:text-slate-300 text-sm dir-ltr">
                    {formatToman(totalCurrentCrypto)}
                  </td>
                  <td className="py-3.5 pl-2 text-left text-emerald-700 dark:text-emerald-400 text-sm dir-ltr font-black">
                    {formatToman(totalCryptoBuySuggested)} تومان
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exchange Tip */}
      <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-indigo-800 dark:text-indigo-300">خرید سریع در صرافی:</strong>
          <span className="text-slate-600 dark:text-slate-400 block mt-0.5">
            با زدن آیکون کپی، مبلغ دقیق خرید در کلیپ‌بورد ذخیره می‌شود و می‌توانید آن را مستقیماً در صرافی‌های نوبیتکس، والکس، تبدیل و... پیست کنید.
          </span>
        </div>
      </div>

    </div>
  );
};
