import { run } from 'node:test';
import { spec as SpecReporter } from 'node:test/reporters';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
  // Unit & Calculations Tests
  path.join(__dirname, 'unit/calculations.test.ts'),
  path.join(__dirname, 'unit/sellCalculator.test.ts'),
  path.join(__dirname, 'unit/goldPnlCalculators.test.ts'),
  path.join(__dirname, 'unit/formatters.test.ts'),
  path.join(__dirname, 'unit/storage.test.ts'),
  path.join(__dirname, 'unit/tsetmcMarketData.test.ts'),

  // 4-Tier Verification Suites
  path.join(__dirname, 'verification/tier1_features_visual_tokens.test.ts'),
  path.join(__dirname, 'verification/tier2_boundary_corner_cases.test.ts'),
  path.join(__dirname, 'verification/tier3_cross_feature_combinations.test.ts'),
  path.join(__dirname, 'verification/tier4_real_world_scenarios.test.ts'),

  // Theme & WCAG Adversarial / Responsive Verification Suites
  path.join(__dirname, 'verification/m1_theme_adversarial.test.ts'),
  path.join(__dirname, 'verification/challenger_m1_empirical.test.ts'),
  path.join(__dirname, 'verification/challenger_2_m1_deep_stress.test.ts'),
  path.join(__dirname, 'verification/challenger_m1_wcag_and_responsive.test.ts'),
  path.join(__dirname, 'verification/challenger_m2_empirical_calculations.test.ts'),
  path.join(__dirname, 'verification/challenger_m2_empirical.test.ts'),
  path.join(__dirname, 'verification/challenger_m2_visual_stress.test.ts'),
  path.join(__dirname, 'verification/challenger_2_gen2_empirical_stress.test.ts'),
  path.join(__dirname, 'verification/challenger_1_gen2_deep_empirical.test.ts'),
];

console.log('===============================================================');
console.log('  INVESTMENT PORTFOLIO APP - 4-TIER VERIFICATION TEST RUNNER  ');
console.log('===============================================================');
console.log(`Found ${testFiles.length} test suite files.`);

const stream = run({
  files: testFiles,
  concurrency: 1,
});

stream.compose(new SpecReporter()).pipe(process.stdout);

let hasFailed = false;

stream.on('test:fail', () => {
  hasFailed = true;
});

stream.on('end', () => {
  console.log('\n===============================================================');
  if (hasFailed) {
    console.error('❌ TEST SUITE FAILED - Check errors above.');
    process.exit(1);
  } else {
    console.log('✅ ALL TEST SUITES PASSED SUCCESSFULLY (100% PASS RATE)');
    console.log('===============================================================');
    process.exit(0);
  }
});
