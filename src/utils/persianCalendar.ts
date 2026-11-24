import { getTodayPersianDate, gregorianToPersianDate, toEnglishDigits } from './formatters';

export const PERSIAN_MONTHS = [
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
] as const;

export const PERSIAN_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

export interface ParsedPersianDate {
  year: number;
  month: number;
  day: number;
}

export function isJalaliLeapYear(jy: number): boolean {
  return ((((((jy - (jy > 0 ? 474 : 473)) % 2820) + 474) + 38) * 682) % 2816) < 682;
}

export function getDaysInJalaliMonth(year: number, month: number): number {
  if (month >= 1 && month <= 6) return 31;
  if (month >= 7 && month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = jy <= 979 ? 621 : 1600;
  let jyNorm = jy - (jy <= 979 ? 0 : 979);
  let days =
    365 * jyNorm +
    Math.floor(jyNorm / 33) * 8 +
    Math.floor(((jyNorm % 33) + 3) / 4) +
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
  const salA = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = salA[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

export function getFirstDayWeekday(year: number, month: number): number {
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

export function parsePersianDateString(dateStr?: string): ParsedPersianDate {
  const todayStr = toEnglishDigits(getTodayPersianDate());
  const todayParts = todayStr.split('/').map((p) => parseInt(p, 10));
  const fallback: ParsedPersianDate = {
    year: todayParts[0] || 1404,
    month: todayParts[1] || 1,
    day: todayParts[2] || 1,
  };

  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    return fallback;
  }

  let normalized = toEnglishDigits(dateStr).trim().replace(/-/g, '/');
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(normalized) && parseInt(normalized.split('/')[0], 10) > 1600) {
    const converted = gregorianToPersianDate(dateStr);
    if (converted && converted.includes('/')) {
      normalized = toEnglishDigits(converted).trim();
    }
  }
  const parts = normalized.split('/').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return fallback;
  }

  const [y, m, d] = parts;
  if (y < 1250 || y > 1550 || m < 1 || m > 12) {
    return fallback;
  }

  const maxDay = getDaysInJalaliMonth(y, m);
  return {
    year: y,
    month: m,
    day: Math.min(Math.max(1, d), maxDay),
  };
}

export function formatPersianDateParts(year: number, month: number, day: number): string {
  const yStr = String(year);
  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  return `${yStr}/${mStr}/${dStr}`;
}
