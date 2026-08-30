import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Helper function to calculate relative luminance according to WCAG 2.1
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

describe('Challenger 2 — WCAG Contrast & Responsive Geometry Stress Test', () => {

  test('WCAG 1: Light Mode Typography Contrast on White Card (#FFFFFF)', () => {
    const cardBg = '#FFFFFF';
    
    // Primary Text (slate-900 #0F172A)
    const slate900 = '#0F172A';
    const crPrimary = getContrastRatio(cardBg, slate900);
    assert.ok(crPrimary >= 15.0, `Primary text contrast ratio (${crPrimary.toFixed(2)}) must be >= 15:1`);

    // Body Text (slate-700 #334155)
    const slate700 = '#334155';
    const crBody = getContrastRatio(cardBg, slate700);
    assert.ok(crBody >= 7.0, `Body text contrast ratio (${crBody.toFixed(2)}) must be >= 7:1 (WCAG AAA >= 7:1)`);

    // Muted / Subtitle Text (slate-500 #64748B)
    const slate500 = '#64748B';
    const crMuted = getContrastRatio(cardBg, slate500);
    assert.ok(crMuted >= 4.5, `Muted text contrast ratio (${crMuted.toFixed(2)}) must be >= 4.5:1 (WCAG AA)`);

    // Amber Accent (amber-700 #B45309)
    const amber700 = '#B45309';
    const crAmber = getContrastRatio(cardBg, amber700);
    assert.ok(crAmber >= 4.5, `Amber accent contrast ratio (${crAmber.toFixed(2)}) must be >= 4.5:1`);

    // Emerald Accent (emerald-800 #065F46)
    const emerald800 = '#065F46';
    const crEmerald = getContrastRatio(cardBg, emerald800);
    assert.ok(crEmerald >= 6.0, `Emerald accent contrast ratio (${crEmerald.toFixed(2)}) must be >= 6.0:1`);

    // Indigo Accent (indigo-600 #4F46E5)
    const indigo600 = '#4F46E5';
    const crIndigo = getContrastRatio(cardBg, indigo600);
    assert.ok(crIndigo >= 4.5, `Indigo accent contrast ratio (${crIndigo.toFixed(2)}) must be >= 4.5:1`);
  });

  test('WCAG 2: Light Mode Typography Contrast on Soft Slate App Background (#F1F5F9)', () => {
    const appBg = '#F1F5F9';

    // Primary Text (slate-900 #0F172A)
    const crPrimary = getContrastRatio(appBg, '#0F172A');
    assert.ok(crPrimary >= 13.0, `Primary on app bg contrast ratio (${crPrimary.toFixed(2)}) must be >= 13:1`);

    // Body Text (slate-700 #334155)
    const crBody = getContrastRatio(appBg, '#334155');
    assert.ok(crBody >= 6.5, `Body on app bg contrast ratio (${crBody.toFixed(2)}) must be >= 6.5:1`);

    // Muted Subtitle (slate-500 #64748B)
    const crMuted = getContrastRatio(appBg, '#64748B');
    assert.ok(crMuted >= 4.0, `Muted on app bg contrast ratio (${crMuted.toFixed(2)}) must be >= 4.0:1`);
  });

  test('WCAG 3: Dark Mode Typography Contrast on Dark Metallic Background (#0B0F17)', () => {
    const darkBg = '#0B0F17';

    // Primary Text (slate-100 #F1F5F9)
    const slate100 = '#F1F5F9';
    const crPrimary = getContrastRatio(darkBg, slate100);
    assert.ok(crPrimary >= 15.0, `Primary dark text contrast ratio (${crPrimary.toFixed(2)}) must be >= 15:1`);

    // Secondary Text (slate-300 #CBD5E1)
    const slate300 = '#CBD5E1';
    const crSecondary = getContrastRatio(darkBg, slate300);
    assert.ok(crSecondary >= 11.0, `Secondary dark text contrast ratio (${crSecondary.toFixed(2)}) must be >= 11:1`);

    // Muted Text (slate-400 #94A3B8)
    const slate400 = '#94A3B8';
    const crMuted = getContrastRatio(darkBg, slate400);
    assert.ok(crMuted >= 7.0, `Muted dark text contrast ratio (${crMuted.toFixed(2)}) must be >= 7:1`);

    // Gold Accent (gold-300 #FDE047)
    const gold300 = '#FDE047';
    const crGold = getContrastRatio(darkBg, gold300);
    assert.ok(crGold >= 12.0, `Gold accent dark contrast ratio (${crGold.toFixed(2)}) must be >= 12:1`);

    // Emerald Accent (emerald-400 #34D399)
    const emerald400 = '#34D399';
    const crEmerald = getContrastRatio(darkBg, emerald400);
    assert.ok(crEmerald >= 9.0, `Emerald accent dark contrast ratio (${crEmerald.toFixed(2)}) must be >= 9:1`);
  });

  test('RG 1: Bottom Navigation Bar 7 Tabs Geometry on Mobile Viewports', () => {
    const viewports = [
      { name: 'iPhone SE / Mini', width: 375 },
      { name: 'iPhone 13/14/15/16 Pro', width: 390 },
      { name: 'iPhone Pro Max / Pixel', width: 428 },
      { name: 'iPad Mini / Tablet', width: 768 },
    ];

    viewports.forEach((vp) => {
      const outerPadding = 16; // px-2 (8px on each side)
      const navPadding = 12; // p-1.5 (6px on each side)
      const availableWidth = Math.min(vp.width, 512) - outerPadding - navPadding; // max-w-lg is 512px
      const tabWidth = availableWidth / 7;

      assert.ok(
        tabWidth >= 40,
        `Tab width (${tabWidth.toFixed(1)}px) on ${vp.name} (${vp.width}px) must be >= 40px for comfortable tap`
      );
    });
  });

  test('RG 2: Header Action Buttons Geometry on Mobile Viewports', () => {
    const viewports = [375, 390, 414, 768];

    viewports.forEach((w) => {
      // Header layout: max-w-2xl, px-4 (32px padding)
      const availableWidth = Math.min(w, 672) - 32;
      
      // Brand logo (40px) + gap (12px) + Title text (~140px) = ~192px
      const brandWidth = 192;
      // Action buttons: Currency (~80px) + Theme toggle (40px) + gap (8px) = ~128px
      const actionsWidth = 128;
      const totalContentWidth = brandWidth + actionsWidth;

      assert.ok(
        availableWidth >= totalContentWidth,
        `Header content (${totalContentWidth}px) must fit within available width (${availableWidth}px) for viewport ${w}px without wrapping or overflow`
      );
    });
  });
});
