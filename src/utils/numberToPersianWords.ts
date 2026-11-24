/**
 * Converts numbers into natural Persian words (e.g. 15000000 -> پانزده میلیون تومان)
 */

const ONES: string[] = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS: string[] = [
  'ده',
  'یازده',
  'دوازده',
  'سیزده',
  'چهارده',
  'پانزده',
  'شانزده',
  'هفده',
  'هجده',
  'نوزده',
];
const TENS: string[] = [
  '',
  '',
  'بیست',
  'سی',
  'چهل',
  'پنجاه',
  'شصت',
  'هفتاد',
  'هشتاد',
  'نود',
];
const HUNDREDS: string[] = [
  '',
  'یکصد',
  'دویست',
  'سیصد',
  'چهارصد',
  'پانصد',
  'ششصد',
  'هفتصد',
  'هشتصد',
  'نهصد',
];

const SCALES: string[] = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون', 'کوادریلیون', 'کوینتیلیون'];

function convertThreeDigits(num: number): string {
  if (num === 0) return '';

  const parts: string[] = [];

  const hundred = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundred > 0) {
    parts.push(HUNDREDS[hundred]);
  }

  if (remainder >= 10 && remainder <= 19) {
    parts.push(TEENS[remainder - 10]);
  } else {
    const ten = Math.floor(remainder / 10);
    const one = remainder % 10;

    if (ten > 0) {
      parts.push(TENS[ten]);
    }
    if (one > 0) {
      parts.push(ONES[one]);
    }
  }

  return parts.join(' و ');
}

export function numberToPersianWords(value: number, unit: 'تومان' | 'ریال' = 'تومان'): string {
  if (!value || !Number.isFinite(value) || value <= 0) return '';

  const intVal = Math.floor(value);
  if (intVal === 0) return `صفر ${unit}`;

  // Use string chunking / BigInt-safe 3-digit grouping so large figures keep scale accuracy
  const chunks: number[] = [];
  let temp = intVal;
  while (temp > 0) {
    chunks.push(Math.floor(temp % 1000));
    temp = Math.floor(temp / 1000);
  }

  const wordParts: string[] = [];

  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk > 0) {
      const chunkWords = convertThreeDigits(chunk);
      const scale = SCALES[i];
      if (scale) {
        wordParts.push(`${chunkWords} ${scale}`);
      } else {
        wordParts.push(chunkWords);
      }
    }
  }

  if (wordParts.length === 0) return '';
  const result = wordParts.join(' و ');
  return `${result} ${unit}`;
}
