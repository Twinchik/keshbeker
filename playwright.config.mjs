import { defineConfig } from '@playwright/test';

const port = process.env.KESHBEKER_E2E_PORT ?? '4174';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/playwright',
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    channel: process.env.KESHBEKER_BROWSER_CHANNEL,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: baseURL,
    env: { KESHBEKER_PORT: port },
    reuseExistingServer: false,
  },
});
