import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Home,
  Store,
  Trees,
  Briefcase,
  Layers,
  Edit3,
  Trash2,
  TrendingUp,
  Maximize2,
  Calendar,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';
import { PropertyItem, PropertyType } from '../../types/investment';
import { formatToman, toPersianDigits, getPersianFormattedDate } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';
import { AddEditPropertyModal } from './AddEditPropertyModal';

interface PropertyManagerViewProps {
  properties: PropertyItem[];
  currencyMode?: CurrencyDisplayMode;
  usdtRateTomans?: number;
  formatCurrency?: (amountTomans: number, options?: any) => string;
  toDisplayValue?: (amountTomans: number) => number;
  onAddProperty: (property: Omit<PropertyItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditProperty: (id: string, updates: Partial<PropertyItem>) => void;
  onRemoveProperty: (id: string) => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const PROPERTY_TYPE_CONFIG: Record<
  PropertyType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  residential: { label: 'مسکونی', icon: Home, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30' },
  commercial: { label: 'تجاری', icon: Store, color: 'text-amber-800 dark:text-amber-400', bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30' },
  office: { label: 'اداری', icon: Briefcase, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30' },
  land: { label: 'زمین/کلنگی', icon: Trees, color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-400 dark:border-teal-500/30' },
  other: { label: 'متفرقه', icon: Layers, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30' },
};

export const PropertyManagerView: React.FC<PropertyManagerViewProps> = ({
  properties,
  currencyMode = 'toman',
  usdtRateTomans = 93000,
  formatCurrency = (v) => `${formatToman(v)} تومان`,
  toDisplayValue = (v) => v,
  onAddProperty,
  onEditProperty,
  onRemoveProperty,
  onNotify,
}) => {
  const [selectedType, setSelectedType] = useState<PropertyType | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);

  // Portfolio Totals
  const totalValuationToman = useMemo(() => {
    return properties.reduce((sum, p) => {
      const valToman = Math.round((p.currentValuationRial || p.purchasePriceRial || 0) / 10);
      return sum + valToman;
    }, 0);
  }, [properties]);

  const netWorthIncludedValuationToman = useMemo(() => {
    return properties.reduce((sum, p) => {
      if (p.includeInTotalNetWorth === false) return sum;
      const valToman = Math.round((p.currentValuationRial || p.purchasePriceRial || 0) / 10);
      return sum + valToman;
    }, 0);
  }, [properties]);

  const totalPurchaseCostToman = useMemo(() => {
    return properties.reduce((sum, p) => sum + Math.round((p.purchasePriceRial || 0) / 10), 0);
  }, [properties]);

  const totalAreaSqm = useMemo(() => {
    return properties.reduce((sum, p) => sum + (p.areaSquareMeters || 0), 0);
  }, [properties]);

  const totalGainToman = totalValuationToman - totalPurchaseCostToman;
  const totalGainPercent =
    totalPurchaseCostToman > 0 ? ((totalValuationToman - totalPurchaseCostToman) / totalPurchaseCostToman) * 100 : 0;

  const totalValuationUsd = usdtRateTomans > 0 ? Math.round(totalValuationToman / usdtRateTomans) : 0;

  // Filtered properties
  const filteredProperties = useMemo(() => {
    if (selectedType === 'all') return properties;
    return properties.filter((p) => p.type === selectedType);
  }, [properties, selectedType]);

  const handleOpenAdd = () => {
    triggerHaptic('light');
    setEditingProperty(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: PropertyItem) => {
    triggerHaptic('light');
    setEditingProperty(p);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    triggerHaptic('medium');
    if (window.confirm(`آیا از حذف ملک "${title}" اطمینان دارید؟`)) {
      onRemoveProperty(id);
      onNotify?.(`ملک "${title}" حذف شد`, 'info');
    }
  };

  const handleToggleNetWorth = (p: PropertyItem) => {
    triggerHaptic('light');
    const newState = !p.includeInTotalNetWorth;
    onEditProperty(p.id, { includeInTotalNetWorth: newState });
    onNotify?.(
      newState ? `ملک "${p.title}" در محاسبه کل دارایی لحاظ شد` : `ملک "${p.title}" از محاسبه کل دارایی مستثنی شد`,
      'info'
    );
  };

  const handleSaveModal = (data: Omit<PropertyItem, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => {
    if (id) {
      onEditProperty(id, data);
      onNotify?.(`ملک "${data.title}" با موفقیت به‌روزرسانی شد`, 'success');
    } else {
      onAddProperty(data);
      onNotify?.(`ملک "${data.title}" با موفقیت ثبت شد`, 'success');
    }
  };

  return (
    <div className="space-y-5 pb-24 animate-fadeIn">
      
      {/* 1. Real Estate Summary Hero Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-950 border border-emerald-200 dark:border-emerald-500/40 shadow-sm dark:shadow-2xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xl border border-emerald-200 dark:border-emerald-500/30 shrink-0">
              <Building2 className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                  مدیریت املاک و مستغلات <span className="text-emerald-700 dark:text-emerald-400 text-xs">(Real Estate)</span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ثبت، ارزش‌گذاری دوگانه (ریال/دلار) و محاسبه بازدهی سرمایه‌گذاری ملکی
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="self-start sm:self-auto py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center gap-1.5 interactive-tap touch-target"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت ملک جدید</span>
          </button>
        </div>

        {/* Aggregate Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800/80">
          
          {/* Total Valuation */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-emerald-200 dark:border-emerald-500/30 space-y-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">ارزش کل روز املاک:</span>
            <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 dir-ltr text-right">
              {formatCurrency(totalValuationToman)}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block dir-ltr text-right">
              ≈ $ {new Intl.NumberFormat('en-US').format(totalValuationUsd)}
            </span>
          </div>

          {/* Capital Gain / ROI */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">سود و رشد سرمایه:</span>
            <div
              className={`text-sm sm:text-base font-black dir-ltr text-right ${
                totalGainToman >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {totalGainToman >= 0 ? '+' : ''}{formatCurrency(totalGainToman)}
            </div>
            {totalPurchaseCostToman > 0 && (
              <span
                className={`text-[10px] font-bold block ${
                  totalGainToman >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {totalGainToman >= 0 ? '+' : ''}{toPersianDigits(totalGainPercent.toFixed(1))}٪ بازدهی کل
              </span>
            )}
          </div>

          {/* Total Area */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">مجموع متراژ املاک:</span>
            <div className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
              {totalAreaSqm > 0 ? `${toPersianDigits(totalAreaSqm)} متر مربع` : '—'}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
              تعداد: {toPersianDigits(properties.length)} ملک ثبت‌شده
            </span>
          </div>

          {/* Net Worth Portion */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">محاسبه در دارایی کل:</span>
            <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 dir-ltr text-right">
              {formatCurrency(netWorthIncludedValuationToman)}
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-bold">
              {toPersianDigits(properties.filter((p) => p.includeInTotalNetWorth !== false).length)} ملک فعال در سبد
            </span>
          </div>

        </div>
      </div>

      {/* 2. Category Filter Pills */}
      {properties.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-0.5">
          <button
            onClick={() => {
              triggerHaptic('light');
              setSelectedType('all');
            }}
            className={`py-2 px-3.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all interactive-tap touch-target ${
              selectedType === 'all'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
          >
            همه کاربری‌ها ({toPersianDigits(properties.length)})
          </button>

          {(Object.keys(PROPERTY_TYPE_CONFIG) as PropertyType[]).map((typeKey) => {
            const cfg = PROPERTY_TYPE_CONFIG[typeKey];
            const Icon = cfg.icon;
            const count = properties.filter((p) => p.type === typeKey).length;
            if (count === 0 && selectedType !== typeKey) return null;

            const isSelected = selectedType === typeKey;

            return (
              <button
                key={typeKey}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedType(typeKey);
                }}
                className={`py-2 px-3 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all interactive-tap touch-target ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md font-black'
                    : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cfg.label}</span>
                <span className="text-[10px] opacity-80">({toPersianDigits(count)})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Property Cards List */}
      {filteredProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredProperties.map((property) => {
            const typeConfig = PROPERTY_TYPE_CONFIG[property.type] || PROPERTY_TYPE_CONFIG.other;
            const TypeIcon = typeConfig.icon;

            const purchaseToman = Math.round((property.purchasePriceRial || 0) / 10);
            const currentToman = Math.round((property.currentValuationRial || property.purchasePriceRial || 0) / 10);
            const gainToman = currentToman - purchaseToman;
            const gainPercent = purchaseToman > 0 ? (gainToman / purchaseToman) * 100 : 0;
            const pricePerSqm =
              property.areaSquareMeters > 0 && currentToman > 0
                ? Math.round(currentToman / property.areaSquareMeters)
                : 0;
            const valuationUsd =
              property.currentValuationUsd ||
              (usdtRateTomans > 0 ? Number((currentToman / usdtRateTomans).toFixed(2)) : 0);

            const isIncluded = property.includeInTotalNetWorth !== false;

            return (
              <div
                key={property.id}
                className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-emerald-400 dark:hover:border-emerald-500/40 shadow-sm dark:shadow-xl transition-all space-y-3.5 relative overflow-hidden"
              >
                {/* Top Row: Title + Type Badge + Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl border ${typeConfig.bg}`}>
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">{property.title}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className={`font-bold ${typeConfig.color}`}>{typeConfig.label}</span>
                          {property.areaSquareMeters > 0 && (
                            <>
                              <span>•</span>
                              <span>{toPersianDigits(property.areaSquareMeters)} متر مربع</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleNetWorth(property)}
                      className={`p-2 rounded-xl border transition-all touch-target ${
                        isIncluded
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-500/50 dark:text-emerald-400 dark:hover:bg-emerald-900/60'
                          : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-500 dark:hover:text-slate-300'
                      }`}
                      title={isIncluded ? 'لحاظ شده در کل دارایی (کلیک برای غیرفعال‌سازی)' : 'مستثنی از کل دارایی (کلیک برای فعال‌سازی)'}
                    >
                      {isIncluded ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(property)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 transition-all touch-target"
                      title="ویرایش ملک"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(property.id, property.title)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 hover:border-rose-200 dark:border-slate-700 dark:hover:border-rose-500/50 transition-all touch-target"
                      title="حذف ملک"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Valuation & Pricing Details */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">ارزش روز برآورد شده:</span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 dir-ltr">
                      {formatCurrency(currentToman)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">قیمت خرید اولیه:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 dir-ltr">
                      {formatCurrency(purchaseToman)}
                    </span>
                  </div>

                  {pricePerSqm > 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">قیمت هر متر مربع:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 dir-ltr">
                        {formatToman(pricePerSqm)} تومان
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">معادل دلاری (USDT):</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 dir-ltr">
                      $ {new Intl.NumberFormat('en-US').format(valuationUsd)}
                    </span>
                  </div>
                </div>

                {/* Profit/Loss & Details Footer */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div>
                    {gainToman !== 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">سود سرمایه:</span>
                        <span
                          className={`font-black dir-ltr ${
                            gainToman >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {gainToman >= 0 ? '+' : ''}{formatCurrency(gainToman)}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold dir-ltr ${
                            gainToman >= 0
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                          }`}
                        >
                          {gainToman >= 0 ? '+' : ''}{toPersianDigits(gainPercent.toFixed(1))}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">ارزش برابر با قیمت خرید</span>
                    )}
                  </div>

                  {property.purchaseDate && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      <span>{property.purchaseDate}</span>
                    </span>
                  )}
                </div>

                {/* Notes preview if available */}
                {property.notes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800/60 line-clamp-2 leading-relaxed">
                    📝 {property.notes}
                  </p>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-200">
              هنوز ملکی ثبت نشده است
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              با ثبت املاک و مستغلات خود (آپارتمان، زمین، مغازه، دفتر کار)، ارزش روز آن‌ها را به ریال و دلار رصد کرده و در سرجمع دارایی‌های کل لحاظ نمایید.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg inline-flex items-center gap-2 interactive-tap touch-target"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن اولین ملک</span>
          </button>
        </div>
      )}

      {/* Modal Add/Edit */}
      <AddEditPropertyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProperty(null);
        }}
        onSaveProperty={handleSaveModal}
        initialProperty={editingProperty}
        usdtRateTomans={usdtRateTomans}
      />

    </div>
  );
};
