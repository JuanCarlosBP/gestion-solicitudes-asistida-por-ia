import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  ...(process.env['E2E_DEMO'] === '1'
    ? { testMatch: 'demo*.spec.ts' }
    : { testIgnore: 'demo*.spec.ts' }),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: process.env['E2E_RESULTS_DIR'] ?? 'test-results',
  reporter: [
    ['list'],
    ['junit', { outputFile: `${process.env['E2E_RESULTS_DIR'] ?? 'test-results'}/e2e.xml` }],
  ],
  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://127.0.0.1:18080',
    browserName: 'chromium',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
});
