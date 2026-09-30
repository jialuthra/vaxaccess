import { defineConfig, devices } from '@playwright/test';

// Browser acceptance tests (DESIGN.md §4.13). They run against the production build served
// by `vite preview`, which, like Amplify, answers deep links with index.html. The full suite
// runs in Chromium; Firefox and WebKit run the tests tagged @smoke.
const PORT = 4173;

export default defineConfig({
  testDir: 'tests/acceptance',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Only the CI `unit` job publishes JUnit to the pipeline test report; acceptance results
  // stay in their own HTML report artifact (DESIGN.md §4.9).
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@smoke/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grep: /@smoke/ },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
