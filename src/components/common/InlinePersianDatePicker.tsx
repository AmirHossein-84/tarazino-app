import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { toPersianDigits, toEnglishDigits, getTodayPersianDate, gregorianToPersianDate } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';

interface InlinePersianDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
  onSelectDate: (persianDate: string) => void;
  title?: string;
}

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const WEEKDAY_NAMES = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function isJalaliLeapYear(jy: number): boolean {
  return ((((((jy - (jy > 0 ? 474 : 473)) % 2820) + 474) + 38) * 682) % 2816) < 682;
}

function getDaysInJalaliMonth(year: number, month: number): number {
  if (month >= 1 && month <= 6) return 31;
  if (month >= 7 && month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  gy += Math.floor((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  let gd = days + 1;
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

function getFirstDayWeekday(year: number, month: number): number {
  try {
    const [gy, gm, gd] = jalaliToGregorian(year, month, 1);
    const d = new Date(gy, gm - 1, gd);
    const day = d.getDay();
    if (isNaN(day)) return 0;
    return (day + 1) % 7;
  } catch {
    return 0;
  }
}

function parsePersianDateString(dateStr?: string): { year: number; month: number; day: number } {
  const todayStr = getTodayPersianDate();
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    const todayParts = todayStr.split('/').map((p) => parseInt(p, 10));
    return {
      year: todayParts[0] || 1403,
      month: todayParts[1] || 1,
      day: todayParts[2] || 1,
    };
  }

  try {
    let cleanStr = toEnglishDigits(dateStr.trim()).replace(/[-.]/g, '/');
    const rawParts = cleanStr.split('/').map((p) => parseInt(p, 10));

    // Convert Gregorian (e.g. 2026-09-02) to Jalali
    if (rawParts.length === 3 && rawParts[0] > 1600) {
      const converted = gregorianToPersianDate(dateStr);
      if (converted && converted.includes('/')) {
        cleanStr = converted;
      }
    }

    const parts = cleanStr.split('/').map((p) => parseInt(p, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const safeYear = parts[0] >= 1300 && parts[0] <= 1500 ? parts[0] : 1403;
      const safeMonth = Math.min(12, Math.max(1, parts[1]));
      const safeDay = Math.min(31, Math.max(1, parts[2]));
      return {
        year: safeYear,
        month: safeMonth,
        day: safeDay,
      };
    }
  } catch (e) {
    console.warn('Failed to parse date string:', e);
  }

  const todayParts = todayStr.split('/').map((p) => parseInt(p, 10));
  return {
    year: todayParts[0] || 1403,
    month: todayParts[1] || 1,
    day: todayParts[2] || 1,
  };
}

export const InlinePersianDatePicker: React.FC<InlinePersianDatePickerProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  title = 'انتخاب تاریخ شمسی',
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
    const currentYear = today.year || 1403;
    for (let y = currentYear + 2; y >= currentYear - 35; y--) {
      list.push(y);
    }
    return list;
  }, [today.year]);

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

      {/* Quick Shortcuts */}
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
        <div className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-44 overflow-y-auto grid grid-cols-4 gap-1.5">
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
