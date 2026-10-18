import { defineConfig } from '@playwright/test'

// e2e runs against the built single file: npm run build:single first.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  workers: 2,
  reporter: 'list',
  use: { browserName: 'chromium' },
})
