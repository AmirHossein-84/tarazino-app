import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatToman,
  formatPercent,
  formatWeight,
  toPersianDigits,
  parseNumberInput,
} from '../../src/utils/formatters.js';

// WCAG 2.1 Luminance and Contrast Ratio helper
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Challenger 1 — Milestone 2 Visual & Edge Case Stress Harness', () => {

  // =========================================================================
  // 1. Stress Testing Portfolio Donut Chart Mathematics
  // =========================================================================
  describe('Donut Chart Arc & Geometry Stress Tests', () => {
    test('STRESS-1: Single Asset (100% Allocation)', () => {
      const size = 220;
      const strokeWidth = 24;
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;

      const singleItem = [{ id: 'gold', label: 'طلا', value: 50000000, color: '#D4AF37' }];
      const totalValue = singleItem[0].value;

      let accumulatedPercent = 0;
      const slices = singleItem.map((item) => {
        const percent = (item.value / totalValue) * 100;
        const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
        const rotation = (accumulatedPercent / 100) * 360;
        accumulatedPercent += percent;
        return { ...item, percent, strokeDasharray, rotation };
      });

      assert.equal(slices.length, 1);
      assert.equal(slices[0].percent, 100);
      assert.equal(slices[0].rotation, 0);
      assert.equal(slices[0].strokeDasharray, `${circumference} ${circumference}`);
    });

    test('STRESS-2: High Density Micro-Allocations (20 Assets @ 5% Each)', () => {
      const size = 220;
      const strokeWidth = 24;
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;

      const items = Array.from({ length: 20 }, (_, i) => ({
        id: `asset_${i + 1}`,
        label: `Coin ${i + 1}`,
        value: 5000000,
        color: `#${(i * 123456).toString(16).padStart(6, '0').substring(0, 6)}`,
      }));

      const totalValue = items.reduce((acc, it) => acc + it.value, 0);
      assert.equal(totalValue, 100000000);

      let accumulatedPercent = 0;
      const slices = items.map((item) => {
        const percent = (item.value / totalValue) * 100;
        const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
        const rotation = (accumulatedPercent / 100) * 360;
        accumulatedPercent += percent;
        return { ...item, percent, strokeDasharray, rotation };
      });

      assert.equal(slices.length, 20);
      slices.forEach((slice, idx) => {
        assert.equal(slice.percent, 5);
        assert.ok(Math.abs(slice.rotation - idx * 18) < 0.001); // 5% of 360 = 18deg each
        assert.ok(!Number.isNaN(slice.rotation));
      });
      assert.ok(Math.abs(accumulatedPercent - 100) < 0.001);
    });

    test('STRESS-3: Extreme Value Formatting (100 Trillion Tomans)', () => {
      const hugeVal = 100000000000000;
      const formatted = formatToman(hugeVal);
      assert.equal(toPersianDigits('100,000,000,000,000'), formatted);
      assert.ok(formatted.length > 0);
    });
  });

  // =========================================================================
  // 2. WCAG AA Contrast Verification for M2 Components
  // =========================================================================
  describe('WCAG AA Visual Contrast Ratio Verification for Milestone 2', () => {
    test('WCAG-1: Light Mode Typography Contrast on White Card (#FFFFFF)', () => {
      const cardBg = '#FFFFFF';

      // Primary Headers (text-slate-900 #0F172A)
      const crPrimary = getContrastRatio(cardBg, '#0F172A');
      assert.ok(crPrimary >= 15.0, `Primary header contrast (${crPrimary.toFixed(2)}) must be >= 15:1 (WCAG AAA >= 7:1)`);

      // Body Text (text-slate-700 #334155)
      const crBody = getContrastRatio(cardBg, '#334155');
      assert.ok(crBody >= 7.0, `Body text contrast (${crBody.toFixed(2)}) must be >= 7:1 (WCAG AAA >= 7:1)`);

      // Muted Subtitles (text-slate-500 #64748B)
      const crMuted = getContrastRatio(cardBg, '#64748B');
      assert.ok(crMuted >= 4.5, `Muted text contrast (${crMuted.toFixed(2)}) must be >= 4.5:1 (WCAG AA >= 4.5:1)`);

      // Amber Gold Accent in Light Mode (text-amber-700 #B45309 or text-amber-800 #92400E)
      const crAmber700 = getContrastRatio(cardBg, '#B45309');
      const crAmber800 = getContrastRatio(cardBg, '#92400E');
      assert.ok(crAmber700 >= 4.5, `Amber-700 contrast (${crAmber700.toFixed(2)}) must be >= 4.5:1 (WCAG AA)`);
      assert.ok(crAmber800 >= 5.5, `Amber-800 contrast (${crAmber800.toFixed(2)}) must be >= 5.5:1 (WCAG AA)`);

      // Emerald Profit Accent in Light Mode (text-emerald-700 #047857)
      const crEmerald700 = getContrastRatio(cardBg, '#047857');
      assert.ok(crEmerald700 >= 4.5, `Emerald-700 contrast (${crEmerald700.toFixed(2)}) must be >= 4.5:1 (WCAG AA)`);

      // Indigo Crypto Accent in Light Mode (text-indigo-600 #4F46E5 or text-indigo-700 #4338CA)
      const crIndigo600 = getContrastRatio(cardBg, '#4F46E5');
      const crIndigo700 = getContrastRatio(cardBg, '#4338CA');
      assert.ok(crIndigo600 >= 4.5, `Indigo-600 contrast (${crIndigo600.toFixed(2)}) must be >= 4.5:1 (WCAG AA)`);
      assert.ok(crIndigo700 >= 6.0, `Indigo-700 contrast (${crIndigo700.toFixed(2)}) must be >= 6.0:1 (WCAG AA)`);

      // Rose Loss Accent in Light Mode (text-rose-700 #BE123C)
      const crRose700 = getContrastRatio(cardBg, '#BE123C');
      assert.ok(crRose700 >= 5.5, `Rose-700 contrast (${crRose700.toFixed(2)}) must be >= 5.5:1 (WCAG AA)`);
    });

    test('WCAG-2: Light Mode Secondary Well Contrast (#F8FAFC & #F1F5F9)', () => {
      const wellBg = '#F8FAFC';
      const appBg = '#F1F5F9';

      [wellBg, appBg].forEach((bg) => {
        const crPrimary = getContrastRatio(bg, '#0F172A');
        const crBody = getContrastRatio(bg, '#334155');
        const crAmber800 = getContrastRatio(bg, '#92400E');
        const crIndigo700 = getContrastRatio(bg, '#4338CA');

        assert.ok(crPrimary >= 13.0, `Primary on ${bg} must be >= 13:1`);
        assert.ok(crBody >= 6.5, `Body on ${bg} must be >= 6.5:1`);
        assert.ok(crAmber800 >= 5.0, `Amber-800 on ${bg} must be >= 5.0:1`);
        assert.ok(crIndigo700 >= 5.5, `Indigo-700 on ${bg} must be >= 5.5:1`);
      });
    });

    test('WCAG-3: Dark Mode Luxury Contrast (#0B0F17 & #131B2A)', () => {
      const darkBg = '#0B0F17';
      const darkCard = '#131B2A';

      [darkBg, darkCard].forEach((bg) => {
        // Light text on dark surface (text-slate-100 #F1F5F9)
        const crPrimary = getContrastRatio(bg, '#F1F5F9');
        assert.ok(crPrimary >= 14.0, `Primary text on ${bg} must be >= 14:1 (WCAG AAA)`);

        // Secondary text on dark surface (text-slate-300 #CBD5E1)
        const crSecondary = getContrastRatio(bg, '#CBD5E1');
        assert.ok(crSecondary >= 10.0, `Secondary text on ${bg} must be >= 10:1 (WCAG AAA)`);

        // Gold text on dark surface (text-gold-400 #FACC15 or gold-300 #FDE047)
        const crGold400 = getContrastRatio(bg, '#FACC15');
        assert.ok(crGold400 >= 10.0, `Gold-400 on ${bg} must be >= 10:1 (WCAG AAA)`);

        // Emerald text on dark surface (text-emerald-400 #34D399)
        const crEmerald400 = getContrastRatio(bg, '#34D399');
        assert.ok(crEmerald400 >= 8.0, `Emerald-400 on ${bg} must be >= 8:1 (WCAG AAA)`);

        // Indigo text on dark surface (text-indigo-400 #818CF8)
        const crIndigo400 = getContrastRatio(bg, '#818CF8');
        assert.ok(crIndigo400 >= 5.0, `Indigo-400 on ${bg} must be >= 5.0:1 (WCAG AA >= 4.5:1)`);
      });
    });
  });

});
