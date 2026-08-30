import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toEnglishDigits,
  toPersianDigits,
  formatToman,
  formatRial,
  formatTomanWithUnit,
  formatPercent,
  formatWeight,
  parseNumberInput,
  getPersianFormattedDate,
} from '../../src/utils/formatters';
import { numberToPersianWords } from '../../src/utils/numberToPersianWords';

describe('Formatters and Number Utilities', () => {
  it('converts Persian and Arabic digits to standard English numbers', () => {
    assert.equal(toEnglishDigits('۱۲۳۴۵۶۷۸۹۰'), '1234567890');
    assert.equal(toEnglishDigits('١٢٣٤٥٦٧٨٩٠'), '1234567890');
    assert.equal(toEnglishDigits('مبلغ: ۱,۵۰۰,۰۰۰ تومان'), 'مبلغ: 1,500,000 تومان');
    assert.equal(toEnglishDigits(null), '');
    assert.equal(toEnglishDigits(undefined), '');
  });

  it('toPersianDigits returns standard English digits format for unified cross-platform display', () => {
    assert.equal(toPersianDigits('12345'), '12345');
    assert.equal(toPersianDigits('۱۲۳'), '123');
  });

  it('formats Tomans and Rials with comma grouping', () => {
    assert.equal(formatToman(1000000), '1,000,000');
    assert.equal(formatToman(0), '0');
    assert.equal(formatToman(null), '0');
    assert.equal(formatToman(undefined), '0');
    assert.equal(formatToman(NaN), '0');
    assert.equal(formatTomanWithUnit(2500000), '2,500,000 تومان');

    assert.equal(formatRial(10000000), '10,000,000');
    assert.equal(formatRial(null), '0');
  });

  it('formats percentage and weights correctly', () => {
    assert.equal(formatPercent(25.5, 1), '25.5%');
    assert.equal(formatPercent(10, 0), '10%');
    assert.equal(formatPercent(null), '0%');

    assert.equal(formatWeight(12.3456), '12.346 گرم');
    assert.equal(formatWeight(0), '0.000 گرم');
    assert.equal(formatWeight(null), '0 گرم');
  });

  it('parses dirty and formatted number inputs safely', () => {
    assert.equal(parseNumberInput('1,500,000'), 1500000);
    assert.equal(parseNumberInput('۱,۵۰۰,۰۰۰'), 1500000);
    assert.equal(parseNumberInput('12.5'), 12.5);
    assert.equal(parseNumberInput('۱۲٫۵'), 12.5);
    assert.equal(parseNumberInput(''), 0);
    assert.equal(parseNumberInput(null), 0);
    assert.equal(parseNumberInput('abc'), 0);
  });

  it('converts numbers to Persian spoken words', () => {
    assert.equal(numberToPersianWords(15000000), 'پانزده میلیون تومان');
    assert.equal(numberToPersianWords(5200000), 'پنج میلیون و دویست هزار تومان');
    assert.equal(numberToPersianWords(1000000000), 'یک میلیارد تومان');
    assert.equal(numberToPersianWords(100000000000, 'تومان'), 'یکصد میلیارد تومان');
    assert.equal(numberToPersianWords(0), '');
    assert.equal(numberToPersianWords(-5), '');
  });

  it('generates valid Persian formatted date', () => {
    const fixedDate = new Date('2026-08-29T12:00:00Z');
    const result = getPersianFormattedDate(fixedDate);
    assert.ok(result.length > 0, 'Persian date should not be empty');
    assert.equal(typeof result, 'string');
  });
});
