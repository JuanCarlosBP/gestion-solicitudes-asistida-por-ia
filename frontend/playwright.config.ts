import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['junit', { outputFile: 'test-results/e2e.xml' }]],
  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://127.0.0.1:18080',
    browserName: 'chromium',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
});
