import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, Loader2, TrendingUp, AlertCircle, Coins } from 'lucide-react';
import { SearchInstrumentResult } from '../../services/marketData/types';
import { marketDataProvider } from '../../services/marketData';
import { parseNumberInput, toPersianDigits, formatToman } from '../../utils/formatters';
import { numberToPersianWords } from '../../utils/numberToPersianWords';
import { triggerHaptic } from '../../utils/haptics';
import { BottomSheetModal } from '../common/BottomSheetModal';

interface AddMarketInstrumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    instrument: SearchInstrumentResult,
    quantity: number,
    averageBuyPriceTomans?: number
  ) => void;
}

const POPULAR_GOLD_ETFS: SearchInstrumentResult[] = [
  { symbol: 'عیار', name: 'صندوق س. پشتوانه طلای لوتوس', insCode: '34144395039913458', assetType: 'etf' },
  { symbol: 'طلا', name: 'صندوق س. پشتوانه طلای زرافشان', insCode: '26656708390708948', assetType: 'etf' },
  { symbol: 'کهربا', name: 'صندوق س. طلا کهربا', insCode: '35700344742885862', assetType: 'etf' },
  { symbol: 'زر', name: 'صندوق س. زرین آگاه', insCode: '58774780517865203', assetType: 'etf' },
  { symbol: 'گوهر', name: 'صندوق س. گوهر نفیس', insCode: '31388527814418318', assetType: 'etf' },
  { symbol: 'زرفام', name: 'صندوق س. طلای زرفام آشنا', insCode: '28666376510708767', assetType: 'etf' },
];

export const AddMarketInstrumentModal: React.FC<AddMarketInstrumentModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchInstrumentResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<SearchInstrumentResult | null>(null);
  const [quantity, setQuantity] = useState('');
  const [averageBuyPrice, setAverageBuyPrice] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedInstrument(null);
      setQuantity('');
      setAverageBuyPrice('');
      setSearchError(null);
    }
  }, [isOpen]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setSelectedInstrument(null);
    setSearchError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await marketDataProvider.searchInstruments(query.trim());
        setSearchResults(results);
      } catch (err: any) {
        setSearchError('خطا در جستجو در TSETMC');
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectInstrument = (inst: SearchInstrumentResult) => {
    triggerHaptic('light');
    setSelectedInstrument(inst);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstrument) return;

    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) return;

    const avgBuyPriceTomans = averageBuyPrice.trim()
      ? parseNumberInput(averageBuyPrice)
      : undefined;

    triggerHaptic('success');
    onAdd(selectedInstrument, parsedQty, avgBuyPriceTomans);
    onClose();
  };

  const avgPriceNumber = parseNumberInput(averageBuyPrice);
  const avgPriceWords = avgPriceNumber > 0 ? numberToPersianWords(avgPriceNumber, 'تومان') : '';

  const footerActions = (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all interactive-tap touch-target border border-slate-200 dark:border-slate-700"
      >
        انصراف
      </button>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedInstrument || !quantity || parseFloat(quantity) <= 0}
        className={`px-5 py-3 rounded-2xl text-xs font-black transition-all interactive-tap touch-target ${
          selectedInstrument && parseFloat(quantity) > 0
            ? 'bg-gradient-to-r from-amber-400 via-gold-500 to-yellow-500 text-slate-950 shadow-gold-glow'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
        }`}
      >
        افزودن به دارایی‌ها
      </button>
    </div>
  );

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="افزودن صندوق یا سهم جدید به سبد"
      subtitle="جستجو در نمادهای بازار بورس و صندوق‌های طلای TSETMC"
      icon={<Coins className="w-4 h-4 text-amber-700 dark:text-gold-400" />}
      footer={footerActions}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Step 1: Instrument Selection */}
        {!selectedInstrument ? (
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="جستجوی نماد یا نام شرکت (عیار، طلا، خودرو...)"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 dark:focus:border-gold-400 focus:bg-white pl-10"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-gold-400" /> : <Search className="w-4 h-4" />}
              </div>
            </div>

            {/* Popular Gold ETFs Quick Select */}
            {!searchQuery && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  صندوق‌های طلای محبوب بورس:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_GOLD_ETFS.map((inst) => (
                    <button
                      key={inst.symbol}
                      type="button"
                      onClick={() => handleSelectInstrument(inst)}
                      className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/90 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-gold-400/50 dark:hover:border-gold-500/40 text-right transition-all flex items-center justify-between group touch-target"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-amber-700 dark:text-gold-400 block truncate">
                          {inst.symbol}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                          {inst.name}
                        </span>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700 dark:text-slate-500 dark:group-hover:text-gold-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results List */}
            {searchQuery && searchResults.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto overscroll-contain">
                {searchResults.map((inst) => (
                  <div
                    key={inst.insCode || inst.symbol}
                    onClick={() => handleSelectInstrument(inst)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/90 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-gold-400/60 dark:hover:border-gold-500/50 cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">{inst.symbol}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-amber-800 dark:text-gold-400 font-mono">
                          {inst.assetType}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                        {inst.name}
                      </span>
                    </div>
                    <Plus className="w-4 h-4 text-amber-700 dark:text-gold-400" />
                  </div>
                ))}
              </div>
            )}

            {searchQuery && !isSearching && searchResults.length === 0 && (
              <p className="text-xs text-center text-slate-400 dark:text-slate-500 py-3">نمادی یافت نشد.</p>
            )}
          </div>
        ) : (
          /* Step 2: Selected Instrument & Holding Inputs */
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-gold-500/10 border border-amber-300 dark:border-gold-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-amber-900 dark:text-gold-300 block">
                  {selectedInstrument.name} ({selectedInstrument.symbol})
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">کد TSETMC: {selectedInstrument.insCode}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInstrument(null)}
                className="text-[11px] text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-bold"
              >
                تغییر نماد
              </button>
            </div>

            {/* Quantity */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                تعداد واحدهای خریداری‌شده <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="مثال: ۲۸۰"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-amber-500 dark:focus:border-gold-500 focus:bg-white dir-ltr text-right font-mono"
              />
            </div>

            {/* Optional Average Purchase Price */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                میانگین قیمت خرید هر واحد به تومان (اختیاری جهت محاسبه سود/زیان)
              </label>
              <input
                type="text"
                value={averageBuyPrice}
                onChange={(e) => setAverageBuyPrice(e.target.value)}
                placeholder="مثال: ۳۵,۰۰۰"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-amber-500 dark:focus:border-gold-500 focus:bg-white dir-ltr text-right font-mono"
              />
              {avgPriceWords && (
                <div className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-gold-500/10 text-[10px] font-bold text-amber-900 dark:text-gold-300 border border-amber-200 dark:border-gold-500/20">
                  {avgPriceWords}
                </div>
              )}
            </div>
          </div>
        )}

      </form>
    </BottomSheetModal>
  );
};
