import React, { useState, useMemo } from 'react';
import {
  Car,
  Bike,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Gauge,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { VehicleItem, VehicleType } from '../../types/investment';
import { CurrencyDisplayMode } from '../../hooks/useCurrencyDisplay';
import { formatToman, toPersianDigits } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { AddEditVehicleModal } from './AddEditVehicleModal';

interface VehicleManagerViewProps {
  vehicles: VehicleItem[];
  currencyMode?: CurrencyDisplayMode;
  usdtRateTomans?: number;
  formatCurrency: (amountTomans: number) => string;
  toDisplayValue: (amountTomans: number) => number;
  onAddVehicle: (vehicle: Omit<VehicleItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditVehicle: (id: string, vehicle: Partial<VehicleItem>) => void;
  onRemoveVehicle: (id: string) => void;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const VehicleManagerView: React.FC<VehicleManagerViewProps> = ({
  vehicles,
  currencyMode = 'toman',
  usdtRateTomans = 93000,
  formatCurrency,
  toDisplayValue,
  onAddVehicle,
  onEditVehicle,
  onRemoveVehicle,
  onNotify,
}) => {
  const [filterType, setFilterType] = useState<'all' | VehicleType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    if (filterType === 'all') return vehicles;
    return vehicles.filter((v) => v.vehicleType === filterType);
  }, [vehicles, filterType]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalValuation = 0;
    let totalPurchaseCost = 0;
    let netWorthValuation = 0;

    vehicles.forEach((v) => {
      totalValuation += v.currentValuationTomans || 0;
      totalPurchaseCost += v.purchasePriceTomans || 0;
      if (v.includeInTotalNetWorth !== false) {
        netWorthValuation += v.currentValuationTomans || 0;
      }
    });

    const totalGain = totalValuation - totalPurchaseCost;
    const totalGainPercent = totalPurchaseCost > 0 ? (totalGain / totalPurchaseCost) * 100 : 0;

    return {
      totalValuation,
      totalPurchaseCost,
      netWorthValuation,
      totalGain,
      totalGainPercent,
      count: vehicles.length,
      carsCount: vehicles.filter((v) => v.vehicleType === 'car').length,
      bikesCount: vehicles.filter((v) => v.vehicleType === 'motorcycle').length,
    };
  }, [vehicles]);

  const handleOpenAdd = () => {
    triggerHaptic('light');
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vehicle: VehicleItem) => {
    triggerHaptic('light');
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    triggerHaptic('medium');
    if (window.confirm(`آیا از حذف وسیله نقلیه «${title}» مطمئن هستید؟`)) {
      onRemoveVehicle(id);
      onNotify?.(`«${title}» با موفقیت حذف شد`, 'info');
    }
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Header Aggregate Overview Banner */}
      <div className="glass-card p-4 sm:p-5 relative overflow-hidden">
        <div className="absolute -left-8 -top-8 w-36 h-36 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 dark:bg-blue-500/25 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                وسایل نقلیه و خودروها
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {toPersianDigits(stats.count)} وسیله نقلیه ثبت‌شده ({toPersianDigits(stats.carsCount)} خودرو • {toPersianDigits(stats.bikesCount)} موتور)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="self-start sm:self-auto py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 interactive-tap touch-target"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت وسیله جدید</span>
          </button>
        </div>

        {/* Aggregate Stats Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3">
          {/* Total Valuation */}
          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
              ارزش روز کل خودروها
            </span>
            <span className="text-xs sm:text-sm font-black text-blue-700 dark:text-blue-400 block">
              {formatCurrency(stats.totalValuation)}
            </span>
          </div>

          {/* Total Purchase Cost */}
          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
              مجموع بهای خرید
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block">
              {formatCurrency(stats.totalPurchaseCost)}
            </span>
          </div>

          {/* Total Capital Gain / Profit */}
          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/80 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
              سود / تغییر ارزش روز
            </span>
            <div className="flex items-center gap-1.5 dir-rtl">
              <span
                className={`text-xs sm:text-sm font-black ${
                  stats.totalGain >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {stats.totalGain >= 0 ? '+' : ''}
                {formatCurrency(stats.totalGain)}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${
                  stats.totalGain >= 0
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                }`}
              >
                {stats.totalGain >= 0 ? '+' : ''}
                {toPersianDigits(stats.totalGainPercent.toFixed(1))}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter Selector Chips */}
      {vehicles.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setFilterType('all');
            }}
            className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition-all interactive-tap touch-target ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            همه وسایل ({toPersianDigits(vehicles.length)})
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setFilterType('car');
            }}
            className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 interactive-tap touch-target ${
              filterType === 'car'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>خودروها ({toPersianDigits(stats.carsCount)})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setFilterType('motorcycle');
            }}
            className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 interactive-tap touch-target ${
              filterType === 'motorcycle'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>موتورسیکلت‌ها ({toPersianDigits(stats.bikesCount)})</span>
          </button>
        </div>
      )}

      {/* 3. Empty State */}
      {filteredVehicles.length === 0 && (
        <div className="glass-card p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <Car className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              هنوز هیچ وسیله نقلیه‌ای ثبت نشده است
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              می‌توانید اطلاعات خودرو یا موتورسیکلت‌های خود، سال ساخت، کیلومتر کارکرد، قیمت خرید و ارزش روز را ثبت کنید تا در کل دارایی محاسبه شوند.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="py-2.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all shadow-md inline-flex items-center gap-1.5 interactive-tap touch-target"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت اولین وسیله نقلیه</span>
          </button>
        </div>
      )}

      {/* 4. Vehicles Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredVehicles.map((vehicle) => {
          const gain = (vehicle.currentValuationTomans || 0) - (vehicle.purchasePriceTomans || 0);
          const gainPercent =
            (vehicle.purchasePriceTomans || 0) > 0
              ? (gain / vehicle.purchasePriceTomans) * 100
              : 0;

          const isCar = vehicle.vehicleType === 'car';
          const isBike = vehicle.vehicleType === 'motorcycle';

          return (
            <div
              key={vehicle.id}
              className="glass-card p-4 space-y-3 relative overflow-hidden transition-colors border-slate-200/90 dark:border-slate-800/90 hover:border-blue-300 dark:hover:border-blue-600/50"
            >
              {/* Header: Title & Badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isCar
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        : isBike
                        ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                        : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                    }`}
                  >
                    {isCar ? (
                      <Car className="w-5 h-5" />
                    ) : isBike ? (
                      <Bike className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {vehicle.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {vehicle.model && <span>{vehicle.model}</span>}
                      {vehicle.year && (
                        <span>• مدل {toPersianDigits(vehicle.year)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(vehicle)}
                    className="p-2 rounded-xl text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-target"
                    title="ویرایش اطلاعات"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(vehicle.id, vehicle.title)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors touch-target"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Specs & Mileage */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                {vehicle.mileageKm !== undefined && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Gauge className="w-3 h-3 text-blue-500" />
                    <span>{toPersianDigits(new Intl.NumberFormat('fa-IR').format(vehicle.mileageKm))} کیلومتر</span>
                  </div>
                )}
                {vehicle.purchaseDate && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>خرید: {toPersianDigits(vehicle.purchaseDate)}</span>
                  </div>
                )}
                {vehicle.includeInTotalNetWorth && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    <span>محاسبه در ثروت خالص</span>
                  </div>
                )}
              </div>

              {/* Price & Current Valuation Card */}
              <div className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">ارزش روز برآورد شده:</span>
                  <span className="font-black text-blue-700 dark:text-blue-400 text-sm">
                    {formatCurrency(vehicle.currentValuationTomans)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">قیمت خرید پرداخت‌شده:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(vehicle.purchasePriceTomans)}
                  </span>
                </div>

                {vehicle.purchasePriceTomans > 0 && gain !== 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800/80">
                    <span className="text-slate-500 dark:text-slate-400">میزان رشد / سود سرمایه:</span>
                    <div className="flex items-center gap-1.5 dir-rtl">
                      <span
                        className={`font-black ${
                          gain >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {gain >= 0 ? '+' : ''}{formatCurrency(gain)}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          gain >= 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                        }`}
                      >
                        {gain >= 0 ? '+' : ''}{toPersianDigits(gainPercent.toFixed(1))}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {vehicle.notes && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60 line-clamp-2">
                  {vehicle.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      <AddEditVehicleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveVehicle={(vehData, id) => {
          if (id) {
            onEditVehicle(id, vehData);
            onNotify?.('تغییرات وسیله نقلیه با موفقیت ذخیره شد', 'success');
          } else {
            onAddVehicle(vehData);
            onNotify?.('وسیله نقلیه جدید اضافه شد', 'success');
          }
        }}
        initialVehicle={editingVehicle}
        usdtRateTomans={usdtRateTomans}
      />
    </div>
  );
};
