import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { CryptoAsset } from '../../types/investment';
import { parseNumberInput } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { BottomSheetModal } from '../common/BottomSheetModal';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAsset: (asset: Omit<CryptoAsset, 'id'>) => void;
}

const PRESET_COLORS = [
  '#627EEA', '#F7931A', '#F3BA2F', '#0033AD', '#E6007A',
  '#EF0027', '#23292F', '#C2A633', '#8247E5', '#14F195',
  '#0098EA', '#F0B90B', '#2775CA', '#50AF95', '#E84142'
];

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  onAddAsset,
}) => {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [targetPercent, setTargetPercent] = useState('5');
  const [currentHoldingValue, setCurrentHoldingValue] = useState('');
  const [color, setColor] = useState('#14F195');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    triggerHaptic('success');
    onAddAsset({
      symbol: symbol.trim().toUpperCase(),
      name: name.trim() || symbol.trim().toUpperCase(),
      targetPercent: parseFloat(targetPercent) || 0,
      currentHoldingValue: parseNumberInput(currentHoldingValue),
      color,
      isDefault: false,
    });

    setSymbol('');
    setName('');
    setTargetPercent('5');
    setCurrentHoldingValue('');
    onClose();
  };

  const footerActions = (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onClose}
        className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all interactive-tap touch-target text-xs border border-slate-200 dark:border-slate-700"
      >
        انصراف
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!symbol.trim()}
        className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black transition-all shadow-crypto-glow interactive-tap touch-target text-xs"
      >
        افزودن ارز به سبد
      </button>
    </div>
  );

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="افزودن ارز دیجیتال جدید"
      subtitle="تعریف نماد، نام و درصد هدف در سبد سرمایه‌گذاری"
      icon={<Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
      footer={footerActions}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {/* Symbol */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
            نماد ارز (Symbol) <span className="text-rose-500 dark:text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            autoFocus
            placeholder="مثلاً SOL, TON, AVAX"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white uppercase dir-ltr font-black text-base"
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
            نام کامل ارز (اختیاری)
          </label>
          <input
            type="text"
            placeholder="مثلاً سولانا (Solana)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Target Percentage */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
              درصد هدف از سبد (٪)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={targetPercent}
              onChange={(e) => setTargetPercent(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-white dir-ltr font-black text-sm"
            />
          </div>

          {/* Initial Holding Value */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
              موجودی فعلی (تومان)
            </label>
            <input
              type="text"
              placeholder="مثلاً ۵۰۰,۰۰۰"
              value={currentHoldingValue}
              onChange={(e) => setCurrentHoldingValue(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white dir-ltr font-bold text-sm"
            />
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
            رنگ شناسه ارز
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setColor(c);
                }}
                className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                  color === c ? 'scale-125 ring-2 ring-indigo-500 shadow-lg' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </form>
    </BottomSheetModal>
  );
};
