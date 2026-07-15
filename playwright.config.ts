import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    {
      command: 'pnpm --filter @gridstage/web dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @gridstage/collab-server start',
      url: 'http://127.0.0.1:1234',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { HOST: '127.0.0.1', PORT: '1234' },
    },
  ],
});
