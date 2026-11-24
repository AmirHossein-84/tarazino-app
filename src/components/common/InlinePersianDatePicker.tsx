import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { toPersianDigits, toEnglishDigits, getTodayPersianDate } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import {
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS as WEEKDAY_NAMES,
  getDaysInJalaliMonth,
  getFirstDayWeekday,
  parsePersianDateString,
} from '../../utils/persianCalendar';

export interface InlinePersianDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
  onSelectDate: (persianDate: string) => void;
  title?: string;
  mode?: 'purchase' | 'birthDate';
  minYear?: number;
  maxYear?: number;
}

export const InlinePersianDatePicker: React.FC<InlinePersianDatePickerProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  title = 'انتخاب تاریخ شمسی',
  mode = 'purchase',
  minYear,
  maxYear,
}) => {
  const parsed = useMemo(() => parsePersianDateString(selectedDate), [selectedDate, isOpen]);

  const [viewYear, setViewYear] = useState<number>(parsed.year);
  const [viewMonth, setViewMonth] = useState<number>(parsed.month);
  const [activeDay, setActiveDay] = useState<number>(parsed.day);
  const [showYearPicker, setShowYearPicker] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const p = parsePersianDateString(selectedDate);
      setViewYear(p.year);
      setViewMonth(p.month);
      setActiveDay(p.day);
      setShowYearPicker(false);
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const today = parsePersianDateString(getTodayPersianDate());
  const daysInMonth = Math.max(1, Math.min(31, getDaysInJalaliMonth(viewYear, viewMonth) || 30));
  const rawStartWeekday = getFirstDayWeekday(viewYear, viewMonth);
  const startWeekday = Math.max(0, Math.min(6, isNaN(rawStartWeekday) ? 0 : rawStartWeekday));

  const handlePrevMonth = () => {
    triggerHaptic('light');
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    triggerHaptic('light');
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    triggerHaptic('medium');
    setActiveDay(day);
    const yStr = String(viewYear);
    const mStr = String(viewMonth).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    onSelectDate(`${yStr}/${mStr}/${dStr}`);
    onClose();
  };

  const handleQuickSelect = (type: 'today' | 'yesterday' | 'month_ago' | 'year_ago') => {
    triggerHaptic('light');
    let targetY = today.year;
    let targetM = today.month;
    let targetD = today.day;

    if (type === 'today') {
      // today is set
    } else if (type === 'yesterday') {
      targetD -= 1;
      if (targetD < 1) {
        targetM -= 1;
        if (targetM < 1) {
          targetY -= 1;
          targetM = 12;
        }
        targetD = getDaysInJalaliMonth(targetY, targetM);
      }
    } else if (type === 'month_ago') {
      targetM -= 1;
      if (targetM < 1) {
        targetY -= 1;
        targetM = 12;
      }
      const maxDays = getDaysInJalaliMonth(targetY, targetM);
      targetD = Math.min(today.day, maxDays);
    } else if (type === 'year_ago') {
      targetY -= 1;
      const maxDays = getDaysInJalaliMonth(targetY, today.month);
      targetD = Math.min(today.day, maxDays);
    }

    setViewYear(targetY);
    setViewMonth(targetM);
    setActiveDay(targetD);

    const yStr = String(targetY);
    const mStr = String(targetM).padStart(2, '0');
    const dStr = String(targetD).padStart(2, '0');
    onSelectDate(`${yStr}/${mStr}/${dStr}`);
    onClose();
  };

  const yearsRange = useMemo(() => {
    const list: number[] = [];
    const currentYear = today.year || 1404;
    const startYear = maxYear || (mode === 'birthDate' ? currentYear : currentYear + 2);
    const endYear = minYear || (mode === 'birthDate' ? 1310 : currentYear - 35);
    for (let y = startYear; y >= endYear; y--) {
      list.push(y);
    }
    return list;
  }, [today.year, mode, minYear, maxYear]);

  return (
    <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 animate-fadeIn select-none">
      
      {/* Header with Title & Close Button */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-black text-slate-800 dark:text-slate-200">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="بستن تقویم"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Shortcuts (Only in purchase mode) */}
      {mode !== 'birthDate' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => handleQuickSelect('today')}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold shrink-0 transition-colors"
          >
            امروز
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('yesterday')}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold shrink-0 transition-colors"
          >
            دیروز
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('month_ago')}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold shrink-0 transition-colors"
          >
            یک ماه قبل
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('year_ago')}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold shrink-0 transition-colors"
          >
            یک سال قبل
          </button>
        </div>
      )}

      {/* Month & Year Navigation */}
      <div className="flex items-center justify-between p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
          aria-label="ماه قبل"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-black text-xs text-slate-900 dark:text-slate-100">
            {PERSIAN_MONTHS[Math.max(0, Math.min(11, viewMonth - 1))]}
          </span>
          <button
            type="button"
            onClick={() => setShowYearPicker((prev) => !prev)}
            className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-gold-300 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-black transition-colors"
          >
            {toPersianDigits(viewYear)} {showYearPicker ? '▲' : '▼'}
          </button>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
          aria-label="ماه بعد"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Year Picker or Days Grid */}
      {showYearPicker ? (
        <div className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-56 overflow-y-auto grid grid-cols-4 gap-1.5">
          {yearsRange.map((y) => {
            const isSelected = y === viewYear;
            return (
              <button
                key={y}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setViewYear(y);
                  setShowYearPicker(false);
                }}
                className={`py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {toPersianDigits(y)}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_NAMES.map((name) => (
              <div key={name} className="py-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {name}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                day === activeDay &&
                viewMonth === parsed.month &&
                viewYear === parsed.year;
              const isToday =
                day === today.day &&
                viewMonth === today.month &&
                viewYear === today.year;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all interactive-tap ${
                    isSelected
                      ? 'bg-gradient-to-br from-amber-500 to-gold-500 text-slate-950 font-black shadow-gold-glow scale-105 z-10'
                      : isToday
                      ? 'bg-amber-500/20 text-amber-700 dark:text-gold-300 border border-amber-500/50 hover:bg-amber-500/30 font-black'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
