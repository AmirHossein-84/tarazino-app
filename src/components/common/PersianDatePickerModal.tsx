import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Check } from 'lucide-react';
import { BottomSheetModal } from './BottomSheetModal';
import { toPersianDigits, toEnglishDigits, getTodayPersianDate } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';

interface PersianDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string; // e.g. "1403/06/09"
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

// Get Persian weekday index: 0 for Saturday (شنبه), 6 for Friday (جمعه)
function getFirstDayWeekday(year: number, month: number): number {
  const [gy, gm, gd] = jalaliToGregorian(year, month, 1);
  const d = new Date(gy, gm - 1, gd);
  return (d.getDay() + 1) % 7;
}

function parsePersianDateString(dateStr?: string): { year: number; month: number; day: number } {
  const todayStr = getTodayPersianDate();
  const raw = toEnglishDigits(dateStr || todayStr).replace(/[-.]/g, '/');
  const parts = raw.split('/').map((p) => parseInt(p, 10));

  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return {
      year: parts[0],
      month: Math.min(12, Math.max(1, parts[1])),
      day: Math.min(31, Math.max(1, parts[2])),
    };
  }

  const todayParts = todayStr.split('/').map((p) => parseInt(p, 10));
  return {
    year: todayParts[0] || 1403,
    month: todayParts[1] || 1,
    day: todayParts[2] || 1,
  };
}

export const PersianDatePickerModal: React.FC<PersianDatePickerModalProps> = ({
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
  const daysInMonth = getDaysInJalaliMonth(viewYear, viewMonth);
  const startWeekday = getFirstDayWeekday(viewYear, viewMonth);

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
    triggerHaptic('light');
    setActiveDay(day);
  };

  const handleConfirm = () => {
    triggerHaptic('medium');
    const yStr = String(viewYear);
    const mStr = String(viewMonth).padStart(2, '0');
    const dStr = String(activeDay).padStart(2, '0');
    onSelectDate(`${yStr}/${mStr}/${dStr}`);
    onClose();
  };

  const handleQuickSelect = (type: 'today' | 'yesterday' | 'month_ago' | 'year_ago') => {
    triggerHaptic('light');
    if (type === 'today') {
      setViewYear(today.year);
      setViewMonth(today.month);
      setActiveDay(today.day);
    } else if (type === 'yesterday') {
      let d = today.day - 1;
      let m = today.month;
      let y = today.year;
      if (d < 1) {
        m -= 1;
        if (m < 1) {
          y -= 1;
          m = 12;
        }
        d = getDaysInJalaliMonth(y, m);
      }
      setViewYear(y);
      setViewMonth(m);
      setActiveDay(d);
    } else if (type === 'month_ago') {
      let m = today.month - 1;
      let y = today.year;
      if (m < 1) {
        y -= 1;
        m = 12;
      }
      const maxDays = getDaysInJalaliMonth(y, m);
      setViewYear(y);
      setViewMonth(m);
      setActiveDay(Math.min(today.day, maxDays));
    } else if (type === 'year_ago') {
      const y = today.year - 1;
      const maxDays = getDaysInJalaliMonth(y, today.month);
      setViewYear(y);
      setViewMonth(today.month);
      setActiveDay(Math.min(today.day, maxDays));
    }
  };

  const yearsRange = useMemo(() => {
    const list: number[] = [];
    const currentYear = today.year;
    for (let y = currentYear + 2; y >= currentYear - 35; y--) {
      list.push(y);
    }
    return list;
  }, [today.year]);

  const formattedCurrentSelection = `${viewYear}/${String(viewMonth).padStart(2, '0')}/${String(activeDay).padStart(2, '0')}`;

  const footer = (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onClose}
        className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors interactive-tap touch-target border border-slate-200 dark:border-slate-700"
      >
        انصراف
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 hover:from-amber-400 hover:to-gold-400 text-slate-950 font-black text-xs transition-all shadow-gold-glow flex items-center justify-center gap-1.5 interactive-tap touch-target"
      >
        <Check className="w-4 h-4" />
        <span>تأیید تاریخ ({toPersianDigits(formattedCurrentSelection)})</span>
      </button>
    </div>
  );

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={`تاریخ انتخابی: ${toPersianDigits(formattedCurrentSelection)}`}
      icon={<CalendarIcon className="w-5 h-5 text-amber-500" />}
      footer={footer}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 select-none">
        
        {/* Quick Shortcuts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => handleQuickSelect('today')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold shrink-0 transition-colors"
          >
            امروز
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('yesterday')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold shrink-0 transition-colors"
          >
            دیروز
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('month_ago')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold shrink-0 transition-colors"
          >
            یک ماه قبل
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('year_ago')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold shrink-0 transition-colors"
          >
            یک سال قبل
          </button>
        </div>

        {/* Month & Year Header Navigation */}
        <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors interactive-tap touch-target"
            aria-label="ماه قبل"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-slate-900 dark:text-slate-100">
              {PERSIAN_MONTHS[viewMonth - 1]}
            </span>
            <button
              type="button"
              onClick={() => setShowYearPicker((prev) => !prev)}
              className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-gold-300 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-black transition-colors"
            >
              {toPersianDigits(viewYear)} {showYearPicker ? '▲' : '▼'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors interactive-tap touch-target"
            aria-label="ماه بعد"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Year Selector Grid (when open) */}
        {showYearPicker ? (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-56 overflow-y-auto grid grid-cols-4 gap-2">
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
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
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
          /* Calendar Days Grid */
          <div className="space-y-2">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAY_NAMES.map((name) => (
                <div
                  key={name}
                  className="py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500"
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty leading slots */}
              {Array.from({ length: startWeekday }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}

              {/* Day cells */}
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
                    className={`h-10 rounded-2xl text-xs font-bold flex items-center justify-center transition-all interactive-tap touch-target ${
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
    </BottomSheetModal>
  );
};
