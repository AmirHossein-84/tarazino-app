// Standard English digits converter and formatters

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export const toEnglishDigits = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined) return '';
  return String(n).replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
};

// Returns standard digits across the entire application
export const toPersianDigits = (n: number | string | null | undefined): string => {
  return toEnglishDigits(n);
};

export const formatToman = (amount: number | null | undefined, _usePersianDigits = false): string => {
  if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
    return '0';
  }
  const rounded = Math.round(amount);
  return new Intl.NumberFormat('en-US').format(rounded);
};

export const formatRial = (amountRials: number | null | undefined): string => {
  if (amountRials === null || amountRials === undefined || isNaN(amountRials) || !isFinite(amountRials)) {
    return '0';
  }
  const rounded = Math.round(amountRials);
  return new Intl.NumberFormat('en-US').format(rounded);
};

export const formatTomanWithUnit = (amount: number | null | undefined): string => {
  return `${formatToman(amount)} تومان`;
};

export const formatPercent = (percent: number | null | undefined, decimals = 0): string => {
  if (percent === null || percent === undefined || isNaN(percent) || !isFinite(percent)) {
    return '0%';
  }
  const formatted = percent.toFixed(decimals);
  return `${formatted}%`;
};

export const formatWeight = (grams: number | null | undefined): string => {
  if (grams === null || grams === undefined || isNaN(grams) || !isFinite(grams)) {
    return '0 گرم';
  }
  const formatted = grams >= 1 ? grams.toFixed(2) : grams.toFixed(3);
  return `${formatted} گرم`;
};

export const parseNumberInput = (value: string | null | undefined): number => {
  if (!value) return 0;
  // Remove commas, spaces and convert persian digits to standard english
  let cleaned = String(value).replace(/[\s,،]/g, '');
  cleaned = cleaned.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
};

export const getPersianFormattedDate = (date: Date = new Date()): string => {
  try {
    const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
    const formatted = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(validDate);
    return toEnglishDigits(formatted);
  } catch {
    return (date instanceof Date ? date : new Date()).toLocaleDateString();
  }
};
